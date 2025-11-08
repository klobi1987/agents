# 🔄 Trade Runner - Kompletan Flow sa HTTP Requestima

## 📊 DETALJAN FLOW (Korak po Korak)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 1: WEBHOOK PRIMI SIGNAL (External → n8n)                         ║
╚═══════════════════════════════════════════════════════════════════════════╝

TradingView/Selector → POST https://your-n8n.com/webhook/trade

Request Body:
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
  "position_idx": 0
}

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 2: PYTHON CODE NODE - Get Current Positions                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #1: GET POSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: GET
URL: https://api.bybit.com/v5/position/list?category=linear&settleCoin=USDT

HEADERS:
  X-BAPI-API-KEY: your_api_key
  X-BAPI-TIMESTAMP: 1730999400000
  X-BAPI-SIGN: <HMAC-SHA256-signature>
  X-BAPI-RECV-WINDOW: 5000

HMAC Generation:
  prehash = "1730999400000" + "5000" + "category=linear&settleCoin=USDT"
  signature = HMAC-SHA256(prehash, api_secret)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE (Primjer):
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "list": [
      {
        "symbol": "BTCUSDT",
        "side": "Buy",
        "size": "0.1",
        "positionValue": "9500",
        "leverage": "10",
        ...
      },
      {
        "symbol": "ETHUSDT",
        "side": "Buy",
        "size": "2",
        "positionValue": "6000",
        "leverage": "8",
        ...
      },
      {
        "symbol": "SOLUSDT",
        "side": "Sell",
        "size": "10",
        "positionValue": "2400",
        "leverage": "5",
        ...
      }
    ]
  }
}

PARSED DATA:
  Active positions: 3
  Long positions (Buy): 2 (BTC, ETH)
  Short positions (Sell): 1 (SOL)
  Symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 3: VALIDACIJA - Duplicate & Limit Check                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

PROVJERA 1: Duplikat
  Request: RLCUSDT
  Existing: [BTCUSDT, ETHUSDT, SOLUSDT]
  Result: ✅ RLC nije u listi → OK

PROVJERA 2: Long/Short Limit
  Request side: Buy (LONG)
  Current long count: 2
  Max long: 5
  Result: ✅ 2 < 5 → OK

PROVJERA 3: Short Limit (ako je SELL)
  (N/A za Buy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDATION OUTPUT:
{
  "approved": true,
  "status": "approved",
  "reason": "Position approved",
  "long_count": 2,
  "short_count": 1
}

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 4: SET LEVERAGE - 8x                                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #2: SET LEVERAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: POST
URL: https://api.bybit.com/v5/position/set-leverage

HEADERS:
  X-BAPI-API-KEY: your_api_key
  X-BAPI-TIMESTAMP: 1730999401000
  X-BAPI-SIGN: <HMAC-SHA256-signature>
  X-BAPI-RECV-WINDOW: 5000
  Content-Type: application/json

BODY:
{
  "category": "linear",
  "symbol": "RLCUSDT",
  "buyLeverage": "8",
  "sellLeverage": "8"
}

HMAC Generation:
  body_str = '{"category":"linear","symbol":"RLCUSDT","buyLeverage":"8","sellLeverage":"8"}'
  prehash = "1730999401000" + "5000" + body_str
  signature = HMAC-SHA256(prehash, api_secret)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {}
}

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 5: ENTRY ORDER - Market Buy 742 RLC                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #3: PLACE ENTRY ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: POST
URL: https://api.bybit.com/v5/order/create

HEADERS:
  X-BAPI-API-KEY: your_api_key
  X-BAPI-TIMESTAMP: 1730999402000
  X-BAPI-SIGN: <HMAC-SHA256-signature>
  X-BAPI-RECV-WINDOW: 5000
  Content-Type: application/json

BODY:
{
  "category": "linear",
  "symbol": "RLCUSDT",
  "side": "Buy",
  "orderType": "Market",
  "qty": "742",
  "positionIdx": 0,
  "timeInForce": "IOC"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "orderId": "1234567890abcdef",
    "orderLinkId": "..."
  }
}

RESULT:
  Entry Order ID: 1234567890abcdef
  Status: ✅ Filled (Market order)
  Position opened: 742 RLC @ ~$1.05

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 6: STOP LOSS - @ $0.8945                                         ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #4: PLACE STOP LOSS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: POST
URL: https://api.bybit.com/v5/order/create

BODY:
{
  "category": "linear",
  "symbol": "RLCUSDT",
  "side": "Sell",              ← Opposite of entry (close long)
  "orderType": "Market",
  "qty": "742",
  "stopLoss": "0.8945",        ← Trigger price
  "triggerBy": "LastPrice",
  "reduceOnly": true,
  "positionIdx": 0
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "orderId": "SL_abcdef123456",
    "orderLinkId": "..."
  }
}

RESULT:
  Stop Loss Order ID: SL_abcdef123456
  Trigger: If price falls to $0.8945 → Sell 742 RLC

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 7: TAKE PROFIT #1 - @ $1.3862 (50% = 371 RLC)                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #5: PLACE TAKE PROFIT 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: POST
URL: https://api.bybit.com/v5/order/create

BODY:
{
  "category": "linear",
  "symbol": "RLCUSDT",
  "side": "Sell",
  "orderType": "Limit",          ← Limit order (not Market)
  "qty": "371",                  ← 50% of 742
  "price": "1.3862",             ← TP price
  "reduceOnly": true,
  "positionIdx": 0,
  "orderLinkId": "TP1_RLCUSDT_1730999403000"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "orderId": "TP1_111222333",
    "orderLinkId": "TP1_RLCUSDT_1730999403000"
  }
}

RESULT:
  TP1 Order ID: TP1_111222333
  Limit: Sell 371 RLC @ $1.3862

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 8: TAKE PROFIT #2 - @ $1.5199 (50% = 371 RLC)                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

HTTP Request #6: PLACE TAKE PROFIT 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

METHOD: POST
URL: https://api.bybit.com/v5/order/create

BODY:
{
  "category": "linear",
  "symbol": "RLCUSDT",
  "side": "Sell",
  "orderType": "Limit",
  "qty": "371",                  ← Remaining 50%
  "price": "1.5199",
  "reduceOnly": true,
  "positionIdx": 0,
  "orderLinkId": "TP2_RLCUSDT_1730999404000"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESPONSE:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "orderId": "TP2_444555666",
    "orderLinkId": "TP2_RLCUSDT_1730999404000"
  }
}

RESULT:
  TP2 Order ID: TP2_444555666
  Limit: Sell 371 RLC @ $1.5199

     ↓

╔═══════════════════════════════════════════════════════════════════════════╗
║  KORAK 9: FINAL RESPONSE - Trade Completed                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

Python Code Node Output:
{
  "status": "success",
  "symbol": "RLCUSDT",
  "side": "Buy",
  "qty": "742",
  "leverage": 8,
  "entry_order_id": "1234567890abcdef",
  "sl_order_id": "SL_abcdef123456",
  "tp_order_ids": [
    "TP1_111222333",
    "TP2_444555666"
  ],
  "validation": {
    "approved": true,
    "long_count": 2,
    "short_count": 1
  }
}

     ↓

n8n Respond to Webhook → Returns success to caller

═══════════════════════════════════════════════════════════════════════════
```

## 📊 UKUPNO HTTP REQUESTOVA

| #  | Method | Endpoint                          | Svrha                     |
|----|--------|-----------------------------------|---------------------------|
| 1  | GET    | /v5/position/list                | Get current positions     |
| 2  | POST   | /v5/position/set-leverage        | Set leverage to 8x        |
| 3  | POST   | /v5/order/create                 | Entry order (Market Buy)  |
| 4  | POST   | /v5/order/create                 | Stop Loss order           |
| 5  | POST   | /v5/order/create                 | Take Profit 1 (Limit)     |
| 6  | POST   | /v5/order/create                 | Take Profit 2 (Limit)     |

**Total: 1 GET + 5 POST = 6 HTTP requests**

## 📈 FINALNO STANJE POZICIJA

### PRIJE TRADE-A:
```
┌─────────────┬──────┬────────┬──────────┐
│ Symbol      │ Side │ Size   │ Leverage │
├─────────────┼──────┼────────┼──────────┤
│ BTCUSDT     │ Buy  │ 0.1    │ 10x      │
│ ETHUSDT     │ Buy  │ 2      │ 8x       │
│ SOLUSDT     │ Sell │ 10     │ 5x       │
└─────────────┴──────┴────────┴──────────┘

LONG: 2/5 ✅
SHORT: 1/5 ✅
```

### POSLIJE TRADE-A:
```
┌─────────────┬──────┬────────┬──────────┬──────────────────────┐
│ Symbol      │ Side │ Size   │ Leverage │ Orders               │
├─────────────┼──────┼────────┼──────────┼──────────────────────┤
│ BTCUSDT     │ Buy  │ 0.1    │ 10x      │ -                    │
│ ETHUSDT     │ Buy  │ 2      │ 8x       │ -                    │
│ SOLUSDT     │ Sell │ 10     │ 5x       │ -                    │
│ 🆕 RLCUSDT  │ Buy  │ 742    │ 8x       │ SL + TP1 + TP2       │
└─────────────┴──────┴────────┴──────────┴──────────────────────┘

LONG: 3/5 ✅
SHORT: 1/5 ✅

Active Orders za RLC:
  🛡️ Stop Loss: Sell 742 @ $0.8945 (trigger)
  💰 TP1: Sell 371 @ $1.3862 (limit)
  💰 TP2: Sell 371 @ $1.5199 (limit)
```

## 🔄 EDGE CASES

### Case 1: Duplikat pozicija
```
Request: ETHUSDT (Buy)
Existing: [BTCUSDT, ETHUSDT, SOLUSDT]

Result:
{
  "status": "skipped",
  "reason": "⏭️ Position already exists for ETHUSDT"
}

HTTP Requests: 1 (samo GET positions)
```

### Case 2: Max long limit
```
Request: NEWUSDT (Buy)
Current LONG count: 5
Max LONG: 5

Result:
{
  "status": "rejected",
  "reason": "🚫 Max long positions (5/5)"
}

HTTP Requests: 1 (samo GET positions)
```

### Case 3: Short trade
```
Request: AAVEUSDT (Sell - Short)
Current SHORT count: 1
Max SHORT: 5

Execution:
  1. GET positions ✅
  2. Validate: 1/5 short ✅
  3. Set leverage ✅
  4. Entry: SELL 50 AAVE (Market)
  5. Stop Loss: BUY 50 @ $350 (trigger - opposite!)
  6. TP1: BUY 25 @ $280 (limit)
  7. TP2: BUY 25 @ $260 (limit)

HTTP Requests: 6
```

## 💡 OPTIMIZACIJE

### Batch Orders (1 request umjesto 3)
Možeš koristiti `/v5/order/create-batch` za SL + TPs:

```json
POST /v5/order/create-batch

{
  "category": "linear",
  "request": [
    { "symbol": "RLCUSDT", "side": "Sell", "orderType": "Market", "stopLoss": "0.8945", ... },
    { "symbol": "RLCUSDT", "side": "Sell", "orderType": "Limit", "price": "1.3862", ... },
    { "symbol": "RLCUSDT", "side": "Sell", "orderType": "Limit", "price": "1.5199", ... }
  ]
}
```

**Reduction: 6 requests → 4 requests** (GET + SET_LEV + ENTRY + BATCH_SL_TPS)

## 🎓 NAPOMENE

1. **Position Mode**:
   - `positionIdx: 0` = One-way mode (1 pozicija po symbolu)
   - `positionIdx: 1` = Hedge mode - Long side
   - `positionIdx: 2` = Hedge mode - Short side

2. **Reduce Only**:
   - SL i TP moraju imati `reduceOnly: true`
   - Ne može otvoriti novu poziciju u suprotnom smjeru

3. **Time In Force**:
   - Market orders: `IOC` (Immediate or Cancel)
   - Limit orders: `GTC` (Good Till Cancel) - default

4. **Order Linking**:
   - `orderLinkId` omogućava tracking u logovima
   - Format: `TP1_SYMBOL_TIMESTAMP`
