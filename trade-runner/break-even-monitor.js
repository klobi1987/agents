/**
 * 🎯 n8n BREAK EVEN MONITOR - JavaScript verzija
 * ═══════════════════════════════════════════════════════════════
 *
 * Automatski pomjera Stop Loss na entry price kada se TP1 izvrši.
 *
 * Usage:
 * 1. Dodaj Schedule Trigger (30 seconds)
 * 2. Dodaj ovaj JavaScript Code node
 * 3. (Optional) Dodaj notification za success
 *
 * Svaki put kada se TP1 order fill-uje, SL se automatski pomjera
 * na entry price → RISK-FREE pozicija! 🚀
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
const RECV_WINDOW = 5000;

// Break even offset (0 = exact entry, 0.005 = +0.5% above entry)
const BREAK_EVEN_OFFSET = 0.000;  // Set to 0.005 for +0.5% buffer

// Tolerance for checking if SL is already at break even (0.01%)
const TOLERANCE_PCT = 0.0001;

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
    const result = await bybitRequest('GET', '/v5/position/list', {
        category: 'linear',
        settleCoin: 'USDT'
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to get positions: ${result.retMsg}`);
    }

    const positions = result.result?.list || [];
    return positions.filter(p => parseFloat(p.size || 0) > 0);
}

async function getActiveOrders(symbol) {
    const result = await bybitRequest('GET', '/v5/order/realtime', {
        category: 'linear',
        symbol: symbol,
        orderFilter: 'Order'
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to get orders: ${result.retMsg}`);
    }

    return result.result?.list || [];
}

async function modifyStopLoss(symbol, orderId, newStopLoss) {
    console.log(`🔄 Modifying SL order ${orderId} → $${newStopLoss.toFixed(4)}`);

    const result = await bybitRequest('POST', '/v5/order/amend', null, {
        category: 'linear',
        symbol: symbol,
        orderId: orderId,
        stopLoss: newStopLoss.toString()
    });

    if (result.retCode !== 0) {
        throw new Error(`Failed to modify SL: ${result.retMsg}`);
    }

    console.log(`✅ SL modified to break even @ $${newStopLoss.toFixed(4)}`);
    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════

async function checkAndMoveToBreakeven() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 BREAK EVEN MONITOR - Checking positions...");
    console.log("=".repeat(60) + "\n");

    const results = [];

    // Get all open positions
    const positions = await getPositions();
    console.log(`📊 Found ${positions.length} open positions\n`);

    if (positions.length === 0) {
        console.log("   ⏭️ No open positions to monitor\n");
        return [];
    }

    for (const position of positions) {
        const symbol = position.symbol;
        const side = position.side;
        const size = parseFloat(position.size || 0);
        const entryPrice = parseFloat(position.avgPrice || 0);

        console.log(`🔵 ${symbol} (${side}) - Entry: $${entryPrice.toFixed(4)}, Size: ${size}`);

        try {
            // Get active orders for this symbol
            const orders = await getActiveOrders(symbol);

            // Find SL and TP1 orders
            let slOrder = null;
            let tp1Order = null;

            for (const order of orders) {
                const orderLinkId = order.orderLinkId || "";
                const orderType = order.orderType;
                const stopLossVal = order.stopLoss;

                // Identify SL order (has stopLoss field and is Market type)
                if (stopLossVal && orderType === "Market") {
                    slOrder = order;
                }

                // Identify TP1 order (orderLinkId contains "TP1")
                if (orderLinkId.includes("TP1") && orderType === "Limit") {
                    tp1Order = order;
                }
            }

            // Check if TP1 exists and is filled
            if (tp1Order) {
                const tp1Status = tp1Order.orderStatus;
                const tp1FilledQty = parseFloat(tp1Order.cumExecQty || 0);
                const tp1TotalQty = parseFloat(tp1Order.qty || 0);
                const tp1Price = parseFloat(tp1Order.price || 0);

                console.log(`   TP1: $${tp1Price.toFixed(4)} | Status: ${tp1Status} | Filled: ${tp1FilledQty}/${tp1TotalQty}`);

                // Check if TP1 is fully filled
                if (tp1Status === "Filled" || (tp1FilledQty > 0 && tp1FilledQty >= tp1TotalQty)) {
                    console.log(`   ✅ TP1 FILLED! Checking SL...`);

                    if (slOrder) {
                        const currentSl = parseFloat(slOrder.stopLoss || 0);
                        const slOrderId = slOrder.orderId;
                        const slStatus = slOrder.orderStatus;

                        console.log(`   Current SL: $${currentSl.toFixed(4)} | Status: ${slStatus}`);

                        // Calculate break even price (with optional offset)
                        const breakevenPrice = entryPrice * (1 + BREAK_EVEN_OFFSET);

                        // Check if SL is already at break even
                        const slDiffPct = Math.abs(currentSl - breakevenPrice) / breakevenPrice;

                        if (slDiffPct < TOLERANCE_PCT) {
                            console.log(`   ⏭️ SL already at break even, skipping\n`);
                            results.push({
                                symbol,
                                action: "skipped",
                                reason: "SL already at break even",
                                entry_price: entryPrice,
                                current_sl: currentSl
                            });
                        } else {
                            // Only modify if SL is Untriggered
                            if (slStatus === "Untriggered" || slStatus === "New") {
                                try {
                                    // Move SL to break even
                                    await modifyStopLoss(symbol, slOrderId, breakevenPrice);

                                    results.push({
                                        symbol,
                                        action: "moved_to_breakeven",
                                        entry_price: entryPrice,
                                        old_sl: currentSl,
                                        new_sl: breakevenPrice,
                                        tp1_price: tp1Price
                                    });
                                    console.log(`   🎯 SUCCESS: SL moved to break even!\n`);

                                } catch (error) {
                                    console.log(`   ❌ ERROR modifying SL: ${error.message}\n`);
                                    results.push({
                                        symbol,
                                        action: "error",
                                        error: error.message
                                    });
                                }
                            } else {
                                console.log(`   ⚠️ SL status is ${slStatus}, cannot modify\n`);
                                results.push({
                                    symbol,
                                    action: "cannot_modify",
                                    reason: `SL status is ${slStatus}`
                                });
                            }
                        }
                    } else {
                        console.log(`   ⚠️ No SL order found for ${symbol}\n`);
                        results.push({
                            symbol,
                            action: "no_sl_found"
                        });
                    }
                } else {
                    console.log(`   ⏳ TP1 not yet filled (${tp1Status})\n`);
                    results.push({
                        symbol,
                        action: "waiting",
                        tp1_status: tp1Status,
                        tp1_filled: `${tp1FilledQty}/${tp1TotalQty}`
                    });
                }
            } else {
                console.log(`   ⚠️ No TP1 order found for ${symbol}\n`);
                results.push({
                    symbol,
                    action: "no_tp1_found"
                });
            }

        } catch (error) {
            console.log(`   ❌ ERROR processing ${symbol}: ${error.message}\n`);
            results.push({
                symbol,
                action: "error",
                error: error.message
            });
        }
    }

    console.log("=".repeat(60));
    console.log(`✅ Monitor completed - ${results.length} positions checked`);
    console.log("=".repeat(60) + "\n");

    return results;
}

// ═══════════════════════════════════════════════════════════════
// n8n CODE NODE ENTRY POINT
// ═══════════════════════════════════════════════════════════════

(async () => {
    try {
        // Run break even check
        const results = await checkAndMoveToBreakeven();

        // Count actions
        const movedCount = results.filter(r => r.action === "moved_to_breakeven").length;
        const waitingCount = results.filter(r => r.action === "waiting").length;
        const errorCount = results.filter(r => r.action === "error").length;

        // Return results
        return [{
            json: {
                status: "success",
                timestamp: Date.now(),
                positions_checked: results.length,
                moved_to_breakeven: movedCount,
                waiting: waitingCount,
                errors: errorCount,
                results: results
            }
        }];

    } catch (error) {
        console.log(`\n❌ FATAL ERROR: ${error.message}\n`);
        return [{
            json: {
                status: "error",
                error: error.message,
                timestamp: Date.now()
            }
        }];
    }
})();
