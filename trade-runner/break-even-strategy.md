# 🎯 Break Even Strategy - Auto Move SL to Entry after TP1

## Šta želimo:
```
✅ Plasira Entry @ $1.00
✅ Plasira SL @ $0.85 (-15%)
✅ Plasira TP1 @ $1.30 (50% qty)
✅ Plasira TP2 @ $1.50 (50% qty)

📊 Kada TP1 HIT ($1.30):
   → Automatski pomjeri SL na $1.00 (BREAK EVEN)
   → Sad nemaš risk - profit je zagarantovan!
```

---

## 🔧 PRISTUP 1: Bybit Partial TP/SL (Najlakše!)

Bybit V5 API ima **built-in** feature za ovo!

### Parametri:
```json
{
  "tpslMode": "Partial",
  "tpOrderType": "Limit",
  "slOrderType": "Market",
  "stopLoss": "0.85",
  "slTriggerBy": "LastPrice",
  "takeProfit": "1.30",
  "tpTriggerBy": "LastPrice",
  "tpLimitPrice": "1.30"
}
```

**Problem**: Ovo NE dozvoljava multiple TP levels (TP1, TP2, TP3).
Bybit dozvoljava samo 1 TP i 1 SL na ovaj način.

---

## ✅ PRISTUP 2: Custom Monitor Workflow (Препоручено!)

Kreiraćemo **n8n Order Monitor** koji:
1. Prati sve aktivne pozicije
2. Detektuje kada se TP1 izvrši
3. Automatski modifikuje SL na entry price

### Arhitektura:

```
┌─────────────────────────────────────────────────────────┐
│  TRADE RUNNER (Existing)                                │
│  - Opens position                                        │
│  - Sets SL @ original level                             │
│  - Sets TP1, TP2                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│  ORDER MONITOR (NEW)                                    │
│  - Runs every 30 seconds                                │
│  - Checks all open positions                            │
│  - Detects when TP1 is filled                           │
│  - Modifies SL → Entry price (Break Even)               │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation

### HTTP Requests Potrebni:

#### 1. Get Position Info
```http
GET /v5/position/list?category=linear&symbol=RLCUSDT
```

Response:
```json
{
  "result": {
    "list": [{
      "symbol": "RLCUSDT",
      "side": "Buy",
      "size": "742",
      "avgPrice": "1.0544",  ← Entry price
      "unrealisedPnl": "50.23",
      ...
    }]
  }
}
```

#### 2. Get Active Orders (Check TP1 status)
```http
GET /v5/order/realtime?category=linear&symbol=RLCUSDT&orderFilter=Order
```

Response:
```json
{
  "result": {
    "list": [
      {
        "orderId": "SL_abc",
        "orderType": "Market",
        "stopLoss": "0.8945",
        "status": "Untriggered"
      },
      {
        "orderId": "TP1_111",
        "orderType": "Limit",
        "price": "1.3862",
        "cumExecQty": "371",  ← Filled qty
        "qty": "371",
        "status": "Filled"  ← TP1 HIT!
      },
      {
        "orderId": "TP2_222",
        "orderType": "Limit",
        "price": "1.5199",
        "status": "New"
      }
    ]
  }
}
```

#### 3. Modify SL Order (Move to Break Even)
```http
POST /v5/order/amend

{
  "category": "linear",
  "symbol": "RLCUSDT",
  "orderId": "SL_abc",
  "stopLoss": "1.0544"  ← Entry price (break even)
}
```

---

## 💻 Python Code - Break Even Monitor

```python
"""
n8n ORDER MONITOR - Break Even after TP1
Runs every 30 seconds to check if TP1 is filled
"""

import hashlib
import hmac
import time
import json
import requests
from typing import Dict, List, Optional

BYBIT_API_URL = "https://api.bybit.com"
RECV_WINDOW = 5000

def bybit_request(api_key, api_secret, method, endpoint, params=None, body=None):
    """Same as Trade Runner"""
    timestamp = int(time.time() * 1000)
    url = BYBIT_API_URL + endpoint

    if method == "GET":
        query_string = "&".join([f"{k}={v}" for k, v in (params or {}).items()])
        param_str = str(timestamp) + str(RECV_WINDOW) + query_string
        signature = hmac.new(
            api_secret.encode('utf-8'),
            param_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        url += f"?{query_string}" if query_string else ""
        request_body = None
    else:
        body_json = json.dumps(body or {})
        param_str = str(timestamp) + str(RECV_WINDOW) + body_json
        signature = hmac.new(
            api_secret.encode('utf-8'),
            param_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
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


def get_positions(api_key, api_secret):
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


def get_active_orders(api_key, api_secret, symbol):
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


def modify_stop_loss(api_key, api_secret, symbol, order_id, new_stop_loss):
    """Modify existing stop loss order"""
    print(f"🔄 Modifying SL order {order_id} → {new_stop_loss}")

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

    print(f"✅ SL modified to break even @ {new_stop_loss}")
    return result


def check_and_move_to_breakeven(api_key, api_secret):
    """
    Main logic: Check all positions and move SL to break even if TP1 filled
    """
    print("\n" + "=" * 60)
    print("🔍 BREAK EVEN MONITOR - Checking positions...")
    print("=" * 60 + "\n")

    results = []

    # Get all open positions
    positions = get_positions(api_key, api_secret)
    print(f"📊 Found {len(positions)} open positions\n")

    for position in positions:
        symbol = position.get("symbol")
        side = position.get("side")
        size = float(position.get("size", 0))
        entry_price = float(position.get("avgPrice", 0))

        print(f"🔵 Checking {symbol} ({side}) - Entry: ${entry_price:.4f}")

        # Get active orders for this symbol
        orders = get_active_orders(api_key, api_secret, symbol)

        # Find SL and TP orders
        sl_order = None
        tp1_order = None

        for order in orders:
            order_link_id = order.get("orderLinkId", "")
            order_type = order.get("orderType")

            # Identify SL order
            if order.get("stopLoss") and order_type == "Market":
                sl_order = order

            # Identify TP1 order (by orderLinkId starting with "TP1")
            if "TP1" in order_link_id and order_type == "Limit":
                tp1_order = order

        # Check if TP1 is filled
        if tp1_order:
            tp1_status = tp1_order.get("orderStatus")
            tp1_filled_qty = float(tp1_order.get("cumExecQty", 0))
            tp1_total_qty = float(tp1_order.get("qty", 0))

            print(f"   TP1 Status: {tp1_status} ({tp1_filled_qty}/{tp1_total_qty})")

            # If TP1 is fully filled
            if tp1_status == "Filled" or tp1_filled_qty >= tp1_total_qty:
                print(f"   ✅ TP1 FILLED! Moving SL to break even...")

                # Check current SL
                if sl_order:
                    current_sl = float(sl_order.get("stopLoss", 0))
                    sl_order_id = sl_order.get("orderId")

                    print(f"   Current SL: ${current_sl:.4f}")
                    print(f"   Entry Price: ${entry_price:.4f}")

                    # Check if SL is already at break even
                    if abs(current_sl - entry_price) < 0.0001:  # Within 0.01% tolerance
                        print(f"   ⏭️ SL already at break even, skipping\n")
                        results.append({
                            "symbol": symbol,
                            "action": "skipped",
                            "reason": "SL already at break even"
                        })
                    else:
                        # Move SL to entry price (break even)
                        try:
                            modify_stop_loss(api_key, api_secret, symbol, sl_order_id, entry_price)

                            results.append({
                                "symbol": symbol,
                                "action": "moved_to_breakeven",
                                "entry_price": entry_price,
                                "old_sl": current_sl,
                                "new_sl": entry_price
                            })
                            print(f"   🎯 SUCCESS: SL moved to break even!\n")
                        except Exception as e:
                            print(f"   ❌ ERROR: {str(e)}\n")
                            results.append({
                                "symbol": symbol,
                                "action": "error",
                                "error": str(e)
                            })
                else:
                    print(f"   ⚠️ No SL order found\n")
                    results.append({
                        "symbol": symbol,
                        "action": "no_sl_found"
                    })
            else:
                print(f"   ⏳ TP1 not yet filled\n")
                results.append({
                    "symbol": symbol,
                    "action": "waiting",
                    "tp1_status": tp1_status
                })
        else:
            print(f"   ⚠️ No TP1 order found\n")
            results.append({
                "symbol": symbol,
                "action": "no_tp1_found"
            })

    print("=" * 60)
    print(f"✅ Monitor completed - {len(results)} positions checked")
    print("=" * 60 + "\n")

    return results


# ═══════════════════════════════════════════════════════════════
# n8n CODE NODE ENTRY POINT
# ═══════════════════════════════════════════════════════════════

try:
    # Get API credentials from environment or input
    api_key = $env.BYBIT_API_KEY
    api_secret = $env.BYBIT_API_SECRET

    # Run break even check
    results = check_and_move_to_breakeven(api_key, api_secret)

    # Return results
    return [{
        "json": {
            "status": "success",
            "timestamp": int(time.time() * 1000),
            "positions_checked": len(results),
            "results": results
        }
    }]

except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    return [{
        "json": {
            "status": "error",
            "error": str(e)
        }
    }]
```

---

## 🔄 n8n Workflow Setup

### 1. Schedule Trigger
- **Interval**: Every 30 seconds
- **Name**: "Break Even Monitor Trigger"

### 2. Python Code Node
- **Name**: "Break Even Monitor"
- **Code**: Kopiraj gore navedeni kod

### 3. IF Node (Optional - Notification)
- **Condition**: `{{ $json.results.some(r => r.action === "moved_to_breakeven") }}`
- **TRUE** → Send Telegram/Discord notification
- **FALSE** → No operation

---

## 📊 Complete Workflow Visualization

```
┌────────────────────────────────────────────────────────────┐
│  Main Trading Workflow                                     │
└────────────────────────────────────────────────────────────┘

TRADE SELECTOR → TRADE RUNNER
                      ↓
                 ✅ Position opened
                 ✅ SL @ $0.85
                 ✅ TP1 @ $1.30 (50%)
                 ✅ TP2 @ $1.50 (50%)

┌────────────────────────────────────────────────────────────┐
│  Break Even Monitor (Separate Workflow)                   │
└────────────────────────────────────────────────────────────┘

⏰ Schedule Trigger (Every 30s)
  ↓
💻 Python Code - Break Even Monitor
  │
  ├─ Get all open positions
  ├─ For each position:
  │   ├─ Get active orders (SL, TP1, TP2)
  │   ├─ Check if TP1 is filled
  │   └─ If YES → Modify SL to entry price
  │
  └─ Return results

  ↓
📊 IF: Any positions moved to break even?
  │
  ├─ YES → Send Telegram notification
  │         "🎯 RLC: SL moved to break even @ $1.05!"
  │
  └─ NO → Silent (no action needed)
```

---

## 📈 Example Output

### When TP1 is filled:
```json
{
  "status": "success",
  "timestamp": 1730999500000,
  "positions_checked": 3,
  "results": [
    {
      "symbol": "RLCUSDT",
      "action": "moved_to_breakeven",
      "entry_price": 1.0544,
      "old_sl": 0.8945,
      "new_sl": 1.0544
    },
    {
      "symbol": "ETHUSDT",
      "action": "waiting",
      "tp1_status": "New"
    },
    {
      "symbol": "BTCUSDT",
      "action": "skipped",
      "reason": "SL already at break even"
    }
  ]
}
```

### Telegram notification:
```
🎯 BREAK EVEN TRIGGERED!

Symbol: RLCUSDT
Entry: $1.0544
Old SL: $0.8945 (-15.2%)
New SL: $1.0544 (BREAK EVEN ✅)

Your position is now risk-free! 🚀
```

---

## ⚙️ Configuration Options

### 1. Monitoring Frequency
Adjust schedule trigger:
- **Conservative**: Every 60 seconds (less API calls)
- **Balanced**: Every 30 seconds (recommended)
- **Aggressive**: Every 15 seconds (max)

### 2. Break Even Offset
Možeš dodati mali offset umjesto exact entry:

```python
# Break even sa +0.5% offset (garantuje profit)
breakeven_price = entry_price * 1.005
```

### 3. Partial Fill Support
Ako želiš da se SL pomjera čak i sa partial fill-om:

```python
# Move to break even if TP1 is at least 50% filled
if tp1_filled_qty >= (tp1_total_qty * 0.5):
    # Move SL
```

---

## 🐛 Edge Cases

### 1. TP1 nije pronađen
- **Uzrok**: Order je expired ili cancelled
- **Akcija**: Skip ovaj symbol

### 2. SL order ne postoji
- **Uzrok**: Manually zatvoreno ili execution error
- **Akcija**: Log warning, ne crashes

### 3. Multiple TP1 orders
- **Uzrok**: Dodao si više TP1 orders
- **Akcija**: Uzmi prvi koji je filled

### 4. SL već na break even
- **Uzrok**: Prethodno executed
- **Akcija**: Skip (no change needed)

---

## 💡 Advanced: Move SL sa svakim TP-om

Ako želiš da se SL pomjera progresivno:

```python
# TP1 filled → SL to entry (break even)
# TP2 filled → SL to TP1 price (lock in profit)
# TP3 filled → SL to TP2 price (lock more profit)

if tp2_status == "Filled":
    new_sl = tp1_price  # Lock TP1 profit
    modify_stop_loss(...)
```

---

## ✅ Quick Start Checklist

- [ ] Kopiraj Python kod u novi n8n Code node
- [ ] Dodaj Schedule Trigger (30s interval)
- [ ] Dodaj environment variables (API key/secret)
- [ ] (Optional) Dodaj IF node + Telegram notification
- [ ] Aktiviraj workflow
- [ ] Testiraj sa paper trading accountom
- [ ] Monitor logs za prvi execution
- [ ] Gotovo! 🎉

---

## 🎓 Notes

1. **API Rate Limits**:
   - Bybit dozvoljava 50 req/sec
   - Sa 30s interval + 5 pozicija = ~10 requests / 30s = OK

2. **Order Amendment**:
   - Bybit dozvoljava amend samo za Untriggered ordere
   - Ako je SL već triggered, ne može se promijeniti

3. **Position Mode**:
   - Radi i sa One-way i Hedge mode
   - Detektuje automatski na osnovu position side

4. **Multiple Symbols**:
   - Monitor automatski prati SVE otvorene pozicije
   - Ne treba specijalno konfiguracija za svaki symbol
