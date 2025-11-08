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
// BYBIT API HELPERS
// ═══════════════════════════════════════════════════════════════

const crypto = require('crypto');

function generateSignature(apiSecret, timestamp, recvWindow, paramStr) {
    return crypto
        .createHmac('sha256', apiSecret)
        .update(paramStr)
        .digest('hex');
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
        const bybitSide = selectorOutput.side === "BUY" ? "Buy" : "Sell";

        const tradePayload = {
            symbol: selectorOutput.bybit_symbol || selectorOutput.symbol,
            side: bybitSide,
            qty: selectorOutput.quantity.toString(),
            leverage: selectorOutput.leverage,
            stop_loss: selectorOutput.stop_loss.toString(),
            take_profits: selectorOutput.take_profits || [],
            position_idx: 0,
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
