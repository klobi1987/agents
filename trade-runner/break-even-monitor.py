"""
🎯 n8n BREAK EVEN MONITOR
═══════════════════════════════════════════════════════════════

Automatski pomjera Stop Loss na entry price kada se TP1 izvrši.

Usage:
1. Dodaj Schedule Trigger (30 seconds)
2. Dodaj ovaj Python Code node
3. (Optional) Dodaj notification za success

Svaki put kada se TP1 order fill-uje, SL se automatski pomjera
na entry price → RISK-FREE pozicija! 🚀

═══════════════════════════════════════════════════════════════
"""

import hashlib
import hmac
import time
import json
import requests
from typing import Dict, List, Optional

# ═══════════════════════════════════════════════════════════════
# KONFIGURACIJA
# ═══════════════════════════════════════════════════════════════

BYBIT_API_URL = "https://api.bybit.com"
RECV_WINDOW = 5000

# Break even offset (0 = exact entry, 0.005 = +0.5% above entry)
BREAK_EVEN_OFFSET = 0.000  # Set to 0.005 for +0.5% buffer

# Tolerance for checking if SL is already at break even (0.01%)
TOLERANCE_PCT = 0.0001

# ═══════════════════════════════════════════════════════════════
# BYBIT API HELPERS
# ═══════════════════════════════════════════════════════════════

def generate_signature(api_secret: str, timestamp: int, recv_window: int, param_str: str) -> str:
    """Generate HMAC SHA256 signature"""
    signature = hmac.new(
        api_secret.encode('utf-8'),
        param_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature


def bybit_request(
    api_key: str,
    api_secret: str,
    method: str,
    endpoint: str,
    params: Optional[Dict] = None,
    body: Optional[Dict] = None
) -> Dict:
    """Make authenticated request to Bybit V5 API"""
    timestamp = int(time.time() * 1000)
    url = BYBIT_API_URL + endpoint

    if method == "GET":
        query_string = "&".join([f"{k}={v}" for k, v in (params or {}).items()])
        param_str = str(timestamp) + str(RECV_WINDOW) + query_string
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, param_str)
        url += f"?{query_string}" if query_string else ""
        request_body = None
    else:  # POST
        body_json = json.dumps(body or {})
        param_str = str(timestamp) + str(RECV_WINDOW) + body_json
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, param_str)
        request_body = body_json

    headers = {
        "X-BAPI-API-KEY": api_key,
        "X-BAPI-TIMESTAMP": str(timestamp),
        "X-BAPI-SIGN": signature,
        "X-BAPI-RECV-WINDOW": str(RECV_WINDOW),
        "Content-Type": "application/json"
    }

    if method == "GET":
        response = requests.get(url, headers=headers, timeout=10)
    else:
        response = requests.post(url, headers=headers, data=request_body, timeout=10)

    response.raise_for_status()
    return response.json()


# ═══════════════════════════════════════════════════════════════
# API FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def get_positions(api_key: str, api_secret: str) -> List[Dict]:
    """Get all open positions"""
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="GET",
        endpoint="/v5/position/list",
        params={"category": "linear", "settleCoin": "USDT"}
    )

    if result.get("retCode") != 0:
        raise Exception(f"Failed to get positions: {result.get('retMsg')}")

    positions = result.get("result", {}).get("list", [])
    # Filter active positions (size > 0)
    return [p for p in positions if float(p.get("size", 0)) > 0]


def get_active_orders(api_key: str, api_secret: str, symbol: str) -> List[Dict]:
    """Get all active orders for symbol"""
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="GET",
        endpoint="/v5/order/realtime",
        params={
            "category": "linear",
            "symbol": symbol,
            "orderFilter": "Order"
        }
    )

    if result.get("retCode") != 0:
        raise Exception(f"Failed to get orders: {result.get('retMsg')}")

    return result.get("result", {}).get("list", [])


def modify_stop_loss(
    api_key: str,
    api_secret: str,
    symbol: str,
    order_id: str,
    new_stop_loss: float
) -> Dict:
    """Modify existing stop loss order"""
    print(f"🔄 Modifying SL order {order_id} → ${new_stop_loss:.4f}")

    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="POST",
        endpoint="/v5/order/amend",
        body={
            "category": "linear",
            "symbol": symbol,
            "orderId": order_id,
            "stopLoss": str(new_stop_loss)
        }
    )

    if result.get("retCode") != 0:
        raise Exception(f"Failed to modify SL: {result.get('retMsg')}")

    print(f"✅ SL modified to break even @ ${new_stop_loss:.4f}")
    return result


# ═══════════════════════════════════════════════════════════════
# MAIN LOGIC
# ═══════════════════════════════════════════════════════════════

def check_and_move_to_breakeven(api_key: str, api_secret: str) -> List[Dict]:
    """
    Check all positions and move SL to break even if TP1 filled

    Returns:
        List of results for each position checked
    """
    print("\n" + "=" * 60)
    print("🎯 BREAK EVEN MONITOR - Checking positions...")
    print("=" * 60 + "\n")

    results = []

    # Get all open positions
    positions = get_positions(api_key, api_secret)
    print(f"📊 Found {len(positions)} open positions\n")

    if not positions:
        print("   ⏭️ No open positions to monitor\n")
        return []

    for position in positions:
        symbol = position.get("symbol")
        side = position.get("side")
        size = float(position.get("size", 0))
        entry_price = float(position.get("avgPrice", 0))

        print(f"🔵 {symbol} ({side}) - Entry: ${entry_price:.4f}, Size: {size}")

        try:
            # Get active orders for this symbol
            orders = get_active_orders(api_key, api_secret, symbol)

            # Find SL and TP1 orders
            sl_order = None
            tp1_order = None

            for order in orders:
                order_link_id = order.get("orderLinkId", "")
                order_type = order.get("orderType")
                stop_loss_val = order.get("stopLoss")

                # Identify SL order (has stopLoss field and is Market type)
                if stop_loss_val and order_type == "Market":
                    sl_order = order

                # Identify TP1 order (orderLinkId contains "TP1")
                if "TP1" in order_link_id and order_type == "Limit":
                    tp1_order = order

            # Check if TP1 exists and is filled
            if tp1_order:
                tp1_status = tp1_order.get("orderStatus")
                tp1_filled_qty = float(tp1_order.get("cumExecQty", 0))
                tp1_total_qty = float(tp1_order.get("qty", 0))
                tp1_price = float(tp1_order.get("price", 0))

                print(f"   TP1: ${tp1_price:.4f} | Status: {tp1_status} | Filled: {tp1_filled_qty}/{tp1_total_qty}")

                # Check if TP1 is fully filled
                if tp1_status == "Filled" or (tp1_filled_qty > 0 and tp1_filled_qty >= tp1_total_qty):
                    print(f"   ✅ TP1 FILLED! Checking SL...")

                    if sl_order:
                        current_sl = float(sl_order.get("stopLoss", 0))
                        sl_order_id = sl_order.get("orderId")
                        sl_status = sl_order.get("orderStatus")

                        print(f"   Current SL: ${current_sl:.4f} | Status: {sl_status}")

                        # Calculate break even price (with optional offset)
                        breakeven_price = entry_price * (1 + BREAK_EVEN_OFFSET)

                        # Check if SL is already at break even
                        sl_diff_pct = abs(current_sl - breakeven_price) / breakeven_price

                        if sl_diff_pct < TOLERANCE_PCT:
                            print(f"   ⏭️ SL already at break even, skipping\n")
                            results.append({
                                "symbol": symbol,
                                "action": "skipped",
                                "reason": "SL already at break even",
                                "entry_price": entry_price,
                                "current_sl": current_sl
                            })
                        else:
                            # Only modify if SL is Untriggered
                            if sl_status in ["Untriggered", "New"]:
                                try:
                                    # Move SL to break even
                                    modify_stop_loss(api_key, api_secret, symbol, sl_order_id, breakeven_price)

                                    results.append({
                                        "symbol": symbol,
                                        "action": "moved_to_breakeven",
                                        "entry_price": entry_price,
                                        "old_sl": current_sl,
                                        "new_sl": breakeven_price,
                                        "tp1_price": tp1_price
                                    })
                                    print(f"   🎯 SUCCESS: SL moved to break even!\n")

                                except Exception as e:
                                    print(f"   ❌ ERROR modifying SL: {str(e)}\n")
                                    results.append({
                                        "symbol": symbol,
                                        "action": "error",
                                        "error": str(e)
                                    })
                            else:
                                print(f"   ⚠️ SL status is {sl_status}, cannot modify\n")
                                results.append({
                                    "symbol": symbol,
                                    "action": "cannot_modify",
                                    "reason": f"SL status is {sl_status}"
                                })
                    else:
                        print(f"   ⚠️ No SL order found for {symbol}\n")
                        results.append({
                            "symbol": symbol,
                            "action": "no_sl_found"
                        })
                else:
                    print(f"   ⏳ TP1 not yet filled ({tp1_status})\n")
                    results.append({
                        "symbol": symbol,
                        "action": "waiting",
                        "tp1_status": tp1_status,
                        "tp1_filled": f"{tp1_filled_qty}/{tp1_total_qty}"
                    })
            else:
                print(f"   ⚠️ No TP1 order found for {symbol}\n")
                results.append({
                    "symbol": symbol,
                    "action": "no_tp1_found"
                })

        except Exception as e:
            print(f"   ❌ ERROR processing {symbol}: {str(e)}\n")
            results.append({
                "symbol": symbol,
                "action": "error",
                "error": str(e)
            })

    print("=" * 60)
    print(f"✅ Monitor completed - {len(results)} positions checked")
    print("=" * 60 + "\n")

    return results


# ═══════════════════════════════════════════════════════════════
# n8n CODE NODE ENTRY POINT
# ═══════════════════════════════════════════════════════════════

try:
    # Get API credentials from environment variables
    api_key = $env.BYBIT_API_KEY
    api_secret = $env.BYBIT_API_SECRET

    # Run break even check
    results = check_and_move_to_breakeven(api_key, api_secret)

    # Count actions
    moved_count = sum(1 for r in results if r.get("action") == "moved_to_breakeven")
    waiting_count = sum(1 for r in results if r.get("action") == "waiting")
    error_count = sum(1 for r in results if r.get("action") == "error")

    # Return results
    return [{
        "json": {
            "status": "success",
            "timestamp": int(time.time() * 1000),
            "positions_checked": len(results),
            "moved_to_breakeven": moved_count,
            "waiting": waiting_count,
            "errors": error_count,
            "results": results
        }
    }]

except Exception as e:
    print(f"\n❌ FATAL ERROR: {str(e)}\n")
    return [{
        "json": {
            "status": "error",
            "error": str(e),
            "timestamp": int(time.time() * 1000)
        }
    }]
