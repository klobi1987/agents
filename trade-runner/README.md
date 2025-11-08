# 🚀 Bybit Trade Runner & Break Even Monitor

Kompletan automatizovan trading sistem za Bybit futures sa n8n integracijom.

## 📦 Šta sadrži?

### 1. **Trade Runner** - Automatsko izvršavanje trade-ova
Plasira pozicije sa Stop Loss i multiple Take Profit orderima.

### 2. **Break Even Monitor** - Risk-free pozicije
Automatski pomjera SL na entry price kada se TP1 izvrši.

---

## 🎯 Trade Runner

### Features:
✅ Position validation (max 5 long / 5 short)
✅ Duplicate position check
✅ Optional leverage setting
✅ Market entry orders
✅ Stop Loss (Market trigger)
✅ Multiple Take Profits (Limit orders)

### Files:
- `n8n-complete-trade-runner.py` - Kompletan Python kod
- `FLOW-DIAGRAM.md` - HTTP request breakdown
- `N8N-SETUP-GUIDE.md` - Setup instrukcije
- `INTEGRATION-EXAMPLE.md` - Integracija sa postojećim workflow-om

### Quick Setup:

```
┌──────────────┐
│   Webhook    │ ← POST /webhook/trade
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Python Code  │ ← Trade Runner
│              │   - Validates position
│              │   - Sets leverage (optional)
│              │   - Places entry + SL + TPs
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Respond    │ ← Returns order IDs
└──────────────┘
```

### Input Example:
```json
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
  "skip_leverage": true
}
```

### Output Example:
```json
{
  "status": "success",
  "entry_order_id": "1234567890",
  "sl_order_id": "SL_abc123",
  "tp_order_ids": ["TP1_111", "TP2_222"]
}
```

---

## 🎯 Break Even Monitor

### Features:
✅ Automatski monitoring svakih 30 sekundi
✅ Detektuje kada je TP1 filled
✅ Pomjera SL na entry price (break even)
✅ Telegram/Discord notifikacije
✅ Multi-position support

### Files:
- `break-even-monitor.py` - Kompletan Python kod
- `break-even-strategy.md` - Strategija i objašnjenje
- `break-even-n8n-setup.md` - Setup instrukcije

### Quick Setup:

```
┌──────────────┐
│   Schedule   │ ← Every 30 seconds
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Python Code  │ ← Break Even Monitor
│              │   - Get all positions
│              │   - Check if TP1 filled
│              │   - Modify SL → entry price
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Telegram     │ ← Notification (optional)
│ Alert        │
└──────────────┘
```

### How It Works:

**Before TP1:**
```
Entry: $1.00
SL: $0.85 (-15%)
TP1: $1.30 (50% qty)
TP2: $1.50 (50% qty)

Risk: -$15 per coin
```

**After TP1 Hit:**
```
Entry: $1.00
SL: $1.00 (BREAK EVEN) ✅
TP2: $1.50 (remaining 50%)

Risk: $0 🚀
Profit locked: +$15 (from TP1)
```

---

## 🔧 Installation

### Prerequisites:
- n8n instance (self-hosted or cloud)
- Bybit API key with permissions: Read, Trade, Position
- Python support in n8n (built-in)

### Step 1: Environment Variables

Dodaj u n8n Settings → Environment Variables:
```bash
BYBIT_API_KEY=your_api_key_here
BYBIT_API_SECRET=your_api_secret_here
```

### Step 2: Trade Runner Workflow

1. Create new workflow: `Bybit Trade Runner`
2. Add Webhook node (path: `/trade`)
3. Add Code node (Python)
   - Copy code from `n8n-complete-trade-runner.py`
4. Add Respond to Webhook node
5. Activate workflow

### Step 3: Break Even Monitor Workflow

1. Create new workflow: `Bybit Break Even Monitor`
2. Add Schedule Trigger (30 seconds)
3. Add Code node (Python)
   - Copy code from `break-even-monitor.py`
4. (Optional) Add IF + Telegram notification
5. Activate workflow

---

## 📊 Complete System Flow

```
═══════════════════════════════════════════════════════════
TRADING WORKFLOW
═══════════════════════════════════════════════════════════

Trade Selector (from your crypto bot)
  ↓
POST /webhook/trade → TRADE RUNNER
  │
  ├─ Validate position (5/5 limit)
  ├─ Check duplicate
  ├─ Set leverage (optional)
  ├─ Place entry order
  ├─ Place stop loss
  └─ Place TP1, TP2, TP3
  ↓
✅ Position opened with SL + TPs

═══════════════════════════════════════════════════════════
RISK MANAGEMENT (Parallel)
═══════════════════════════════════════════════════════════

BREAK EVEN MONITOR (runs every 30s)
  │
  ├─ Get all open positions
  ├─ For each position:
  │   ├─ Check if TP1 is filled
  │   └─ If YES → Move SL to entry price
  │
  └─ Send notification
  ↓
✅ Position becomes risk-free after TP1!
```

---

## 🧪 Testing

### Test Trade Runner:

```bash
curl -X POST http://your-n8n.com/webhook/trade \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RLCUSDT",
    "side": "Buy",
    "qty": "10",
    "leverage": 5,
    "stop_loss": "0.90",
    "take_profits": [
      {"price": "1.20", "size_pct": 50, "label": "TP1"},
      {"price": "1.40", "size_pct": 50, "label": "TP2"}
    ],
    "position_idx": 0,
    "skip_leverage": false
  }'
```

### Test Break Even Monitor:

1. Aktiviraj Break Even Monitor workflow
2. Klikni "Execute Workflow" ili čekaj 30s
3. Check n8n logs za output

---

## 📚 Documentation

### Trade Runner:
- [FLOW-DIAGRAM.md](FLOW-DIAGRAM.md) - Detaljan breakdown HTTP requesta
- [N8N-SETUP-GUIDE.md](N8N-SETUP-GUIDE.md) - Setup i troubleshooting
- [INTEGRATION-EXAMPLE.md](INTEGRATION-EXAMPLE.md) - Integracija sa crypto workflow-om

### Break Even Monitor:
- [break-even-strategy.md](break-even-strategy.md) - Strategija i pristup
- [break-even-n8n-setup.md](break-even-n8n-setup.md) - n8n setup instrukcije

---

## ⚙️ Configuration

### Trade Runner:

**Position Limits:**
```python
MAX_LONG_POSITIONS = 5
MAX_SHORT_POSITIONS = 5
```

**Skip Leverage:**
```json
{
  "skip_leverage": true
}
```

### Break Even Monitor:

**Monitoring Interval:**
```
Schedule: 30 seconds (recommended)
```

**Break Even Offset:**
```python
BREAK_EVEN_OFFSET = 0.000  # Exact entry
# or
BREAK_EVEN_OFFSET = 0.005  # +0.5% above entry (guaranteed profit)
```

---

## 🔐 Security

### API Permissions (Bybit):
- ✅ **Read** - za GET positions
- ✅ **Trade** - za POST orders
- ✅ **Position** - za set leverage

### Best Practices:
1. **Testnet prvo** - Testiraj na Bybit Testnet
2. **Environment variables** - Nikad ne hard-kodiraj API keys
3. **IP whitelist** - Ograniči Bybit API key na poznate IP-ove
4. **Webhook auth** - Dodaj Basic Auth na n8n webhook
5. **Rate limiting** - Respektuj Bybit limits (50 req/sec)

---

## 🐛 Troubleshooting

### Trade Runner:

**"Failed to get positions"**
- Provjeri API key permissions
- Provjeri API secret (bez trailing spaces)

**"Max long positions (5/5)"**
- Zatvori neku poziciju ili povećaj limit u kodu

**"Position already exists"**
- Normalno - duplicate pozicija se automatski preskače

### Break Even Monitor:

**"No TP1 order found"**
- Provjeri da Trade Runner kreira TP1 sa `orderLinkId` koji sadrži "TP1"

**"Failed to modify SL"**
- SL order već triggered ili cancelled
- Monitor automatski skip-uje ovaj symbol

---

## 📊 Performance

### API Calls:

**Trade Runner** (per execution):
- GET positions: 1 call
- SET leverage: 1 call (optional)
- Entry order: 1 call
- Stop Loss: 1 call
- TP1: 1 call
- TP2: 1 call
**Total: 5-6 calls**

**Break Even Monitor** (per 30s cycle):
- GET positions: 1 call
- GET orders per symbol: 1-10 calls (depends on open positions)
- Modify SL: 0-5 calls (only if TP1 filled)
**Total: 2-15 calls / 30s**

Bybit rate limit: **50 req/sec** → Safe! ✅

---

## 💡 Advanced Features

### 1. Trailing Stop Loss
Nakon TP1, umjesto fiksnog break even, koristi trailing:
```python
trailing_sl = current_price * 0.95  # 5% trail
```

### 2. Progressive SL Movement
```python
# TP1 filled → SL to entry
# TP2 filled → SL to TP1 price
# TP3 filled → SL to TP2 price
```

### 3. Partial TP Support
```python
# Move SL if TP1 is 50%+ filled
if tp1_filled_qty >= (tp1_total_qty * 0.5):
    # Move SL
```

---

## 📈 Real-World Example

### Initial State:
```
Symbol: RLCUSDT
Entry: $1.0544 @ 8x leverage
Size: 742 RLC
Capital: 75 USDT
Exposure: 600 USDT

Orders:
- SL: $0.8945 (-15.17%) → Risk: -11.4 USDT
- TP1: $1.3862 (+31.44%) - 371 RLC (50%)
- TP2: $1.5199 (+44.12%) - 371 RLC (50%)
```

### After TP1 Hit:
```
Symbol: RLCUSDT
Entry: $1.0544
Size: 371 RLC (50% remaining)

Orders:
- SL: $1.0544 (BREAK EVEN) ✅
- TP2: $1.5199 (+44.12%) - 371 RLC

Profit locked: +$123.18 (from TP1)
Risk: $0 🚀
```

### After TP2 Hit:
```
Position closed!

Total profit: +$296.45
ROI: +395% (on 75 USDT capital)
Risk taken: $0 (after TP1)
```

---

## ✅ Quick Start Checklist

**Trade Runner:**
- [ ] Dodaj environment variables (API key/secret)
- [ ] Kreiraj webhook workflow
- [ ] Kopiraj Trade Runner Python kod
- [ ] Testiraj sa curl request
- [ ] Verifikuj poziciju na Bybit-u
- [ ] Integriraj sa Trade Selector-om

**Break Even Monitor:**
- [ ] Kreiraj schedule workflow (30s)
- [ ] Kopiraj Break Even Monitor Python kod
- [ ] (Optional) Dodaj Telegram notifikaciju
- [ ] Aktiviraj workflow
- [ ] Testiraj sa realnom pozicijom
- [ ] Verifikuj SL adjustment

---

## 🤝 Contributing

Slobodno submit-uj improvements via Pull Request!

---

## 📄 License

MIT License - Feel free to use and modify!

---

## 🎓 Support

Za pitanja ili probleme:
1. Provjeri documentation u ovom folderu
2. Review n8n execution logs
3. Check Bybit API status: https://bybit-exchange.github.io/docs/v5/intro

---

## 🚀 Let's Go!

Sve je ready - samo kopiraj kod, aktiviraj workflow-e, i trade! 💰
