# 🚀 n8n Trade Runner - Kompletan Setup Guide

## 📦 Šta ovaj sistem radi?

**Trade Runner** je kompletno automatizovano trading rješenje koje:

✅ Povlači trenutne pozicije sa Bybit-a (GET request)
✅ Validira da ne postoji duplikat pozicija
✅ Provjerava 5/5 limit (long/short)
✅ (Opciono) Postavlja leverage
✅ Plasira **Entry order** (Market)
✅ Postavlja **Stop Loss** (Market trigger)
✅ Postavlja **Multiple Take Profits** (Limit orders)

**SVE u 1 Python Code node-u!**

---

## 🏗️ n8n Workflow Setup (3 Node-a)

```
┌──────────────────┐
│  1. Webhook      │  ← Prima signal sa JSON payload-om
│  Trigger         │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  2. Python Code  │  ← KOMPLETAN TRADE RUNNER (sve HTTP requestove)
│  Node            │     - GET positions
│                  │     - Validate
│                  │     - (Optional) Set leverage
│                  │     - Entry order
│                  │     - Stop loss
│                  │     - Take profits
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  3. Respond to   │  ← Vrati rezultat caller-u
│  Webhook         │
└──────────────────┘
```

---

## 🔧 Node 1: Webhook Trigger

### Settings:
- **HTTP Method**: `POST`
- **Path**: `trade` (ili bilo šta, npr. `bybit-trade`)
- **Authentication**: None (ili Basic Auth ako želiš zaštititi)
- **Response Mode**: "Using 'Respond to Webhook' Node"

### Test URL:
```
https://your-n8n-instance.com/webhook/trade
```

---

## 💻 Node 2: Python Code Node

### Settings:
- **Name**: `Trade Runner`
- **Mode**: `Run Once for All Items`

### Code:
Kopiraj kompletan kod iz `n8n-complete-trade-runner.py`

### Environment Variables (u n8n Settings):
```bash
BYBIT_API_KEY=your_api_key_here
BYBIT_API_SECRET=your_api_secret_here
```

**NAPOMENA**: Dodaj API credentials u node kao expressions:
```javascript
{
  "api_key": "{{ $env.BYBIT_API_KEY }}",
  "api_secret": "{{ $env.BYBIT_API_SECRET }}",
  ...
}
```

---

## 📤 Node 3: Respond to Webhook

### Settings:
- **Respond With**: `JSON`
- **Response Code**: `200`

### Response Body:
```javascript
{{ $json }}
```

Ovo vraća output iz Python Code node-a.

---

## 📊 INPUT FORMAT

### Primjer #1: LONG Trade sa 2 TP-a

```json
{
  "symbol": "RLCUSDT",
  "side": "Buy",
  "qty": "742",
  "leverage": 8,
  "stop_loss": "0.8945",
  "take_profits": [
    {
      "price": "1.3862",
      "size_pct": 50,
      "label": "TP1"
    },
    {
      "price": "1.5199",
      "size_pct": 50,
      "label": "TP2"
    }
  ],
  "position_idx": 0,
  "skip_leverage": false
}
```

### Primjer #2: SHORT Trade sa 3 TP-a

```json
{
  "symbol": "AAVEUSDT",
  "side": "Sell",
  "qty": "50",
  "leverage": 5,
  "stop_loss": "350.00",
  "take_profits": [
    {
      "price": "290.00",
      "size_pct": 40,
      "label": "TP1"
    },
    {
      "price": "270.00",
      "size_pct": 35,
      "label": "TP2"
    },
    {
      "price": "250.00",
      "size_pct": 25,
      "label": "TP3"
    }
  ],
  "position_idx": 0,
  "skip_leverage": true
}
```

### Primjer #3: Samo Entry + SL (bez TP)

```json
{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "qty": "0.1",
  "leverage": 10,
  "stop_loss": "88000",
  "take_profits": [],
  "position_idx": 0,
  "skip_leverage": false
}
```

---

## 📥 OUTPUT FORMAT

### Success Response:
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
    "reason": "Position approved",
    "long_count": 2,
    "short_count": 1
  }
}
```

### Skipped Response (Duplikat):
```json
{
  "status": "skipped",
  "symbol": "RLCUSDT",
  "side": "Buy",
  "qty": "742",
  "leverage": 8,
  "validation": {
    "approved": false,
    "status": "skipped",
    "reason": "⏭️ Position already exists for RLCUSDT",
    "long_count": 3,
    "short_count": 1
  },
  "reason": "⏭️ Position already exists for RLCUSDT"
}
```

### Rejected Response (Limit):
```json
{
  "status": "rejected",
  "symbol": "NEWUSDT",
  "side": "Buy",
  "qty": "100",
  "leverage": 5,
  "validation": {
    "approved": false,
    "status": "rejected",
    "reason": "🚫 Max long positions (5/5)",
    "long_count": 5,
    "short_count": 2
  },
  "reason": "🚫 Max long positions (5/5)"
}
```

### Error Response:
```json
{
  "status": "error",
  "symbol": "RLCUSDT",
  "error": "Failed to place entry order: Insufficient margin"
}
```

---

## 🧪 TESTIRANJE

### 1. Test sa curl:

```bash
curl -X POST https://your-n8n.com/webhook/trade \
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

### 2. Test sa Python:

```python
import requests

url = "https://your-n8n.com/webhook/trade"

payload = {
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
    "skip_leverage": False
}

response = requests.post(url, json=payload)
print(response.json())
```

### 3. Test sa Postman:

1. Method: `POST`
2. URL: `https://your-n8n.com/webhook/trade`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): Kopiraj input primjer odozgo

---

## ⚙️ KONFIGURACIJA

### Position Limits:
Možeš promijeniti u Python kodu:

```python
MAX_LONG_POSITIONS = 5   # Max broj long pozicija
MAX_SHORT_POSITIONS = 5  # Max broj short pozicija
```

### Leverage:
Ako već imaš leverage postavljen na Bybit-u, možeš preskočiti taj korak:

```json
{
  "skip_leverage": true
}
```

Ovo preskače HTTP request za `set-leverage`.

### Position Mode:
- `position_idx: 0` - **One-way mode** (default) - 1 pozicija po symbolu
- `position_idx: 1` - **Hedge mode - Long side**
- `position_idx: 2` - **Hedge mode - Short side**

---

## 📊 HTTP REQUESTOVI

### Sa leverage (skip_leverage: false):
1. GET `/v5/position/list` - Pozicije
2. POST `/v5/position/set-leverage` - Set leverage
3. POST `/v5/order/create` - Entry order
4. POST `/v5/order/create` - Stop Loss
5. POST `/v5/order/create` - TP1
6. POST `/v5/order/create` - TP2

**Total: 6 requesta**

### Bez leverage (skip_leverage: true):
1. GET `/v5/position/list` - Pozicije
2. POST `/v5/order/create` - Entry order
3. POST `/v5/order/create` - Stop Loss
4. POST `/v5/order/create` - TP1
5. POST `/v5/order/create` - TP2

**Total: 5 requesta**

---

## 🔐 SECURITY

### API Permissions (Bybit):
Potrebne permisije na API key-u:
- ✅ **Read** - za GET positions
- ✅ **Trade** - za POST orders
- ✅ **Position** - za set leverage

### n8n Security:
1. **Webhook Authentication**: Dodaj Basic Auth ili API Key check
2. **Environment Variables**: Nikad ne hard-kodiraj API keys!
3. **IP Whitelist**: Ograniči pristup webhook-u na poznate IP-ove

---

## 🐛 TROUBLESHOOTING

### 1. "Failed to get positions"
**Uzrok**: Pogrešan API key ili signature

**Fix**:
- Provjeri `BYBIT_API_KEY` i `BYBIT_API_SECRET`
- Provjeri da je API key aktivan
- Provjeri permissions (Read, Trade, Position)

### 2. "Failed to place entry order: Insufficient margin"
**Uzrok**: Nemaš dovoljno USDT-a na account-u

**Fix**:
- Dodaj USDT na Bybit account
- Smanji `qty` ili `leverage`

### 3. "Position already exists"
**Uzrok**: Već imaš poziciju na tom symbolu

**Fix**:
- Normalno ponašanje - trade se preskače
- Ako želiš dodati na poziciju, trebaš modifikovati logiku

### 4. "Max long positions (5/5)"
**Uzrok**: Dostignut limit od 5 long pozicija

**Fix**:
- Zatvori neku poziciju prvo
- Ili povećaj `MAX_LONG_POSITIONS` u kodu

### 5. Signature error
**Uzrok**: Pogrešna HMAC signature

**Fix**:
- Provjeri timestamp (mora biti sinhronizovan)
- Provjeri API secret (može biti trailing spaces)
- Provjeri da koristiš V5 API endpoint

---

## 💡 BEST PRACTICES

### 1. Testiranje na Testnet-u:
Prije production-a, testiraj na Bybit Testnet-u:

```python
BYBIT_API_URL = "https://api-testnet.bybit.com"  # Testnet
# BYBIT_API_URL = "https://api.bybit.com"  # Production
```

### 2. Logging:
n8n automatski loguje sve console.log() outpute. Možeš pregledati u:
- Workflow executions → View execution
- Console logs prikazuju sve print() statement-e

### 3. Error Handling:
Dodaj error notification u n8n:
- IF node: Check if status === "error"
- Send Email / Telegram / Discord notifikaciju

### 4. Rate Limiting:
Bybit ima rate limite (50 req/sec). Ako tradeaš mnogo, dodaj delay:

```python
import time
time.sleep(0.1)  # 100ms delay između requesta
```

---

## 📚 DODATNI RESURSI

- **Bybit API Docs**: https://bybit-exchange.github.io/docs/v5/intro
- **n8n Docs**: https://docs.n8n.io/
- **HMAC Signature**: https://bybit-exchange.github.io/docs/v5/guide#authentication

---

## 🎓 NAPOMENE

### Position Mode (One-way vs Hedge):
- **One-way** (`positionIdx: 0`): Ne možeš imati LONG i SHORT na istom symbolu istovremeno
- **Hedge** (`positionIdx: 1/2`): Možeš long i short istovremeno (separate pozicije)

### Reduce Only Orders:
- SL i TP **moraju** biti `reduceOnly: true`
- To garantuje da neće otvoriti novu poziciju u suprotnom smjeru

### Multiple TP Distribution:
Ako imaš qty=100 i 3 TP-a sa [40%, 35%, 25%]:
- TP1: 40 qty @ price1
- TP2: 35 qty @ price2
- TP3: 25 qty @ price3

**Total: 100 qty** ✅

---

## ✅ QUICK START CHECKLIST

- [ ] Dodaj webhook node u n8n
- [ ] Kopiraj Python kod u Code node
- [ ] Dodaj environment variables (API key/secret)
- [ ] Dodaj Respond to Webhook node
- [ ] Konektuj sve node-ove
- [ ] Aktiviraj workflow
- [ ] Testiraj sa curl ili Postman
- [ ] Provjeri Bybit account da vidiš poziciju
- [ ] Gotovo! 🎉
