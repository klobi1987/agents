# 🔗 Inline Trade Executor - Direktno u workflow-u

## Šta je ovo?

**Inline Trade Executor** je Python Code node koji se stavlja **direktno u tvoj postojeći crypto workflow** - nakon **Trade Selector** node-a.

**NE koristi webhook!** Sve se izvršava u istom workflow-u.

---

## 📊 Flow Dijagram

```
TVOJ POSTOJEĆI WORKFLOW:
═══════════════════════════════════════════════════════════

⏰ Scheduler (Every minute)
  ↓
📊 Bybit Tickers
  ↓
🌙 LunarCrush Data
  ↓
🔗 Merge Data
  ↓
🧠 ADAPTIVE ENGINE v8
  ↓
📈 Multi-TF Analysis (15m/1h/4h)
  ↓
⭐ RATING NODE ULTIMATE V2
  ↓
🎯 TRADE SELECTOR V4.0
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
   ↓         └─ No Operation
┌──────────────────────────┐
│ 🆕 INLINE TRADE EXECUTOR │  ← OVDJE DODAJEŠ NOVI NODE!
│ (Python Code)            │
│                          │
│ - Transformiše data      │
│ - Validates positions    │
│ - Places orders          │
│ - Sets SL + TPs          │
└──────────────────────────┘
```

---

## 🔧 Kako dodati?

### Korak 1: Dodaj IF Node (ako ga nemaš)

**Nakon Trade Selector** node-a, dodaj **IF node**:

```
Node: IF
Name: Trade Selected?

Condition:
  {{ $json.message === "TRADE_SELECTED" }}
```

To dijeli flow na 2 puta:
- **TRUE** → Nastavi sa trade-om
- **FALSE** → Skip (No Operation)

---

### Korak 2: Dodaj Python Code Node

**Na TRUE grani IF node-a**, dodaj **Code node**:

```
Node Type: Code
Name: Inline Trade Executor
Language: Python
Mode: Run Once for All Items
```

---

### Korak 3: Kopiraj Kompletan Kod

**Otvori fajl:**
```
https://raw.githubusercontent.com/klobi1987/agents/claude/awesome-claude-skills-011CUvUCRxHcdcpZoJMTEqwu/trade-runner/inline-trade-executor.py
```

**Ili lokalno:**
```bash
cat trade-runner/inline-trade-executor.py
```

**Kopiraj SVE** (580+ linija) i paste u Code node.

---

### Korak 4: Provjeri Environment Variables

Kod automatski čita:
```python
api_key = $env.BYBIT_API_KEY or $env.bybit_api_key
api_secret = $env.BYBIT_API_SECRET or $env.bybit_api_secret
```

**Provjeri da imaš u n8n Settings → Variables:**
- `BYBIT_API_KEY`
- `BYBIT_API_SECRET`

---

### Korak 5: (Optional) Dodaj Response Handler

Nakon **Inline Trade Executor**, dodaj još jedan **IF node** za success/error:

```
Node: IF
Name: Check Result

Condition:
  {{ $json.status === "success" }}

TRUE → Log Success / Send Telegram
FALSE → Log Error / Alert
```

---

## 📊 Complete Workflow

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
┌──────────────────┐  ┌────────────┐
│ INLINE EXECUTOR  │  │ No-Op      │
│ (Python Code)    │  └────────────┘
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ IF: Success?     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
   OK       ERROR
    │         │
    ↓         ↓
┌─────────┐ ┌─────────┐
│ Telegram│ │ Alert   │
│ Success │ │ Error   │
└─────────┘ └─────────┘
```

---

## 📝 Input Format (od Trade Selector-a)

Inline Executor automatski čita Trade Selector output:

```json
{
  "message": "TRADE_SELECTED",
  "symbol": "RLCUSDT",
  "bybit_symbol": "RLCUSDT",
  "side": "BUY",
  "entry_price": 1.0544,
  "stop_loss": 0.8945,
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
  "quantity": 742,
  "alpha": 142.5,
  "conviction": "EXTREME"
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
  "tp_order_ids": [
    "TP1_111222333",
    "TP2_444555666"
  ],
  "validation": {
    "approved": true,
    "status": "approved",
    "long_count": 2,
    "short_count": 1
  },
  "original_selector_output": {...}
}
```

---

## 🎛️ Konfiguracija

### 1. Skip Leverage

Ako već imaš leverage postavljen, promijeni liniju 386:

```python
"skip_leverage": True,  # True = skip, False = set leverage
```

### 2. Position Limits

Promijeni na vrhu fajla (linija 21-22):

```python
MAX_LONG_POSITIONS = 5   # Max broj long pozicija
MAX_SHORT_POSITIONS = 5  # Max broj short pozicija
```

### 3. Position Mode

Promijeni liniju 382:

```python
"position_idx": 0,  # 0=one-way, 1=hedge-long, 2=hedge-short
```

---

## 🧪 Testing

### Test 1: Dry Run (bez izvršavanja)

Prije aktivacije, testiraj transformaciju:

**Dodaj na kraju koda (prije `execute_trade`):**

```python
# DRY RUN - samo printaj, ne izvršavaj
print("\n🧪 DRY RUN MODE")
print(json.dumps(trade_payload, indent=2))
return [{"json": {"status": "dry_run", "payload": trade_payload}}]
```

Klikni **Execute Workflow** i provjeri output.

### Test 2: Live Test (mali qty)

Promijeni quantity u Trade Selector-u na **MALU VRIJEDNOST** (npr. 10 USDT):

```python
"qty": "10",  # Test sa malom količinom
```

Execute workflow i provjeri Bybit account.

---

## 📊 Prednosti vs Webhook

| Feature | Webhook Pristup | Inline Executor |
|---------|----------------|-----------------|
| Workflow | 2 odvojena | 1 workflow ✅ |
| Latency | 100-200ms | <50ms ✅ |
| Setup | Kompleksniji | Jednostavniji ✅ |
| Debugging | 2 места | 1 mjesto ✅ |
| Error handling | 2x | 1x ✅ |

**TL;DR:** Inline je **brži**, **jednostavniji**, i **lakši za debug**! 🚀

---

## 🐛 Troubleshooting

### 1. "Environment variables not found"

**Fix:**
- Provjeri n8n Settings → Variables
- Dodaj `BYBIT_API_KEY` i `BYBIT_API_SECRET`

### 2. "BUY is not valid side"

**Uzrok:** Trade Selector vraća "BUY", Bybit očekuje "Buy"

**Fix:** Kod automatski transformiše! Provjeri liniju 371:
```python
bybit_side = "Buy" if selector_output.get("side") == "BUY" else "Sell"
```

### 3. "Failed to get positions"

**Fix:**
- Provjeri Bybit API key permissions
- Provjeri da je API key aktivan

### 4. "Position already exists"

**Status:** ✅ Normalno ponašanje!
Trade se automatski skip-uje ako već imaš poziciju.

---

## 🔐 Security

### 1. Environment Variables
Nikad ne hard-kodiraj API keys u kod!

### 2. Bybit API Permissions
```
✅ Contract Trading
✅ Read-Write
✅ Position
❌ Withdrawal (NIKAD!)
```

### 3. IP Whitelist
Dodaj IP adresu n8n servera u Bybit API settings.

---

## 💡 Advanced: Multiple Workflows

Ako imaš **više trading strategija**, možeš koristiti isti kod:

```
Strategy A Workflow → Inline Executor
Strategy B Workflow → Inline Executor
Strategy C Workflow → Inline Executor
```

Samo kopiraj isti Code node u svaki workflow!

---

## ✅ Checklist

- [ ] IF node dodan nakon Trade Selector-a
- [ ] Python Code node dodan (TRUE grana)
- [ ] Kod kopiran u Code node (580+ linija)
- [ ] Environment variables dodane (BYBIT_API_KEY, BYBIT_API_SECRET)
- [ ] Provjeren `skip_leverage` setting
- [ ] (Optional) Response handler dodan
- [ ] Test sa malim qty-om
- [ ] Verifikuj poziciju na Bybit-u
- [ ] Aktiviraj workflow
- [ ] Monitor executions
- [ ] Gotovo! 🎉

---

## 🚀 Comparison sa Webhook Pristupom

### Webhook (Originalni način):
```
Trade Selector → HTTP Request → Webhook → Trade Runner → Response
```
**Pros:** Odvojeni workflow-i
**Cons:** Sporije, 2 mjesta za debug

### Inline (Novi način):
```
Trade Selector → Inline Executor → Done!
```
**Pros:** Brže, jednostavnije, 1 workflow
**Cons:** Nema (osim što je kod unutar glavnog workflow-a)

---

## 📚 Resources

- **Full Python Code:** `inline-trade-executor.py`
- **Trade Runner README:** `README.md`
- **Break Even Monitor:** `break-even-monitor.py`

---

Sve ready! Samo dodaj node i kreni sa trading-om! 💪
