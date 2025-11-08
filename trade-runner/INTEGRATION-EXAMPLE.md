# 🔗 Integration sa Existing n8n Crypto Workflow

## 📊 Kako spojiti Trade Selector → Trade Runner

Tvoj trenutni workflow:
```
⏰ Scheduler
  ↓
📊 Bybit Tickers
  ↓
🌙 LunarCrush Data
  ↓
🧠 ADAPTIVE ENGINE v8
  ↓
📈 Multi-TF Analysis (15m/1h/4h)
  ↓
⭐ RATING NODE ULTIMATE V2
  ↓
🎯 TRADE SELECTOR V4.0
  ↓
❓ Kako spojiti sa Trade Runner?
```

---

## 🔌 Solution: HTTP Request Node

Dodaj **HTTP Request node** nakon Trade Selector-a:

```
🎯 TRADE SELECTOR V4.0
  ↓
📤 HTTP Request → POST /webhook/trade (Trade Runner)
  ↓
✅ Response → Log rezultat
```

---

## 📝 Node Configuration

### Node: HTTP Request to Trade Runner

**Settings:**
```javascript
Name: Execute Trade
Method: POST
URL: https://your-n8n.com/webhook/trade
```

**Headers:**
```javascript
Content-Type: application/json
```

**Body (JSON):**
```javascript
{
  "symbol": "{{ $json.symbol }}",
  "side": "{{ $json.side }}",
  "qty": "{{ $json.quantity }}",
  "leverage": {{ $json.leverage }},
  "stop_loss": "{{ $json.stop_loss }}",
  "take_profits": {{ JSON.stringify($json.take_profits) }},
  "position_idx": {{ $json.position_idx || 0 }},
  "skip_leverage": true,
  "api_key": "{{ $env.BYBIT_API_KEY }}",
  "api_secret": "{{ $env.BYBIT_API_SECRET }}"
}
```

---

## 🎯 Mapping Trade Selector Output → Trade Runner Input

### Trade Selector V4.0 Output:
```json
{
  "message": "TRADE_SELECTED",
  "symbol": "RLCUSDT",
  "bybit_symbol": "RLCUSDT",
  "base": "RLC",
  "side": "BUY",
  "entry_price": 1.0544,
  "stop_loss": 0.8945,
  "stop_loss_pct": -15.17,
  "take_profit_1": 1.3862,
  "take_profit_1_pct": 31.44,
  "take_profit_2": 1.5199,
  "take_profit_2_pct": 44.12,
  "take_profits": [
    {
      "price": 1.3862,
      "distance_pct": 31.44,
      "size_pct": 50,
      "label": "TP1"
    },
    {
      "price": 1.5199,
      "distance_pct": 44.12,
      "size_pct": 50,
      "label": "TP2"
    }
  ],
  "leverage": 8,
  "position_size_usdt": 75,
  "position_exposure_usdt": 600,
  "quantity": 742,
  "liquidation_price": 0.9235,
  "liq_buffer_pct": 12.39,
  "alpha": 142.5,
  "conviction": "EXTREME"
}
```

### Trade Runner Input Mapping:
```javascript
{
  // Direct mappings
  "symbol": $json.bybit_symbol,           // "RLCUSDT"
  "side": $json.side === "BUY" ? "Buy" : "Sell",  // Convert BUY → Buy
  "qty": String($json.quantity),          // "742"
  "leverage": $json.leverage,             // 8
  "stop_loss": String($json.stop_loss),   // "0.8945"

  // Take Profits array - already formatted!
  "take_profits": $json.take_profits,     // [{price: "1.3862", size_pct: 50, label: "TP1"}, ...]

  // Position mode
  "position_idx": 0,  // One-way mode

  // Skip leverage (već postavljen)
  "skip_leverage": true,

  // API credentials (from environment)
  "api_key": $env.BYBIT_API_KEY,
  "api_secret": $env.BYBIT_API_SECRET
}
```

---

## 🔧 Code Node za Transformaciju

Ako želiš eksplicitnu transformaciju, dodaj **Code node**:

```javascript
// Input: Trade Selector output
const trade = $input.item.json;

// Transform BUY/SELL → Buy/Sell (Bybit format)
const bybitSide = trade.side === "BUY" ? "Buy" : "Sell";

// Output for Trade Runner
return [{
  json: {
    symbol: trade.bybit_symbol,
    side: bybitSide,
    qty: String(trade.quantity),
    leverage: trade.leverage,
    stop_loss: String(trade.stop_loss),
    take_profits: trade.take_profits,
    position_idx: 0,
    skip_leverage: true,
    api_key: $env.BYBIT_API_KEY,
    api_secret: $env.BYBIT_API_SECRET
  }
}];
```

---

## 🔀 IF Node za Filter

Dodaj **IF node** prije HTTP Request-a da filtriš samo approved trade-ove:

```javascript
Condition: {{ $json.message === "TRADE_SELECTED" }}

TRUE → Execute Trade (HTTP Request)
FALSE → No Operation (skip)
```

---

## 📊 Complete Flow

```
🎯 TRADE SELECTOR V4.0
  ↓
┌─────────────────────┐
│ IF: Trade Selected? │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
   YES         NO
    │           │
    ↓           ↓
┌─────────┐  ┌────────────┐
│ Transform│  │ No Operation│
│ (Code)   │  └────────────┘
└────┬────┘
     │
     ↓
┌──────────────────────┐
│ HTTP Request         │
│ POST /webhook/trade  │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│ Response Handler     │
│ (Log/Notify)         │
└──────────────────────┘
```

---

## 📝 Complete n8n Code Node (Transform + Execute)

```javascript
/**
 * Transform Trade Selector output → Trade Runner input
 * Then execute trade via HTTP request
 */

const trade = $input.item.json;

// Check if trade was selected
if (trade.message !== "TRADE_SELECTED") {
  console.log("⏭️ No trade selected, skipping");
  return [];
}

// Transform data
const bybitSide = trade.side === "BUY" ? "Buy" : "Sell";

const tradePayload = {
  symbol: trade.bybit_symbol,
  side: bybitSide,
  qty: String(trade.quantity),
  leverage: trade.leverage,
  stop_loss: String(trade.stop_loss),
  take_profits: trade.take_profits,
  position_idx: 0,
  skip_leverage: true,
  api_key: $env.BYBIT_API_KEY,
  api_secret: $env.BYBIT_API_SECRET
};

// Execute trade via HTTP
const axios = require('axios');

try {
  const response = await axios.post(
    'https://your-n8n.com/webhook/trade',
    tradePayload,
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  console.log("✅ Trade executed:", response.data);

  return [{
    json: {
      original_signal: trade,
      trade_execution: response.data,
      status: "success"
    }
  }];

} catch (error) {
  console.error("❌ Trade execution failed:", error.message);

  return [{
    json: {
      original_signal: trade,
      error: error.message,
      status: "failed"
    }
  }];
}
```

---

## 🔔 Notification na Error

Dodaj **Telegram/Discord/Email node** za notifikacije:

```
HTTP Request (Execute Trade)
  ↓
IF: Status === "error"
  │
  ├─ TRUE → Send Telegram Alert
  │
  └─ FALSE → Success Log
```

---

## 📈 Example Output

### Success:
```json
{
  "original_signal": {
    "symbol": "RLCUSDT",
    "side": "BUY",
    "quantity": 742,
    "alpha": 142.5
  },
  "trade_execution": {
    "status": "success",
    "entry_order_id": "1234567890abcdef",
    "sl_order_id": "SL_abcdef123456",
    "tp_order_ids": ["TP1_111222", "TP2_333444"]
  },
  "status": "success"
}
```

### Skipped (Duplicate):
```json
{
  "original_signal": {...},
  "trade_execution": {
    "status": "skipped",
    "reason": "⏭️ Position already exists for RLCUSDT"
  },
  "status": "success"
}
```

### Error:
```json
{
  "original_signal": {...},
  "error": "Failed to place entry order: Insufficient margin",
  "status": "failed"
}
```

---

## 🎓 Best Practices

### 1. Retry Logic
Dodaj **Error Trigger** sa retry-om:

```javascript
Retry on Fail: 2 times
Retry Interval: 5 seconds
```

### 2. Logging
Spremi sve trade execution results u database/Google Sheets:

```
Execute Trade
  ↓
IF: Success or Skipped
  │
  └─ Append to Google Sheets (Trade Log)
```

### 3. Rate Limiting
Dodaj **Wait node** između trade-ova:

```javascript
Wait: 2 seconds
```

### 4. Conditional Execution
Samo execute trade ako je alpha > threshold:

```javascript
IF: {{ $json.alpha >= 100 && $json.trade_score >= 70 }}
```

---

## 🔄 Full Workflow Visualization

```
╔═══════════════════════════════════════════════════════════════╗
║  EXISTING WORKFLOW                                            ║
╚═══════════════════════════════════════════════════════════════╝

⏰ Scheduler (Every minute)
  ↓
📊 Fetch Bybit Tickers (900+ coins)
  ↓
🌙 Fetch LunarCrush Data
  ↓
🔗 Merge Tickers + Social
  ↓
🧠 ADAPTIVE ENGINE v8 (Top 50 selection)
  ↓
📈 Get Kline Data (15m/1h/4h) - Parallel
  │
  ├─ proces 15min → Volume Profile + TA
  ├─ proces 1h → Volume Profile + TA
  └─ proces 4h → Volume Profile + TA
  ↓
🔗 Merge All TA Data
  ↓
⭐ RATING NODE ULTIMATE V2 (BTC regime + position sizing)
  ↓
🎯 TRADE SELECTOR V4.0 (A+ setups only)

╔═══════════════════════════════════════════════════════════════╗
║  NEW: TRADE EXECUTION                                         ║
╚═══════════════════════════════════════════════════════════════╝

  ↓
┌─────────────────────────┐
│ IF: Trade Selected?     │
│ ($json.message ===      │
│  "TRADE_SELECTED")      │
└───────┬─────────────────┘
        │
   ┌────┴────┐
   │         │
  YES       NO
   │         │
   ↓         ↓
┌────────┐ ┌──────────────┐
│Transform│ │ No Operation │
│ Data   │ └──────────────┘
└───┬────┘
    │
    ↓
┌─────────────────────────┐
│ HTTP Request            │
│ POST /webhook/trade     │
│                         │
│ → Trade Runner workflow │
│   (separate n8n flow)   │
└───────┬─────────────────┘
        │
        ↓
┌─────────────────────────┐
│ Trade Runner Response   │
│ - success               │
│ - skipped               │
│ - rejected              │
│ - error                 │
└───────┬─────────────────┘
        │
        ↓
┌─────────────────────────┐
│ IF: Status check        │
└───────┬─────────────────┘
        │
   ┌────┴─────┐
   │          │
 Error      Success
   │          │
   ↓          ↓
┌────────┐ ┌─────────────┐
│Telegram│ │ Log to      │
│Alert   │ │ Google      │
│        │ │ Sheets      │
└────────┘ └─────────────┘
```

---

## ✅ Final Checklist

- [ ] Trade Selector djeluje (testiran sa tvoje stranice)
- [ ] Dodaj IF node za filter ("TRADE_SELECTED")
- [ ] Dodaj Code node za transformaciju (BUY → Buy)
- [ ] Dodaj HTTP Request node → Trade Runner webhook
- [ ] Dodaj Response Handler (IF node za success/error)
- [ ] Dodaj Notification (Telegram/Discord/Email)
- [ ] Dodaj Logging (Google Sheets/Database)
- [ ] Testiraj end-to-end sa small qty
- [ ] Monitor execution logs
- [ ] Go live! 🚀
