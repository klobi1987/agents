"""
🚀 n8n COMPLETE TRADE RUNNER - Jedan Python Code Node
═══════════════════════════════════════════════════════════════

Sve funkcionalnosti u 1 node-u:
✅ Position validation (5 long / 5 short limit)
✅ Duplicate check
✅ Set leverage
✅ Entry order (Market)
✅ Stop Loss
✅ Multiple Take Profits (TP1, TP2, TP3...)

═══════════════════════════════════════════════════════════════
"""

import hashlib
import hmac
import time
import json
import requests
from typing import Dict, List, Any, Optional

# ═══════════════════════════════════════════════════════════════
# 🔧 KONFIGURACIJA
# ═══════════════════════════════════════════════════════════════

BYBIT_API_URL = "https://api.bybit.com"
MAX_LONG_POSITIONS = 5
MAX_SHORT_POSITIONS = 5
RECV_WINDOW = 5000

# ═══════════════════════════════════════════════════════════════
# 🔐 BYBIT HMAC SIGNATURE
# ═══════════════════════════════════════════════════════════════

def generate_signature(api_secret: str, timestamp: int, recv_window: int, query_string: str = "", body: str = "") -> str:
    """
    Generate HMAC SHA256 signature for Bybit API

    Args:
        api_secret: Bybit API secret
        timestamp: Current timestamp in milliseconds
        recv_window: Receive window (default 5000)
        query_string: URL query parameters (for GET)
        body: JSON body (for POST)

    Returns:
        Hex signature string
    """
    # Prehash format: timestamp + api_key + recv_window + query_string (for GET) or body (for POST)
    # Note: api_key is NOT included in signature for V5 API
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
    """
    Make authenticated request to Bybit API V5

    Args:
        api_key: Bybit API key
        api_secret: Bybit API secret
        method: HTTP method (GET, POST)
        endpoint: API endpoint (e.g., "/v5/position/list")
        params: URL query parameters (for GET)
        body: JSON body (for POST)

    Returns:
        API response as dict
    """
    timestamp = int(time.time() * 1000)
    url = BYBIT_API_URL + endpoint

    # Build query string or body
    if method == "GET":
        query_string = "&".join([f"{k}={v}" for k, v in (params or {}).items()])
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, query_string=query_string)
        url += f"?{query_string}" if query_string else ""
        request_body = None
    else:  # POST
        body_json = json.dumps(body or {})
        signature = generate_signature(api_secret, timestamp, RECV_WINDOW, body=body_json)
        request_body = body_json

    # Headers
    headers = {
        "X-BAPI-API-KEY": api_key,
        "X-BAPI-TIMESTAMP": str(timestamp),
        "X-BAPI-SIGN": signature,
        "X-BAPI-RECV-WINDOW": str(RECV_WINDOW),
        "Content-Type": "application/json"
    }

    # Execute request
    if method == "GET":
        response = requests.get(url, headers=headers, timeout=10)
    else:
        response = requests.post(url, headers=headers, data=request_body, timeout=10)

    response.raise_for_status()
    return response.json()


# ═══════════════════════════════════════════════════════════════
# 📊 POSITION MANAGEMENT
# ═══════════════════════════════════════════════════════════════

def get_positions(api_key: str, api_secret: str) -> List[Dict]:
    """
    Get all active positions from Bybit

    Returns:
        List of position objects
    """
    result = bybit_request(
        api_key=api_key,
        api_secret=api_secret,
        method="GET",
        endpoint="/v5/position/list",
        params={
            "category": "linear",
            "settleCoin": "USDT"
        }
    )

    if result.get("retCode") != 0:
        raise Exception(f"Failed to get positions: {result.get('retMsg', 'Unknown error')}")

    return result.get("result", {}).get("list", [])


def validate_position(
    symbol: str,
    side: str,
    positions: List[Dict]
) -> Dict[str, Any]:
    """
    Validate if new position can be opened

    Args:
        symbol: Trading symbol (e.g., "RLCUSDT")
        side: "Buy" or "Sell"
        positions: List of current positions

    Returns:
        {
            "approved": bool,
            "status": "approved" | "rejected" | "skipped",
            "reason": str,
            "long_count": int,
            "short_count": int
        }
    """
    # Filter active positions (size > 0)
    active_positions = [p for p in positions if float(p.get("size", 0)) > 0]

    # Count long/short positions
    long_count = sum(1 for p in active_positions if p.get("side") == "Buy")
    short_count = sum(1 for p in active_positions if p.get("side") == "Sell")

    # Extract symbols
    existing_symbols = [p.get("symbol") for p in active_positions]

    print(f"📊 Current Positions: {long_count} long / {short_count} short")
    print(f"   Symbols: {', '.join(existing_symbols) or 'None'}")
    print(f"🔵 Request: {symbol} {side}")

    # Check 1: Duplicate position
    if symbol in existing_symbols:
        return {
            "approved": False,
            "status": "skipped",
            "reason": f"⏭️ Position already exists for {symbol}",
            "long_count": long_count,
            "short_count": short_count
        }

    # Check 2: Position limit
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

    # ✅ Approved
    print("✅ Position validation passed")
    return {
        "approved": True,
        "status": "approved",
        "reason": "Position approved",
        "long_count": long_count,
        "short_count": short_count
    }


# ═══════════════════════════════════════════════════════════════
# ⚙️ TRADING OPERATIONS
# ═══════════════════════════════════════════════════════════════

def set_leverage(
    api_key: str,
    api_secret: str,
    symbol: str,
    leverage: int
) -> Dict:
    """
    Set leverage for symbol

    Args:
        api_key: Bybit API key
        api_secret: Bybit API secret
        symbol: Trading symbol
        leverage: Leverage value (e.g., 8)

    Returns:
        API response
    """
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
        raise Exception(f"Failed to set leverage: {result.get('retMsg', 'Unknown error')}")

    print(f"✅ Leverage set to {leverage}x")
    return result


def place_entry_order(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,
    qty: str,
    position_idx: int = 0
) -> Dict:
    """
    Place market entry order

    Args:
        api_key: Bybit API key
        api_secret: Bybit API secret
        symbol: Trading symbol
        side: "Buy" or "Sell"
        qty: Quantity as string
        position_idx: Position mode (0=one-way, 1=hedge-buy, 2=hedge-sell)

    Returns:
        API response with orderId
    """
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
        raise Exception(f"Failed to place entry order: {result.get('retMsg', 'Unknown error')}")

    order_id = result.get("result", {}).get("orderId")
    print(f"✅ Entry order placed: {order_id}")

    return result


def place_stop_loss(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,  # Opposite of entry (Sell for long, Buy for short)
    qty: str,
    stop_loss_price: str,
    position_idx: int = 0
) -> Dict:
    """
    Place stop loss order

    Args:
        api_key: Bybit API key
        api_secret: Bybit API secret
        symbol: Trading symbol
        side: "Sell" for long, "Buy" for short
        qty: Quantity
        stop_loss_price: Stop loss trigger price
        position_idx: Position mode

    Returns:
        API response with orderId
    """
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
        raise Exception(f"Failed to place stop loss: {result.get('retMsg', 'Unknown error')}")

    order_id = result.get("result", {}).get("orderId")
    print(f"✅ Stop Loss placed: {order_id}")

    return result


def place_take_profit(
    api_key: str,
    api_secret: str,
    symbol: str,
    side: str,  # Opposite of entry
    qty: str,
    take_profit_price: str,
    position_idx: int = 0,
    label: str = "TP"
) -> Dict:
    """
    Place take profit limit order

    Args:
        api_key: Bybit API key
        api_secret: Bybit API secret
        symbol: Trading symbol
        side: "Sell" for long, "Buy" for short
        qty: Quantity
        take_profit_price: Take profit price
        position_idx: Position mode
        label: Order label (e.g., "TP1", "TP2")

    Returns:
        API response with orderId
    """
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
        raise Exception(f"Failed to place {label}: {result.get('retMsg', 'Unknown error')}")

    order_id = result.get("result", {}).get("orderId")
    print(f"✅ {label} placed: {order_id}")

    return result


# ═══════════════════════════════════════════════════════════════
# 🎯 MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════

def execute_trade(trade_signal: Dict) -> Dict:
    """
    Execute complete trade with validation, entry, SL, and TPs

    Args:
        trade_signal: Trade signal from previous n8n node

    Expected input format:
    {
        "symbol": "RLCUSDT",
        "side": "Buy",
        "qty": "742",
        "leverage": 8,
        "stop_loss": "0.8945",
        "take_profits": [
            {"price": "1.3862", "size_pct": 50, "label": "TP1"},
            {"price": "1.5199", "size_pct": 50, "label": "TP2"}
        ],
        "position_idx": 0,
        "api_key": "YOUR_API_KEY",
        "api_secret": "YOUR_API_SECRET"
    }

    Returns:
        {
            "status": "success" | "skipped" | "rejected" | "error",
            "symbol": str,
            "side": str,
            "qty": str,
            "leverage": int,
            "entry_order_id": str,
            "sl_order_id": str,
            "tp_order_ids": [str, ...],
            "validation": {...},
            "error": str (if failed)
        }
    """
    try:
        # Extract parameters
        api_key = trade_signal.get("api_key")
        api_secret = trade_signal.get("api_secret")
        symbol = trade_signal.get("symbol")
        side = trade_signal.get("side")
        qty = str(trade_signal.get("qty"))
        leverage = int(trade_signal.get("leverage", 1))
        stop_loss = trade_signal.get("stop_loss")
        take_profits = trade_signal.get("take_profits", [])
        position_idx = int(trade_signal.get("position_idx", 0))
        skip_leverage = trade_signal.get("skip_leverage", False)  # NEW: Skip leverage if already set

        print("\n" + "=" * 60)
        print("🎯 TRADE RUNNER EXECUTION START")
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
            sl_result = place_stop_loss(
                api_key, api_secret, symbol, opposite_side, qty, stop_loss, position_idx
            )
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

                # Calculate TP quantity
                tp_qty = int(total_qty * (tp_size_pct / 100))

                tp_result = place_take_profit(
                    api_key, api_secret, symbol, opposite_side,
                    str(tp_qty), tp_price, position_idx, tp_label
                )
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
# n8n CODE NODE ENTRY POINT
# ═══════════════════════════════════════════════════════════════

try:
    import os

    # Get input from previous n8n node
    input_data = $input.item.json

    # Add API credentials from environment variables
    # Note: Adjust variable names if yours are different
    input_data["api_key"] = os.getenv('BYBIT_API_KEY') or os.getenv('bybit_api_key')
    input_data["api_secret"] = os.getenv('BYBIT_API_SECRET') or os.getenv('bybit_api_secret')

    # Execute trade
    result = execute_trade(input_data)

    # Return result to next node
    return [{"json": result}]

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
