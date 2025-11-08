/**
 * 🎯 INLINE TRADE EXECUTOR - JavaScript verzija za n8n
 *
 * Stavlja se DIREKTNO nakon "IF: Trade Selected?" node-a.
 * Čita output od Trade Selector-a i izvršava trade automatski.
 *
 * KORISTI JavaScript Code node (ne Python!) jer samo JS može raditi HTTP pozive!
 *
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// KONFIGURACIJA
// ═══════════════════════════════════════════════════════════════

// 🔑 STAVI SVOJE BYBIT API KREDENCIJALE OVDJE:
const BYBIT_API_KEY = "tvoj_api_key_ovdje";
const BYBIT_API_SECRET = "tvoj_api_secret_ovdje";

const BYBIT_API_URL = "https://api.bybit.com";
const MAX_LONG_POSITIONS = 5;
const MAX_SHORT_POSITIONS = 5;
const RECV_WINDOW = 5000;

// ═══════════════════════════════════════════════════════════════
// PURE JS HMAC SHA256 (bez require - radi u n8n sandbox!)
// ═══════════════════════════════════════════════════════════════

function sha256(message) {
    // Pure JavaScript SHA256 implementation
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

    // Convert string to UTF-8 bytes
    const utf8Encode = new TextEncoder();
    const msgBytes = utf8Encode.encode(message);
    const msgLen = msgBytes.length;
    const bitLen = msgLen * 8;

    // Padding
    const padLen = (msgLen % 64 < 56) ? (56 - msgLen % 64) : (120 - msgLen % 64);
    const totalLen = msgLen + padLen + 8;
    const padded = new Uint8Array(totalLen);
    padded.set(msgBytes);
    padded[msgLen] = 0x80;

    // Append length as 64-bit big-endian
    for (let i = 0; i < 8; i++) {
        padded[totalLen - 1 - i] = bitLen >>> (i * 8) & 0xff;
    }

    // Initialize hash values
    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    // Process 512-bit chunks
    for (let chunk = 0; chunk < totalLen; chunk += 64) {
        const W = new Array(64);

        // Copy chunk into first 16 words
        for (let i = 0; i < 16; i++) {
            W[i] = (padded[chunk + i * 4] << 24) |
                   (padded[chunk + i * 4 + 1] << 16) |
                   (padded[chunk + i * 4 + 2] << 8) |
                   (padded[chunk + i * 4 + 3]);
        }

        // Extend to 64 words
        for (let i = 16; i < 64; i++) {
            W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) >>> 0;
        }

        // Initialize working variables
        let [a, b, c, d, e, f, g, h] = H;

        // Main loop
        for (let i = 0; i < 64; i++) {
            const T1 = (h + sigma1(e) + ch(e, f, g) + K[i] + W[i]) >>> 0;
            const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + T1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) >>> 0;
        }

        // Update hash values
        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }

    // Produce final hash
    return H.map(h => h.toString(16).padStart(8, '0')).join('');
}

function hmacSha256(key, message) {
    const blockSize = 64; // SHA256 block size in bytes
    const utf8Encode = new TextEncoder();

    // Convert key to bytes
    let keyBytes = utf8Encode.encode(key);

    // Keys longer than blockSize are shortened
    if (keyBytes.length > blockSize) {
        keyBytes = new Uint8Array(sha256(key).match(/.{2}/g).map(byte => parseInt(byte, 16)));
    }

    // Keys shorter than blockSize are zero-padded
    if (keyBytes.length < blockSize) {
        const padded = new Uint8Array(blockSize);
        padded.set(keyBytes);
        keyBytes = padded;
    }

    // Compute inner and outer padded keys
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
        oKeyPad[i] = keyBytes[i] ^ 0x5c;
        iKeyPad[i] = keyBytes[i] ^ 0x36;
    }

    // Convert to strings
    const oKeyPadStr = String.fromCharCode(...oKeyPad);
    const iKeyPadStr = String.fromCharCode(...iKeyPad);

    // Compute HMAC
    const innerHash = sha256(iKeyPadStr + message);
    const innerHashBytes = innerHash.match(/.{2}/g).map(byte => parseInt(byte, 16));
    const innerHashStr = String.fromCharCode(...innerHashBytes);

    return sha256(oKeyPadStr + innerHashStr);
}

function generateSignature(apiSecret, timestamp, recvWindow, paramStr) {
    return hmacSha256(apiSecret, paramStr);
}

async function bybitRequest(method, endpoint, params = null, body = null) {
    const timestamp = Date.now();
    let url = BYBIT_API_URL + endpoint;
    let requestBody = null;
    let paramStr;

    if (method === "GET") {
        const queryString = params
            ? Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
            : '';
        paramStr = `${timestamp}${RECV_WINDOW}${queryString}`;
        if (queryString) url += `?${queryString}`;
    } else {
        const bodyJson = JSON.stringify(body || {});
        paramStr = `${timestamp}${RECV_WINDOW}${bodyJson}`;
        requestBody = bodyJson;
    }

    const signature = generateSignature(BYBIT_API_SECRET, timestamp, RECV_WINDOW, paramStr);

    const options = {
        method: method,
        url: url,
        headers: {
            'X-BAPI-API-KEY': BYBIT_API_KEY,
            'X-BAPI-TIMESTAMP': timestamp.toString(),
            'X-BAPI-SIGN': signature,
            'X-BAPI-RECV-WINDOW': RECV_WINDOW.toString(),
            'Content-Type': 'application/json'
        },
        body: requestBody,
        json: true
    };

    const response = await $httpRequest(options);
    return response;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getPositions() {
    console.log("📊 Fetching positions...");
    const result = await bybitRequest('GET', '/v5/position/list', {
        category: 'linear',
        settleCoin: 'USDT'
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to get positions: ${result.retMsg}`);
    }

    const positions = result.result?.list || [];
    const activePositions = positions.filter(p => parseFloat(p.size || 0) > 0);
    console.log(`   Found ${activePositions.length} active positions`);
    return activePositions;
}

function validatePosition(symbol, side, positions) {
    const longCount = positions.filter(p => p.side === "Buy").length;
    const shortCount = positions.filter(p => p.side === "Sell").length;
    const existingSymbols = positions.map(p => p.symbol);

    console.log(`📊 Current: ${longCount} long / ${shortCount} short`);
    console.log(`   Symbols: ${existingSymbols.join(', ') || 'None'}`);
    console.log(`🔵 Request: ${symbol} ${side}`);

    if (existingSymbols.includes(symbol)) {
        return {
            approved: false,
            status: "skipped",
            reason: `⏭️ Position already exists for ${symbol}`,
            longCount,
            shortCount
        };
    }

    const isLong = side === "Buy";
    if (isLong && longCount >= MAX_LONG_POSITIONS) {
        return {
            approved: false,
            status: "rejected",
            reason: `🚫 Max long positions (${longCount}/${MAX_LONG_POSITIONS})`,
            longCount,
            shortCount
        };
    }

    if (!isLong && shortCount >= MAX_SHORT_POSITIONS) {
        return {
            approved: false,
            status: "rejected",
            reason: `🚫 Max short positions (${shortCount}/${MAX_SHORT_POSITIONS})`,
            longCount,
            shortCount
        };
    }

    console.log("✅ Position validation passed");
    return {
        approved: true,
        status: "approved",
        reason: "Position approved",
        longCount,
        shortCount
    };
}

async function setLeverage(symbol, leverage) {
    console.log(`⚙️ Setting leverage to ${leverage}x for ${symbol}`);
    const result = await bybitRequest('POST', '/v5/position/set-leverage', null, {
        category: 'linear',
        symbol: symbol,
        buyLeverage: leverage.toString(),
        sellLeverage: leverage.toString()
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to set leverage: ${result.retMsg}`);
    }

    console.log(`✅ Leverage set to ${leverage}x`);
    return result;
}

async function placeEntryOrder(symbol, side, qty, positionIdx = 0) {
    console.log(`🚀 Placing ${side} order for ${qty} ${symbol}`);
    const result = await bybitRequest('POST', '/v5/order/create', null, {
        category: 'linear',
        symbol: symbol,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        positionIdx: positionIdx,
        timeInForce: 'IOC'
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to place entry order: ${result.retMsg}`);
    }

    const orderId = result.result?.orderId;
    console.log(`✅ Entry order placed: ${orderId}`);
    return result;
}

async function placeStopLoss(symbol, side, qty, stopLossPrice, positionIdx = 0) {
    console.log(`🛡️ Placing Stop Loss at ${stopLossPrice}`);
    const result = await bybitRequest('POST', '/v5/order/create', null, {
        category: 'linear',
        symbol: symbol,
        side: side,
        orderType: 'Market',
        qty: qty.toString(),
        stopLoss: stopLossPrice.toString(),
        triggerBy: 'LastPrice',
        reduceOnly: true,
        positionIdx: positionIdx
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to place stop loss: ${result.retMsg}`);
    }

    const orderId = result.result?.orderId;
    console.log(`✅ Stop Loss placed: ${orderId}`);
    return result;
}

async function placeTakeProfit(symbol, side, qty, takeProfitPrice, positionIdx = 0, label = "TP") {
    console.log(`💰 Placing ${label} at ${takeProfitPrice} for ${qty} ${symbol}`);
    const orderLinkId = `${label}_${symbol}_${Date.now()}`;

    const result = await bybitRequest('POST', '/v5/order/create', null, {
        category: 'linear',
        symbol: symbol,
        side: side,
        orderType: 'Limit',
        qty: qty.toString(),
        price: takeProfitPrice.toString(),
        reduceOnly: true,
        positionIdx: positionIdx,
        orderLinkId: orderLinkId
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to place ${label}: ${result.retMsg}`);
    }

    const orderId = result.result?.orderId;
    console.log(`✅ ${label} placed: ${orderId}`);
    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function executeTrade(tradeSignal) {
    try {
        const { symbol, side, qty, leverage, stop_loss, take_profits, position_idx, skip_leverage } = tradeSignal;

        console.log("\n" + "=".repeat(60));
        console.log("🎯 INLINE TRADE EXECUTOR - START");
        console.log("=".repeat(60));
        console.log(`Symbol: ${symbol}`);
        console.log(`Side: ${side}`);
        console.log(`Quantity: ${qty}`);
        console.log(`Leverage: ${leverage}x ${skip_leverage ? '(skip)' : ''}`);
        console.log(`Stop Loss: ${stop_loss}`);
        console.log(`Take Profits: ${take_profits?.length || 0}`);
        console.log("=".repeat(60) + "\n");

        // STEP 1: Get positions
        console.log("📊 STEP 1: Fetching current positions...");
        const positions = await getPositions();
        console.log();

        // STEP 2: Validate
        console.log("🔍 STEP 2: Validating position...");
        const validation = validatePosition(symbol, side, positions);
        console.log(`   Status: ${validation.status}\n`);

        if (!validation.approved) {
            console.log(`❌ Trade ${validation.status}: ${validation.reason}\n`);
            return {
                status: validation.status,
                symbol,
                side,
                qty,
                leverage,
                validation,
                reason: validation.reason
            };
        }

        // STEP 3: Set leverage
        if (skip_leverage) {
            console.log("⚙️ STEP 3: Skipping leverage (already set)\n");
        } else {
            console.log("⚙️ STEP 3: Setting leverage...");
            await setLeverage(symbol, leverage);
            console.log();
        }

        // STEP 4: Entry order
        console.log("🚀 STEP 4: Placing entry order...");
        const entryResult = await placeEntryOrder(symbol, side, qty, position_idx || 0);
        const entryOrderId = entryResult.result?.orderId;
        console.log();

        // STEP 5: Stop loss
        let slOrderId = null;
        if (stop_loss) {
            console.log("🛡️ STEP 5: Placing stop loss...");
            const oppositeSide = side === "Buy" ? "Sell" : "Buy";
            const slResult = await placeStopLoss(symbol, oppositeSide, qty, stop_loss, position_idx || 0);
            slOrderId = slResult.result?.orderId;
            console.log();
        }

        // STEP 6: Take profits
        const tpOrderIds = [];
        if (take_profits && take_profits.length > 0) {
            console.log(`💰 STEP 6: Placing ${take_profits.length} take profit orders...`);
            const oppositeSide = side === "Buy" ? "Sell" : "Buy";
            const totalQty = parseFloat(qty);

            for (const tp of take_profits) {
                const tpPrice = tp.price;
                const tpSizePct = tp.size_pct || 100;
                const tpLabel = tp.label || "TP";
                const tpQty = Math.floor(totalQty * (tpSizePct / 100));

                const tpResult = await placeTakeProfit(symbol, oppositeSide, tpQty, tpPrice, position_idx || 0, tpLabel);
                tpOrderIds.push(tpResult.result?.orderId);
            }
            console.log();
        }

        // SUCCESS
        console.log("=".repeat(60));
        console.log("✅ TRADE EXECUTION COMPLETED");
        console.log("=".repeat(60));
        console.log(`Entry Order: ${entryOrderId}`);
        console.log(`Stop Loss: ${slOrderId}`);
        console.log(`Take Profits: ${tpOrderIds.join(', ')}`);
        console.log("=".repeat(60) + "\n");

        return {
            status: "success",
            symbol,
            side,
            qty,
            leverage,
            entry_order_id: entryOrderId,
            sl_order_id: slOrderId,
            tp_order_ids: tpOrderIds,
            validation
        };

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}\n`);
        return {
            status: "error",
            symbol: tradeSignal.symbol || "UNKNOWN",
            error: error.message
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// n8n CODE NODE ENTRY POINT
// ═══════════════════════════════════════════════════════════════

(async () => {
    try {
        // Get input from Trade Selector
        const selectorOutput = items[0].json;

        console.log("\n🔄 TRANSFORMING TRADE SELECTOR OUTPUT...");
        console.log(`   Input: ${selectorOutput.symbol} ${selectorOutput.side}`);

        // Transform Trade Selector output → Trade Runner format
        // Side je već "Buy" ili "Sell" format - ne treba transformacija
        const tradePayload = {
            symbol: selectorOutput.symbol,
            side: selectorOutput.side,  // Već je "Buy" ili "Sell"
            qty: selectorOutput.qty,    // Već je string
            leverage: parseInt(selectorOutput.leverage),
            stop_loss: selectorOutput.stopLoss,  // camelCase!
            take_profits: selectorOutput.takeProfits || [],
            position_idx: selectorOutput.positionIdx || 0,
            skip_leverage: true  // Promijeniti na false ako želiš da postavlja leverage
        };

        console.log("✅ Transformation complete!");
        console.log(`   Symbol: ${tradePayload.symbol}`);
        console.log(`   Side: ${tradePayload.side}`);
        console.log(`   Qty: ${tradePayload.qty}`);
        console.log(`   Leverage: ${tradePayload.leverage}x\n`);

        // Execute trade
        const result = await executeTrade(tradePayload);

        // Return result
        return [{
            json: {
                ...result,
                original_selector_output: selectorOutput
            }
        }];

    } catch (error) {
        console.log(`❌ FATAL ERROR: ${error.message}`);
        console.log(error.stack);

        return [{
            json: {
                status: "error",
                error: error.message,
                stack: error.stack
            }
        }];
    }
})();
