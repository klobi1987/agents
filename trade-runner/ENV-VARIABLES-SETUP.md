# 🔑 n8n Environment Variables Setup

## Kako dodati Bybit API ključeve u n8n

### Korak 1: Idi u Settings

**n8n Cloud:**
```
Settings → Environments
```

**n8n Self-hosted:**
```
Settings → Variables
ili
Credentials → Add Credential → API (Custom)
```

---

## Korak 2: Dodaj varijable

Trebaš dodati **2 environment variables**:

### Opcija A: UPPERCASE (preporučeno)

```
Name:  BYBIT_API_KEY
Value: [tvoj_bybit_api_key_ovdje]

Name:  BYBIT_API_SECRET
Value: [tvoj_bybit_secret_ovdje]
```

### Opcija B: lowercase

```
Name:  bybit_api_key
Value: [tvoj_bybit_api_key_ovdje]

Name:  bybit_api_secret
Value: [tvoj_bybit_secret_ovdje]
```

**NAPOMENA:** Kod podržava oba formata! Automatski traži:
- Prvo `BYBIT_API_KEY` (uppercase)
- Ako ne postoji, onda `bybit_api_key` (lowercase)

---

## Korak 3: Gdje dobiti Bybit API ključeve?

### 1. Logiraj se na Bybit
https://www.bybit.com/

### 2. Idi u API Management
```
Account → API Management
ili
https://www.bybit.com/app/user/api-management
```

### 3. Create New API Key

Klikni **"Create New Key"** dugme

### 4. Podesi Permissions (VAŽNO!)

Odaberi:
- ✅ **Read-Write** (NE samo Read-only!)
- ✅ **Contract Trading** (za futures)
- ✅ **Position** (za leverage)

**Permissions Details:**
```
Account Transfer: ❌ (ne treba)
Sub-account Transfer: ❌ (ne treba)
Derivative: ✅ (OBAVEZNO - ovo je Contract Trading)
Spot: ❌ (ne treba, osim ako tradeaš spot)
```

### 5. IP Restriction (Opciono ali preporučeno)

Za dodatnu sigurnost, dodaj IP adresu tvog n8n servera:

```
IP Address: 123.45.67.89  (IP tvog n8n servera)
```

Ako ne znaš IP, možeš ostaviti prazno (sve IP-ove dozvoljava), ali je manje sigurno.

### 6. Kopiraj Ključeve

Nakon kreiranja, Bybit će ti prikazati:

```
API Key: xxxxxxxxxxxxxxxxxxxxxxxxxxx
Secret Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

**⚠️ VAŽNO:** Secret Key se prikazuje **samo jednom**! Kopiraj ga odmah!

---

## Korak 4: Dodaj u n8n

### n8n Cloud / Desktop:

1. **Settings → Environments**
2. Klikni **"Add Variable"**
3. Dodaj prvu varijablu:
   ```
   Name: BYBIT_API_KEY
   Value: [paste tvoj API key]
   ```
4. Klikni **"Add Variable"** ponovo
5. Dodaj drugu varijablu:
   ```
   Name: BYBIT_API_SECRET
   Value: [paste tvoj Secret key]
   ```
6. **Save**

### n8n Self-hosted (Docker):

Dodaj u `docker-compose.yml` ili `.env` fajl:

```yaml
environment:
  - BYBIT_API_KEY=tvoj_api_key_ovdje
  - BYBIT_API_SECRET=tvoj_secret_ovdje
```

ili u `.env`:
```bash
BYBIT_API_KEY=tvoj_api_key_ovdje
BYBIT_API_SECRET=tvoj_secret_ovdje
```

Restart Docker kontejner:
```bash
docker-compose restart
```

---

## Korak 5: Verifikuj da radi

### Test u Python Code node-u:

Kreiraj test workflow sa Code node-om:

```python
# Test environment variables
api_key = $env.BYBIT_API_KEY or $env.bybit_api_key
api_secret = $env.BYBIT_API_SECRET or $env.bybit_api_secret

if api_key and api_secret:
    print(f"✅ API Key found: {api_key[:10]}...{api_key[-5:]}")
    print(f"✅ API Secret found: {api_secret[:10]}...***")

    return [{
        "json": {
            "status": "success",
            "api_key_length": len(api_key),
            "api_secret_length": len(api_secret)
        }
    }]
else:
    print("❌ Environment variables not found!")
    print(f"   BYBIT_API_KEY: {api_key}")
    print(f"   bybit_api_key: {$env.bybit_api_key}")

    return [{
        "json": {
            "status": "error",
            "error": "Environment variables not set"
        }
    }]
```

**Expected output:**
```
✅ API Key found: xAf3Bk7q9m...Zx4Y2
✅ API Secret found: yK8pL2m5nQ...***
```

---

## 🐛 Troubleshooting

### 1. "Environment variables not found"

**Uzrok:** Varijable nisu postavljene ili su krivo napisane

**Fix:**
- Provjeri da li su **tačno** nazvane: `BYBIT_API_KEY` i `BYBIT_API_SECRET`
- Provjeri da nema **trailing spaces** (praznih karaktera na kraju)
- Restart n8n ako koristiš self-hosted

### 2. "Failed to get positions: Invalid signature"

**Uzrok:** API Secret je pogrešan ili ima trailing spaces

**Fix:**
- Kopiraj ponovo API Secret sa Bybit-a
- Provjeri da nema praznih karaktera na početku/kraju
- Generiši novi API key pair ako ne radi

### 3. "Permission denied"

**Uzrok:** API key nema dovoljno permissions

**Fix:**
- Idi u Bybit API Management
- Provjeri da API key ima:
  - ✅ Contract Trading
  - ✅ Read-Write
  - ✅ Position
- Ako ne, kreiraj novi key sa pravilnim permissions

### 4. "IP not whitelisted"

**Uzrok:** API key ima IP restriction, ali tvoj n8n server nije na listi

**Fix:**
- Idi u Bybit API Management
- Dodaj IP adresu n8n servera u whitelist
- Ili ukloni IP restriction (manje sigurno)

---

## 🔐 Security Best Practices

### 1. Nikad ne share-uj API Secret!
```
❌ NE share-uj u:
   - GitHub
   - Screenshots
   - Chat poruke
   - Public n8n workflows
```

### 2. Koristi IP Whitelist
```
✅ Dodaj samo IP adresu tvog n8n servera
```

### 3. Kreiraj odvojene API keys
```
✅ Development: 1 API key (Testnet)
✅ Production: 1 API key (Mainnet)
```

### 4. Withdrawal permissions OFF
```
❌ NIKAD ne omogućavaj "Withdrawal" permission na trading API key!
```

### 5. Monitor API activity
```
✅ Periodično provjeri API logs na Bybit-u
```

---

## ✅ Checklist

- [ ] Kreiran Bybit API key
- [ ] Permissions: Contract Trading ✅, Position ✅
- [ ] (Optional) IP Whitelist postavljen
- [ ] API Key kopiran
- [ ] API Secret kopiran
- [ ] n8n environment variables dodane:
  - [ ] `BYBIT_API_KEY`
  - [ ] `BYBIT_API_SECRET`
- [ ] Test workflow - verifikuj da se čitaju
- [ ] Trade Runner workflow - aktiviran
- [ ] Break Even Monitor workflow - aktiviran
- [ ] Gotovo! 🎉

---

## 📝 Reference

**Bybit API Docs:**
- https://bybit-exchange.github.io/docs/v5/intro
- https://bybit-exchange.github.io/docs/v5/guide#authentication

**n8n Docs:**
- https://docs.n8n.io/hosting/environment-variables/

---

## 🚀 Next Steps

Nakon što environment variables rade:

1. **Test Trade Runner:**
   ```bash
   curl -X POST http://your-n8n.com/webhook/trade \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

2. **Activate Break Even Monitor:**
   - Schedule trigger svaki 30s
   - Automatski prati pozicije

3. **Monitor logs:**
   - n8n Executions tab
   - Provjeri output

4. **Go live! 💰**
