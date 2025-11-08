// ═══════════════════════════════════════════════════════════════
// NODE 1: Get Positions & Validate
// ═══════════════════════════════════════════════════════════════

// 🔑 STAVI SVOJE BYBIT API KREDENCIJALE OVDJE:
const BYBIT_API_KEY = "tvoj_api_key_ovdje";
const BYBIT_API_SECRET = "tvoj_api_secret_ovdje";

const MAX_LONG = 5;
const MAX_SHORT = 5;

// ═══════════════════════════════════════════════════════════════
// CRYPTO FUNCTIONS (Pure JS - radi u n8n sandbox!)
// ═══════════════════════════════════════════════════════════════

function stringToUtf8Bytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);
        if (charCode < 0x80) {
            bytes.push(charCode);
        } else if (charCode < 0x800) {
            bytes.push(0xc0 | (charCode >> 6));
            bytes.push(0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            bytes.push(0xe0 | (charCode >> 12));
            bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            bytes.push(0x80 | (charCode & 0x3f));
        } else {
            i++;
            charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            bytes.push(0xf0 | (charCode >> 18));
            bytes.push(0x80 | ((charCode >> 12) & 0x3f));
            bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            bytes.push(0x80 | (charCode & 0x3f));
        }
    }
    return new Uint8Array(bytes);
}

function sha256(message) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    function shr(n, x) { return x >>> n; }
    function ch(x, y, z) { return (x & y) ^ (~x & z); }
    function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }
    function sigma0(x) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
    function sigma1(x) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
    function gamma0(x) { return rotr(7, x) ^ rotr(18, x) ^ shr(3, x); }
    function gamma1(x) { return rotr(17, x) ^ rotr(19, x) ^ shr(10, x); }

    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const msgBytes = stringToUtf8Bytes(message);
    const msgLen = msgBytes.length;
    const bitLen = msgLen * 8;
    const padLen = (msgLen % 64 < 56) ? (56 - msgLen % 64) : (120 - msgLen % 64);
    const totalLen = msgLen + padLen + 8;
    const padded = new Uint8Array(totalLen);
    padded.set(msgBytes);
    padded[msgLen] = 0x80;

    for (let i = 0; i < 8; i++) {
        padded[totalLen - 1 - i] = bitLen >>> (i * 8) & 0xff;
    }

    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    for (let chunk = 0; chunk < totalLen; chunk += 64) {
        const W = new Array(64);
        for (let i = 0; i < 16; i++) {
            W[i] = (padded[chunk + i * 4] << 24) |
                   (padded[chunk + i * 4 + 1] << 16) |
                   (padded[chunk + i * 4 + 2] << 8) |
                   (padded[chunk + i * 4 + 3]);
        }
        for (let i = 16; i < 64; i++) {
            W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const T1 = (h + sigma1(e) + ch(e, f, g) + K[i] + W[i]) >>> 0;
            const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
            h = g; g = f; f = e; e = (d + T1) >>> 0;
            d = c; c = b; b = a; a = (T1 + T2) >>> 0;
        }

        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }

    return H.map(h => h.toString(16).padStart(8, '0')).join('');
}

function hmacSha256(key, message) {
    const blockSize = 64;
    let keyBytes = stringToUtf8Bytes(key);

    if (keyBytes.length > blockSize) {
        keyBytes = new Uint8Array(sha256(key).match(/.{2}/g).map(byte => parseInt(byte, 16)));
    }
    if (keyBytes.length < blockSize) {
        const padded = new Uint8Array(blockSize);
        padded.set(keyBytes);
        keyBytes = padded;
    }

    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
        oKeyPad[i] = keyBytes[i] ^ 0x5c;
        iKeyPad[i] = keyBytes[i] ^ 0x36;
    }

    const oKeyPadStr = String.fromCharCode(...oKeyPad);
    const iKeyPadStr = String.fromCharCode(...iKeyPad);
    const innerHash = sha256(iKeyPadStr + message);
    const innerHashBytes = innerHash.match(/.{2}/g).map(byte => parseInt(byte, 16));
    const innerHashStr = String.fromCharCode(...innerHashBytes);
    return sha256(oKeyPadStr + innerHashStr);
}

// ═══════════════════════════════════════════════════════════════
// GET POSITIONS FROM BYBIT
// ═══════════════════════════════════════════════════════════════

async function getPositions() {
    const timestamp = Date.now();
    const queryString = "category=linear&settleCoin=USDT";
    const paramStr = timestamp + "5000" + queryString;
    const signature = hmacSha256(BYBIT_API_SECRET, paramStr);

    const response = await $httpRequest({
        method: 'GET',
        url: `https://api.bybit.com/v5/position/list?${queryString}`,
        headers: {
            'X-BAPI-API-KEY': BYBIT_API_KEY,
            'X-BAPI-TIMESTAMP': timestamp.toString(),
            'X-BAPI-SIGN': signature,
            'X-BAPI-RECV-WINDOW': '5000',
            'Content-Type': 'application/json'
        },
        json: true
    });

    return response;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
    const trade = items[0].json;

    console.log("📊 Fetching positions from Bybit...");
    const positionsData = await getPositions();

    if (positionsData.retCode !== 0) {
        throw new Error(`Bybit API error: ${positionsData.retMsg}`);
    }

    const allPositions = positionsData.result.list || [];
    const positions = allPositions.filter(p => parseFloat(p.size || 0) > 0);

    const longCount = positions.filter(p => p.side === "Buy").length;
    const shortCount = positions.filter(p => p.side === "Sell").length;
    const symbols = positions.map(p => p.symbol);

    console.log(`   Found ${positions.length} active positions`);
    console.log(`   ${longCount} long / ${shortCount} short`);
    console.log(`   Symbols: ${symbols.join(', ') || 'None'}`);

    // Validate
    let approved = true;
    let reason = "Position approved";

    if (symbols.includes(trade.symbol)) {
        approved = false;
        reason = `Position already exists for ${trade.symbol}`;
    } else if (trade.side === "Buy" && longCount >= MAX_LONG) {
        approved = false;
        reason = `Max long positions reached (${longCount}/${MAX_LONG})`;
    } else if (trade.side === "Sell" && shortCount >= MAX_SHORT) {
        approved = false;
        reason = `Max short positions reached (${shortCount}/${MAX_SHORT})`;
    }

    console.log(`\n🔍 Validation: ${approved ? "✅ APPROVED" : "❌ REJECTED"}`);
    console.log(`   Reason: ${reason}\n`);

    return [{
        json: {
            ...trade,
            validation: {
                approved,
                reason,
                longCount,
                shortCount,
                existingSymbols: symbols
            }
        }
    }];
}

return main();
