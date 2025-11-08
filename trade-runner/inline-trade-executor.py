"""
🎯 INLINE TRADE EXECUTOR - Direktno u workflow-u (bez webhook-a)

Stavlja se DIREKTNO nakon "IF: Trade Selected?" node-a.
Čita output od Trade Selector-a i izvršava trade automatski.

═══════════════════════════════════════════════════════════════
"""

import os
import hashlib
import hmac
import time
import json
import requests
from typing import Dict, List, Any, Optional

# ═══════════════════════════════════════════════════════════════
# KONFIGURACIJA
# ═══════════════════════════════════════════════════════════════

BYBIT_API_URL = "https://api.bybit.com"
MAX_LONG_POSITIONS = 5
MAX_SHORT_POSITIONS = 5
RECV_WINDOW = 5000

# ═══════════════════════════════════════════════════════════════
# BYBIT API FUNCTIONS (sve kao u Trade Runner-u)
# ═══════════════════════════════════════════════════════════════

def generate_signature(api_secret: str, timestamp: int, recv_window: int, query_string: str = "", body: str = "") -> str:
    param_str = str(timestamp) + str(recv_window) + (query_string or body)
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
    timestamp = int(time.time() * 1000)
    url = BYBIT_API_URL + endpoint

    if method == "GET":
        query_string = "&".join([f"{k}={v}" for k, v in (params or {}).items()])
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, query_string=query_string)
        url += f"?{query_string}" if query_string else ""
        request_body = None
    else:
        body_json = json.dumps(body or {})
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, body=body_json)
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


def get_positions(api_key: str, api_secret: str) -> List[Dict]:
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="GET",
        endpoint="/v5/position/list",
        params={"category": "linear", "settleCoin": "USDT"}
    )
    if result.get("retCode") != 0:
        raise Exception(f"Failed to get positions: {result.get('retMsg')}")
    return result.get("result", {}).get("list", [])


def validate_position(symbol: str, side: str, positions: List[Dict]) -> Dict[str, Any]:
    active_positions = [p for p in positions if float(p.get("size", 0)) > 0]
    long_count = sum(1 for p in active_positions if p.get("side") == "Buy")
    short_count = sum(1 for p in active_positions if p.get("side") == "Sell")
    existing_symbols = [p.get("symbol") for p in active_positions]

    print(f"📊 Current Positions: {long_count} long / {short_count} short")
    print(f"   Symbols: {', '.join(existing_symbols) or 'None'}")
    print(f"🔵 Request: {symbol} {side}")

    if symbol in existing_symbols:
        return {
            "approved": False,
            "status": "skipped",
            "reason": f"⏭️ Position already exists for {symbol}",
            "long_count": long_count,
            "short_count": short_count
        }

    is_long = side == "Buy"
    if is_long and long_count >= MAX_LONG_POSITIONS:
        return {
            "approved": False,
            "status": "rejected",
            "reason": f"🚫 Max long positions ({long_count}/{MAX_LONG_POSITIONS})",
            "long_count": long_count,
            "short_count": short_count
        }

    if not is_long and short_count >= MAX_SHORT_POSITIONS:
        return {
            "approved": False,
            "status": "rejected",
            "reason": f"🚫 Max short positions ({short_count}/{MAX_SHORT_POSITIONS})",
            "long_count": long_count,
            "short_count": short_count
        }

    print("✅ Position validation passed")
    return {
        "approved": True,
        "status": "approved",
        "reason": "Position approved",
        "long_count": long_count,
        "short_count": short_count
    }


def set_leverage(api_key: str, api_secret: str, symbol: str, leverage: int) -> Dict:
    print(f"⚙️ Setting leverage to {leverage}x for {symbol}")
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="POST",
        endpoint="/v5/position/set-leverage",
        body={
            "category": "linear",
            "symbol": symbol,
            "buyLeverage": str(leverage),
            "sellLeverage": str(leverage)
        }
    )
    if result.get("retCode") != 0:
        raise Exception(f"Failed to set leverage: {result.get('retMsg')}")
    print(f"✅ Leverage set to {leverage}x")
    return result


def place_entry_order(api_key: str, api_secret: str, symbol: str, side: str, qty: str, position_idx: int = 0) -> Dict:
    print(f"🚀 Placing {side} order for {qty} {symbol}")
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="POST",
        endpoint="/v5/order/create",
        body={
            "category": "linear",
            "symbol": symbol,
            "side": side,
            "orderType": "Market",
            "qty": str(qty),
            "positionIdx": position_idx,
            "timeInForce": "IOC"
        }
    )
    if result.get("retCode") != 0:
        raise Exception(f"Failed to place entry order: {result.get('retMsg')}")
    order_id = result.get("result", {}).get("orderId")
    print(f"✅ Entry order placed: {order_id}")
    return result


def place_stop_loss(api_key: str, api_secret: str, symbol: str, side: str, qty: str, stop_loss_price: str, position_idx: int = 0) -> Dict:
    print(f"🛡️ Placing Stop Loss at {stop_loss_price}")
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="POST",
        endpoint="/v5/order/create",
        body={
            "category": "linear",
            "symbol": symbol,
            "side": side,
            "orderType": "Market",
            "qty": str(qty),
            "stopLoss": str(stop_loss_price),
            "triggerBy": "LastPrice",
            "reduceOnly": True,
            "positionIdx": position_idx
        }
    )
    if result.get("retCode") != 0:
        raise Exception(f"Failed to place stop loss: {result.get('retMsg')}")
    order_id = result.get("result", {}).get("orderId")
    print(f"✅ Stop Loss placed: {order_id}")
    return result


def place_take_profit(api_key: str, api_secret: str, symbol: str, side: str, qty: str, take_profit_price: str, position_idx: int = 0, label: str = "TP") -> Dict:
    print(f"💰 Placing {label} at {take_profit_price} for {qty} {symbol}")
    order_link_id = f"{label}_{symbol}_{int(time.time() * 1000)}"
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="POST",
        endpoint="/v5/order/create",
        body={
            "category": "linear",
            "symbol": symbol,
            "side": side,
            "orderType": "Limit",
            "qty": str(qty),
            "price": str(take_profit_price),
            "reduceOnly": True,
            "positionIdx": position_idx,
            "orderLinkId": order_link_id
        }
    )
    if result.get("retCode") != 0:
        raise Exception(f"Failed to place {label}: {result.get('retMsg')}")
    order_id = result.get("result", {}).get("orderId")
    print(f"✅ {label} placed: {order_id}")
    return result


def execute_trade(trade_signal: Dict) -> Dict:
    try:
        api_key = trade_signal.get("api_key")
        api_secret = trade_signal.get("api_secret")
        symbol = trade_signal.get("symbol")
        side = trade_signal.get("side")
        qty = str(trade_signal.get("qty"))
        leverage = int(trade_signal.get("leverage", 1))
        stop_loss = trade_signal.get("stop_loss")
        take_profits = trade_signal.get("take_profits", [])
        position_idx = int(trade_signal.get("position_idx", 0))
        skip_leverage = trade_signal.get("skip_leverage", False)

        print("\n" + "=" * 60)
        print("🎯 INLINE TRADE EXECUTOR - START")
        print("=" * 60)
        print(f"Symbol: {symbol}")
        print(f"Side: {side}")
        print(f"Quantity: {qty}")
        print(f"Leverage: {leverage}x {'(skip)' if skip_leverage else ''}")
        print(f"Stop Loss: {stop_loss}")
        print(f"Take Profits: {len(take_profits)}")
        print("=" * 60 + "\n")

        # STEP 1: Get current positions
        print("📊 STEP 1: Fetching current positions...")
        positions = get_positions(api_key, api_secret)
        print(f"   Found {len(positions)} positions\n")

        # STEP 2: Validate position
        print("🔍 STEP 2: Validating position...")
        validation = validate_position(symbol, side, positions)
        print(f"   Status: {validation['status']}\n")

        if not validation["approved"]:
            print(f"❌ Trade {validation['status']}: {validation['reason']}\n")
            return {
                "status": validation["status"],
                "symbol": symbol,
                "side": side,
                "qty": qty,
                "leverage": leverage,
                "validation": validation,
                "reason": validation["reason"]
            }

        # STEP 3: Set leverage (optional)
        if skip_leverage:
            print("⚙️ STEP 3: Skipping leverage (already set)\n")
        else:
            print("⚙️ STEP 3: Setting leverage...")
            set_leverage(api_key, api_secret, symbol, leverage)
            print()

        # STEP 4: Place entry order
        print("🚀 STEP 4: Placing entry order...")
        entry_result = place_entry_order(api_key, api_secret, symbol, side, qty, position_idx)
        entry_order_id = entry_result.get("result", {}).get("orderId")
        print()

        # STEP 5: Place stop loss
        sl_order_id = None
        if stop_loss:
            print("🛡️ STEP 5: Placing stop loss...")
            opposite_side = "Sell" if side == "Buy" else "Buy"
            sl_result = place_stop_loss(api_key, api_secret, symbol, opposite_side, qty, stop_loss, position_idx)
            sl_order_id = sl_result.get("result", {}).get("orderId")
            print()

        # STEP 6: Place take profits
        tp_order_ids = []
        if take_profits:
            print(f"💰 STEP 6: Placing {len(take_profits)} take profit orders...")
            opposite_side = "Sell" if side == "Buy" else "Buy"
            total_qty = float(qty)

            for tp in take_profits:
                tp_price = tp.get("price")
                tp_size_pct = tp.get("size_pct", 100)
                tp_label = tp.get("label", "TP")
                tp_qty = int(total_qty * (tp_size_pct / 100))

                tp_result = place_take_profit(api_key, api_secret, symbol, opposite_side, str(tp_qty), tp_price, position_idx, tp_label)
                tp_order_id = tp_result.get("result", {}).get("orderId")
                tp_order_ids.append(tp_order_id)
            print()

        # SUCCESS
        print("=" * 60)
        print("✅ TRADE EXECUTION COMPLETED")
        print("=" * 60)
        print(f"Entry Order: {entry_order_id}")
        print(f"Stop Loss: {sl_order_id}")
        print(f"Take Profits: {', '.join(tp_order_ids)}")
        print("=" * 60 + "\n")

        return {
            "status": "success",
            "symbol": symbol,
            "side": side,
            "qty": qty,
            "leverage": leverage,
            "entry_order_id": entry_order_id,
            "sl_order_id": sl_order_id,
            "tp_order_ids": tp_order_ids,
            "validation": validation
        }

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        return {
            "status": "error",
            "symbol": trade_signal.get("symbol", "UNKNOWN"),
            "error": str(e)
        }


# ═══════════════════════════════════════════════════════════════
# n8n CODE NODE ENTRY POINT - TRANSFORM + EXECUTE
# ═══════════════════════════════════════════════════════════════

try:
    # Get input from Trade Selector
    selector_output = $input.item.json

    print("\n🔄 TRANSFORMING TRADE SELECTOR OUTPUT...")
    print(f"   Input: {selector_output.get('symbol')} {selector_output.get('side')}")

    # Transform Trade Selector output → Trade Runner format
    bybit_side = "Buy" if selector_output.get("side") == "BUY" else "Sell"

    trade_payload = {
        "symbol": selector_output.get("bybit_symbol") or selector_output.get("symbol"),
        "side": bybit_side,
        "qty": str(selector_output.get("quantity")),
        "leverage": selector_output.get("leverage"),
        "stop_loss": str(selector_output.get("stop_loss")),
        "take_profits": selector_output.get("take_profits", []),
        "position_idx": 0,
        "skip_leverage": True,  # Promijeniti na False ako želiš da postavlja leverage

        # API credentials from environment
        "api_key": os.getenv('BYBIT_API_KEY') or os.getenv('bybit_api_key'),
        "api_secret": os.getenv('BYBIT_API_SECRET') or os.getenv('bybit_api_secret')
    }

    print("✅ Transformation complete!")
    print(f"   Symbol: {trade_payload['symbol']}")
    print(f"   Side: {trade_payload['side']}")
    print(f"   Qty: {trade_payload['qty']}")
    print(f"   Leverage: {trade_payload['leverage']}x\n")

    # Execute trade
    result = execute_trade(trade_payload)

    # Return result
    return [{
        "json": {
            **result,
            "original_selector_output": selector_output
        }
    }]

except Exception as e:
    print(f"❌ FATAL ERROR: {str(e)}")
    import traceback
    traceback.print_exc()

    return [{
        "json": {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }
    }]
