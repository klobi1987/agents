# ✅ JavaScript Inline Executor - RJEŠENJE!

## Problem sa Python verzijom

Python Code node u n8n **NE MOŽE** raditi HTTP pozive:
```
RuntimeError: Blocked for security reasons
```

---

## ✅ Rješenje: JavaScript Code Node

JavaScript Code node **MOŽE** raditi HTTP pozive pomoću `$httpRequest()`!

---

## 🔧 Setup (samo 3 koraka!)

### Korak 1: Dodaj Code Node

Nakon **IF node** (TRUE grana), dodaj:

```
Node Type: Code
Language: JavaScript
Mode: Run Once for All Items
```

---

### Korak 2: Copy-Paste Kod

**Inline Trade Executor:**
```
https://raw.githubusercontent.com/klobi1987/agents/claude/awesome-claude-skills-011CUvUCRxHcdcpZoJMTEqwu/trade-runner/inline-trade-executor.js
```

**Break Even Monitor:**
```
https://raw.githubusercontent.com/klobi1987/agents/claude/awesome-claude-skills-011CUvUCRxHcdcpZoJMTEqwu/trade-runner/break-even-monitor.js
```

Kopiraj **KOMPLETAN fajl** (450+ linija) i paste u Code node.

---

### Korak 3: Stavi API Kredencijale

Zamijeni linije 16-17 (na vrhu fajla):

```javascript
// 🔑 STAVI SVOJE BYBIT API KREDENCIJALE OVDJE:
const BYBIT_API_KEY = "tvoj_bybit_api_key_ovdje";
const BYBIT_API_SECRET = "tvoj_bybit_api_secret_ovdje";
```

---

## 🎯 Workflow

```
🎯 TRADE SELECTOR V4.0
  ↓
┌─────────────────────────┐
│ IF: Trade Selected?     │
└───────┬─────────────────┘
        │
   ┌────┴────┐
   │         │
  YES       NO
   │         │
   ↓         ↓
┌──────────────────────┐  ┌────────────┐
│ CODE (JavaScript)    │  │ No-Op      │
│ inline-executor.js   │  └────────────┘
└────────┬─────────────┘
         │
         ↓
     Success! ✅
```

**Sve u JEDNOM node-u!** 🚀

---

## 📊 Šta Kod Radi?

1. **Čita output** od Trade Selector-a
2. **Transformiše** podatke (BUY → Buy, itd.)
3. **HTTP pozivi** ka Bybit API-u:
   - Get Positions
   - Validate
   - Set Leverage
   - Place Entry Order
   - Place Stop Loss
   - Place Take Profits
4. **Vraća rezultat** sa svim order ID-ovima

---

## 📝 Input Format (od Trade Selector-a)

```json
{
  "message": "TRADE_SELECTED",
  "symbol": "RLCUSDT",
  "side": "BUY",
  "entry_price": 1.0544,
  "stop_loss": 0.8945,
  "take_profits": [
    {"price": 1.3862, "size_pct": 50, "label": "TP1"},
    {"price": 1.5199, "size_pct": 50, "label": "TP2"}
  ],
  "leverage": 8,
  "quantity": 742
}
```

---

## 📤 Output Format

```json
{
  "status": "success",
  "symbol": "RLCUSDT",
  "side": "Buy",
  "qty": "742",
  "leverage": 8,
  "entry_order_id": "1234567890abcdef",
  "sl_order_id": "SL_abcdef123456",
  "tp_order_ids": ["TP1_111222333", "TP2_444555666"],
  "validation": {
    "approved": true,
    "status": "approved",
    "long_count": 2,
    "short_count": 1
  }
}
```

---

## ⚙️ Konfiguracija

### 1. Skip Leverage

Ako već imaš leverage postavljen, promijeni liniju 411:

```javascript
skip_leverage: true  // true = skip, false = set leverage
```

### 2. Position Limits

Na vrhu fajla (linija 19-20):

```javascript
const MAX_LONG_POSITIONS = 5;   // Max broj long pozicija
const MAX_SHORT_POSITIONS = 5;  // Max broj short pozicija
```

---

## 🧪 Test Execution

1. Otvori n8n workflow
2. Klikni **Execute Workflow**
3. Provjeri output u Code node-u

Trebao bi vidjeti:

```
🔄 TRANSFORMING TRADE SELECTOR OUTPUT...
   Input: BTCUSDT BUY

✅ Transformation complete!
   Symbol: BTCUSDT
   Side: Buy
   Qty: 100
   Leverage: 5x

═══════════════════════════════════════════════════════════════
🎯 INLINE TRADE EXECUTOR - START
═══════════════════════════════════════════════════════════════
Symbol: BTCUSDT
Side: Buy
Quantity: 100
Leverage: 5x
...
```

---

## 🐛 Troubleshooting

### 1. "SyntaxError"

**Uzrok:** Nisi copy-paste-ovao kompletan kod

**Fix:** Copy **SVE** sa GitHub-a (450+ linija)

---

### 2. "Failed to get positions"

**Uzrok:** Pogrešni API kredencijali

**Fix:** Provjeri `BYBIT_API_KEY` i `BYBIT_API_SECRET`

---

### 3. "RuntimeError: Blocked for security reasons"

**Uzrok:** Koristiš **Python** Code node umjesto **JavaScript**!

**Fix:** Promijeni Language na **JavaScript** u Code node settings!

---

## ✅ Prednosti JavaScript verzije

| Feature | Python | JavaScript |
|---------|--------|------------|
| HTTP pozivi | ❌ Blokirano | ✅ Radi! |
| Jedan node | ❌ Ne | ✅ Da! |
| Jednostavnost | ❌ Komplicirano | ✅ Jednostavno! |
| Brzina | ❌ Sporo | ✅ Brzo! |

---

## 📚 Fajlovi

- **inline-trade-executor.js** - Glavni executor (450+ linija)
- **break-even-monitor.js** - Break even monitor (300+ linija)
- **JAVASCRIPT-SETUP.md** - Ovaj fajl

---

## 🚀 TL;DR

1. **Code node** (JavaScript)
2. **Copy-paste** kompletan kod sa GitHub-a
3. **Stavi kredencijale** na vrhu (linija 16-17)
4. **Execute!** ✅

**Gotovo!** Sve radi u jednom node-u! 🎉
