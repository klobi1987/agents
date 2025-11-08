# 🔧 n8n Break Even Monitor - Complete Setup

## 📊 Workflow Overview

```
┌──────────────────┐
│  Schedule        │  Every 30 seconds
│  Trigger         │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Python Code     │  Break Even Monitor
│  Node            │  - Check all positions
│                  │  - Detect TP1 filled
│                  │  - Move SL to entry
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  IF Node         │  Any SL moved?
│  (Optional)      │
└────┬────────┬────┘
     │        │
    YES      NO
     │        │
     ↓        ↓
┌─────────┐ ┌─────────┐
│ Telegram│ │  No-Op  │
│ Alert   │ │         │
└─────────┘ └─────────┘
```

---

## 🔨 Step-by-Step Setup

### Step 1: Create New Workflow

1. U n8n, klikni **"Add workflow"**
2. Naziv: `Bybit Break Even Monitor`

---

### Step 2: Add Schedule Trigger

**Node Type**: `Schedule Trigger`

**Settings**:
```
Trigger Interval: Seconds
Seconds Between Triggers: 30
```

**Kada pokreće**: Svaki 30 sekundi

---

### Step 3: Add Python Code Node

**Node Type**: `Code`

**Settings**:
```
Name: Break Even Monitor
Mode: Run Once for All Items
Language: Python
```

**Code**: Kopiraj kompletan kod iz `break-even-monitor.py`

**Environment Variables** (dodaj u n8n Settings):
```bash
BYBIT_API_KEY=your_api_key_here
BYBIT_API_SECRET=your_api_secret_here
```

---

### Step 4: (Optional) Add IF Node

**Node Type**: `IF`

**Settings**:
```
Name: Check if SL Moved
Condition: {{ $json.moved_to_breakeven > 0 }}
```

Ovo provjerava da li je bilo pozicija gdje je SL pomjeren.

---

### Step 5: (Optional) Add Telegram Notification

#### 5a. If TRUE → Telegram

**Node Type**: `Telegram`

**Settings**:
```
Resource: Message
Operation: Send Text Message
Chat ID: your_telegram_chat_id
```

**Message Text**:
```javascript
🎯 BREAK EVEN TRIGGERED!

{{ $json.results
  .filter(r => r.action === "moved_to_breakeven")
  .map(r => `
Symbol: ${r.symbol}
Entry: $${r.entry_price.toFixed(4)}
Old SL: $${r.old_sl.toFixed(4)}
New SL: $${r.new_sl.toFixed(4)} ✅
TP1: $${r.tp1_price.toFixed(4)}
  `)
  .join("\n---\n")
}}

Your positions are now risk-free! 🚀
```

#### 5b. If FALSE → No Operation

**Node Type**: `No Operation, do nothing`

---

## 📊 Testing

### Test 1: Manual Execution

1. Aktiviraj workflow
2. Klikni **"Execute Workflow"** (ili čekaj 30s)
3. Pogledaj Output u **"Break Even Monitor"** node

**Expected Output** (bez TP1 filled):
```json
{
  "status": "success",
  "timestamp": 1730999500000,
  "positions_checked": 2,
  "moved_to_breakeven": 0,
  "waiting": 2,
  "errors": 0,
  "results": [
    {
      "symbol": "RLCUSDT",
      "action": "waiting",
      "tp1_status": "New",
      "tp1_filled": "0/371"
    },
    {
      "symbol": "ETHUSDT",
      "action": "waiting",
      "tp1_status": "New",
      "tp1_filled": "0/2"
    }
  ]
}
```

### Test 2: Simulacija TP1 Hit

Da testiraš funkcionalnost:

1. Otvori poziciju (via Trade Runner)
2. Čekaj da market cijena dosegne TP1
3. Monitor će automatski detektovati i pomjeriti SL

**Expected Output** (TP1 filled):
```json
{
  "status": "success",
  "timestamp": 1730999600000,
  "positions_checked": 1,
  "moved_to_breakeven": 1,
  "waiting": 0,
  "errors": 0,
  "results": [
    {
      "symbol": "RLCUSDT",
      "action": "moved_to_breakeven",
      "entry_price": 1.0544,
      "old_sl": 0.8945,
      "new_sl": 1.0544,
      "tp1_price": 1.3862
    }
  ]
}
```

---

## 🎛️ Configuration

### Monitoring Interval

**Conservative** (manje API calls):
```
Seconds Between Triggers: 60
```

**Balanced** (preporučeno):
```
Seconds Between Triggers: 30
```

**Aggressive**:
```
Seconds Between Triggers: 15
```

### Break Even Offset

Ako želiš da SL bude malo iznad entry-a (garantuje profit):

Edituj `break-even-monitor.py`:
```python
# Line 28
BREAK_EVEN_OFFSET = 0.005  # +0.5% above entry
```

Primjer:
- Entry: $1.00
- Break Even SL: $1.005 (+0.5%)

---

## 📈 Real-World Example

### Scenario: RLC Trade

**Initial State:**
```
Symbol: RLCUSDT
Side: Buy (Long)
Entry: $1.0544
Size: 742 RLC
Leverage: 8x

Orders:
- SL: $0.8945 (-15.17%)
- TP1: $1.3862 (+31.44%) - 371 RLC (50%)
- TP2: $1.5199 (+44.12%) - 371 RLC (50%)
```

**Market moves up...**
```
Price: $1.38 → TP1 HIT! ✅
```

**Monitor detects (next 30s cycle):**
```
🔍 Checking RLCUSDT...
   TP1: $1.3862 | Status: Filled | Filled: 371/371
   ✅ TP1 FILLED! Checking SL...
   Current SL: $0.8945 | Status: Untriggered
   🔄 Modifying SL order → $1.0544
   ✅ SL modified to break even @ $1.0544
   🎯 SUCCESS: SL moved to break even!
```

**New State:**
```
Symbol: RLCUSDT
Side: Buy (Long)
Entry: $1.0544
Size: 371 RLC (50% closed via TP1)

Orders:
- SL: $1.0544 (BREAK EVEN) ✅
- TP2: $1.5199 (+44.12%) - 371 RLC (50%)

Profit locked: +$123.45 (from TP1)
Risk: $0 (SL at entry) 🚀
```

---

## 🔔 Notification Examples

### Telegram Message:
```
🎯 BREAK EVEN TRIGGERED!

Symbol: RLCUSDT
Entry: $1.0544
Old SL: $0.8945
New SL: $1.0544 ✅
TP1: $1.3862

Your position is now risk-free! 🚀

Timestamp: 2025-11-08 14:30:15
```

### Discord Webhook:
```json
{
  "content": "🎯 Break Even Triggered!",
  "embeds": [{
    "title": "RLCUSDT",
    "color": 5814783,
    "fields": [
      {"name": "Entry", "value": "$1.0544", "inline": true},
      {"name": "Old SL", "value": "$0.8945", "inline": true},
      {"name": "New SL", "value": "$1.0544 ✅", "inline": true},
      {"name": "TP1 Price", "value": "$1.3862", "inline": true},
      {"name": "Status", "value": "Risk-Free 🚀", "inline": false}
    ]
  }]
}
```

---

## 🐛 Troubleshooting

### 1. "Failed to get positions"

**Uzrok**: API key invalid ili nema Read permission

**Fix**:
- Provjeri `BYBIT_API_KEY` i `BYBIT_API_SECRET`
- Provejri API key permissions: Read ✅, Trade ✅

---

### 2. "Failed to modify SL"

**Uzrok**: SL order već triggered ili cancelled

**Fix**:
- Monitor će automatski skip-ovati
- Check n8n logs za detalje

---

### 3. "No TP1 order found"

**Uzrok**: TP1 nije kreiran ili je već filled + cancelled

**Fix**:
- Normalno ponašanje ako nemaš TP1 order
- Proveri da Trade Runner pravilno kreira TP1 sa `orderLinkId` koji sadrži "TP1"

---

### 4. Monitor ne detektuje TP1 filled

**Uzrok**: `orderLinkId` ne sadrži "TP1"

**Fix**:
U Trade Runner, provjeri da TP1 order ima pravilno ime:
```python
order_link_id = f"TP1_{symbol}_{int(time.time() * 1000)}"
```

---

## 📊 Performance

### API Calls per Cycle:

Sa **3 open pozicije**:
```
1. GET /v5/position/list → 1 call
2. GET /v5/order/realtime (RLC) → 1 call
3. GET /v5/order/realtime (ETH) → 1 call
4. GET /v5/order/realtime (BTC) → 1 call
5. POST /v5/order/amend (if TP1 filled) → 0-3 calls

Total: 4-7 API calls / 30s = OK
```

Bybit rate limit: **50 req/sec** → Sigurno!

---

## 💡 Advanced Features

### Feature 1: Progressive SL Movement

Pomjeraj SL sa svakim TP-om:
```python
# TP1 filled → SL to entry (break even)
# TP2 filled → SL to TP1 price (lock profit from TP1)
# TP3 filled → SL to TP2 price (lock more profit)
```

### Feature 2: Trailing Stop

Nakon TP1, umjesto fiksnog SL na entry, koristi trailing stop:
```python
# Trail SL 5% below current price
trailing_sl = current_price * 0.95
```

### Feature 3: Partial TP1

Pomjeri SL čak i ako je TP1 samo **parcijalno** filled:
```python
if tp1_filled_qty >= (tp1_total_qty * 0.5):  # 50%+ filled
    # Move SL to break even
```

---

## ✅ Quick Start Checklist

- [ ] Kreiraj novi n8n workflow
- [ ] Dodaj Schedule Trigger (30s)
- [ ] Dodaj Python Code node (kopiraj kod)
- [ ] Dodaj environment variables (API credentials)
- [ ] (Optional) Dodaj IF + Telegram notification
- [ ] Aktiviraj workflow
- [ ] Test sa jednom pozicijom
- [ ] Monitor logs u n8n
- [ ] Otvori poziciju i čekaj TP1
- [ ] Verifikuj da SL pomjeren na Bybit-u ✅
- [ ] Gotovo! 🎉

---

## 🎓 Best Practices

1. **Test na Testnet-u prvo**
   - Bybit Testnet: https://testnet.bybit.com
   - Change `BYBIT_API_URL` u kodu

2. **Monitor samo aktivne pozicije**
   - Kod već filtrira: `size > 0`

3. **Log svi actions**
   - n8n automatski čuva execution history
   - Review logs periodično

4. **Rate limiting**
   - 30s interval je safe za 10+ pozicija

5. **Error handling**
   - Monitor nastavlja sa radom čak i sa error-om na jednom symbolu

---

## 📚 Resources

- **Bybit V5 API Docs**: https://bybit-exchange.github.io/docs/v5/position/modify-order
- **n8n Docs**: https://docs.n8n.io/
- **Telegram Bot Setup**: https://core.telegram.org/bots

---

## 🚀 Ready to Go!

Completan setup - sve što trebaš je:
1. Kopiraj kod
2. Aktiviraj workflow
3. Profit! 💰
