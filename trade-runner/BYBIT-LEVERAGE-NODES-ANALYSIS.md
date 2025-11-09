# 🔬 Bybit Leverage Workflow - Detaljn Analiza Nodova (Rating → Execution)

> **Verzija:** V2 (November 2025)
> **Workflow:** `bybit leverage (9).json`
> **Focus:** Nodovi od `rating` do finalne trade execution

---

## 📋 Table of Contents

1. [Node 1: RATING (Multi-TF Position Sizing)](#node-1-rating)
2. [Node 2: SL TP FINDER (Liquidity Sweep Protection)](#node-2-sl-tp-finder)
3. [Node 3: LEVERAGE FINDER (Dynamic Leverage)](#node-3-leverage-finder)
4. [Node 4: TRADE SELECTOR (Final Selection)](#node-4-trade-selector)
5. [Node 5: TRADE CLEANER (Data Formatting)](#node-5-trade-cleaner)
6. [Node 6: HTTP REQUEST (Trade Execution)](#node-6-http-request)
7. [Kompletni Flow Diagram](#kompletni-flow)
8. [Kritične Preporuke & Improvements](#preporuke)

---

## Node 1: RATING 🎯

**File:** `rating-node.js` (1069 linija, 37KB)
**Purpose:** Multi-timeframe BTC regime analysis, market scenario detection, tiered position sizing
**Input:** Mergedana data sa TA indicators, VP, funding, orderbook
**Output:** Top 10-20 "BEAST-MODE" candidates sa conviction scores & position sizes

### 🏆 Ključne Funkcije:

#### 1. **Multi-Timeframe BTC Regime Detection**

```javascript
function analyzeBTCRegimeSingleTF(btc, timeframe) {
  // Analizira BTC na 15m, 1h, 4h
  // Daje bullScore & bearScore na osnovu:
  // - Market structure (UPTREND/DOWNTREND)
  // - EMA alignment (20/50/200)
  // - RSI levels
  // - VP price position (ABOVE/BELOW/INSIDE value)
}

function inferMultiTFRegime(btc) {
  // Kombinuje sve 3 timeframe-a
  // Outputs:
  // - regime: "BULL" / "BEAR" / "NEUTRAL"
  // - confidence: "HIGH" / "MED" / "LOW"
  // - strength: "STRONG" / "MODERATE" / "WEAK"
  // - aligned: true/false (da li su svi TF-ovi u istom režimu)
}
```

**Primjer Output:**
```
📊 BTC MULTI-TF REGIME:
   15m: BULL (2.5)
   1h: BULL (3.2)
   4h: BULL (4.1)
   → Dominant: BULL (HIGH), Strength: STRONG
```

#### 2. **BTC Dominance Calculation**

```javascript
function calculateBTCDominance(btcData, allCoins) {
  // Estimates BTC.D from market cap data
  // Compares BTC 24h performance vs ALT average

  // Outputs:
  // - btc_dominance: 50% (estimated)
  // - trend: "RISING" / "FALLING" / "NEUTRAL"
  // - change_24h: +2.5% (BTC outperforms = BTC.D rising)
}
```

**Logic:**
- Ako BTC 24h > ALT avg → BTC.D RISING
- Ako ALT avg > BTC 24h → BTC.D FALLING

#### 3. **Market Scenario Analysis** (⭐ THE MAGIC!)

```javascript
function analyzeMarketScenario(btcRegime, btcDominance, marketBreadth, coin) {
  // Scenarios:

  // 1. PEAK_ALT_SEASON
  // BTC up + BTC.D down + breadth strong
  // → 🚀 Money flowing to alts, max risk ON

  // 2. ALT_DECOUPLING
  // BTC down + BTC.D down + breadth strong
  // → 💎 Alts have independent narratives

  // 3. BTC_ONLY_RALLY
  // BTC up + BTC.D up
  // → ⚠️ Money flowing to BTC, avoid alts

  // 4. CAPITULATION
  // BTC down + BTC.D up
  // → 💀 Risk-off mode, defensive sizing

  // 5. COIN_DECOUPLING
  // Coin bullish while BTC bearish
  // → ✨ Independent alpha

  // 6. FUNDING_DIVERGENCE
  // BTC overleveraged (>0.01%), ALT not (<0.0002%)
  // → 💰 ALT undervalued relative to BTC
}
```

#### 4. **Sector Leadership Scoring**

```javascript
function analyzeSectorLeadership(coin, allCoins) {
  // Sector groups:
  // - layer-1: BTC, ETH, SOL, AVAX, ...
  // - meme: DOGE, SHIB, PEPE, WIF, ...
  // - defi: UNI, AAVE, CRV, ...
  // - layer-2: MATIC, ARB, OP, ...
  // - oracle: LINK, GRT, BAND, ...

  // Logic:
  // - Find coin's sector
  // - Calculate sector average 24h performance
  // - Outperformance = coin_perf - sector_avg
  // - Leader if outperformance > 50% of sector_avg AND > 2%

  // Example:
  // SOL: +8%, Layer-1 avg: +3% → Outperformance: +5% → LEADER ✅
}
```

#### 5. **V2 Tiered Position Sizing** (🆕 MAJOR IMPROVEMENT!)

**Philosophy:** "Only EXTREME conviction gets MAX capital!"

```javascript
const POSITION_SIZING = {
  min_trade_size_usdt: 30,
  max_trade_size_usdt: 90,

  // Conviction BASE tiers
  conviction_base: {
    "EXTREME": 75,   // Elite setups start at 75 USDT
    "HIGH": 60,
    "MEDIUM": 45,
    "LOW": 30
  },

  // VP quality MULTIPLIERS (not flat bonus!)
  vp_quality_multiplier: {
    "GOLDEN": 1.20,      // 75 × 1.20 = 90 USDT (max!)
    "EXCELLENT": 1.13,   // 75 × 1.13 = 84.75 ≈ 85 USDT
    "GOOD": 1.0,
    "MODERATE": 0.87     // Penalty
  },

  // Volatility MULTIPLIERS
  volatility_multiplier: {
    "EXTREME": 0.75,  // Reduce 25% in extreme vol
    "HIGH": 0.90,
    "MEDIUM": 1.0,
    "LOW": 1.10       // Increase 10% in calm markets
  },

  // Market scenario MULTIPLIERS
  scenario_multiplier: {
    "PEAK_ALT_SEASON": 1.10,      // +10%
    "ALT_DECOUPLING": 1.08,       // +8%
    "COIN_DECOUPLING": 1.05,
    "SECTOR_LEADER": 1.03,
    "FUNDING_DIVERGENCE": 1.02,
    "BTC_ONLY_RALLY": 0.85,       // -15%
    "CAPITULATION": 0.70,         // -30%
    "NEUTRAL": 1.0
  }
};

function calculatePositionSizeUSDT(coin, conviction, vpQuality, marketState, marketScenario, sectorLeadership) {
  // 1. Get base tier
  let size_usdt = conviction_base[conviction];  // e.g., 75 for EXTREME

  // 2. Apply VP multiplier
  size_usdt *= vp_quality_multiplier[vpQuality];  // 75 × 1.20 = 90

  // 3. Apply volatility multiplier
  size_usdt *= volatility_multiplier[volatility_regime];  // 90 × 0.90 = 81

  // 4. Apply scenario multiplier
  size_usdt *= scenario_multiplier[scenario];  // 81 × 1.10 = 89.1

  // 5. Sector leader boost
  if (is_leader) size_usdt *= 1.03;  // 89.1 × 1.03 = 91.77

  // 6. Cap at 30-90 USDT
  size_usdt = Math.max(30, Math.min(90, Math.round(size_usdt)));

  return size_usdt;  // Final: 90 USDT
}
```

**Primjer Kalkulacije:**

| Step | Calculation | Value |
|------|-------------|-------|
| Conviction (EXTREME) | Base | 75 USDT |
| VP Quality (GOLDEN) | 75 × 1.20 | 90 USDT |
| Volatility (MEDIUM) | 90 × 1.0 | 90 USDT |
| Scenario (PEAK_ALT_SEASON) | 90 × 1.10 | 99 → **90 USDT** (capped) |

**Contrast sa V1:**
- **V1:** Flat USDT bonuses (+10 for EXCELLENT, +5 for GOOD) → Svi dobijaju iste bonuse
- **V2:** Proportional multipliers → EXTREME conviction dobija više benefita od istog multiplikera

#### 6. **Volume Profile Scoring**

```javascript
function calculateVPScore(vp_15m, vp_1h, vp_4h) {
  let vpScore = 0;
  let vpBoost = 0;

  // 4H VP (highest priority)
  if (vp_4h.at_POC) {
    vpScore += 30;
    vpBoost += 15;
  } else if (vp_4h.price_position === "INSIDE_VALUE") {
    vpScore += 20;
    vpBoost += 8;
  }

  // Multi-TF alignment bonuses
  const allAtPOC = vp_15m?.at_POC && vp_1h?.at_POC && vp_4h?.at_POC;
  if (allAtPOC) {
    vpScore += 30;  // GOLDEN setup!
    vpBoost += 10;
    setupQuality = "GOLDEN";
  }

  return { vp_score, vp_confidence_boost, setup_quality };
}
```

**VP Setup Quality Tiers:**
- **GOLDEN:** All 3 TF at POC (allAtPOC) → 1.20× multiplier
- **EXCELLENT:** All 3 TF inside value → 1.13× multiplier
- **GOOD:** 4H or 1H at POC → 1.0× multiplier
- **MODERATE:** Weak VP alignment → 0.87× penalty

#### 7. **Side Decision (BUY/SELL) with Conviction**

```javascript
function decideSide(coin, regime, marketState) {
  let bullScore = 0;
  let bearScore = 0;

  // 🚨 INSTANT DECISION: Massive momentum
  const altRankJump = coin.derived.alt_rank_jump;  // LunarCrush rank change
  const galaxyJump = coin.derived.galaxy_jump;

  if (altRankJump > 500 || galaxyJump > 15) {
    return { side: "BUY", conviction: "EXTREME", bullScore: 100 };
  }

  // Scoring system (0-100 points each side)

  // 1. Momentum (0-15 points)
  if (altRankJump > 300 || galaxyJump > 10) bullScore += 15;
  else if (altRankJump > 150 || galaxyJump > 5) bullScore += 10;

  // 2. Price action (0-5 points)
  const pct24h = coin.derived.pct_change_24h;
  if (pct24h > 10) bullScore += 5;
  else if (pct24h > 5) bullScore += 3;

  // 3. Market structure (0-5 points)
  if (ms_4h === "UPTREND") bullScore += 3;
  if (ms_1h === "UPTREND") bullScore += 1.5;

  // 4. RSI (0-7 points)
  if (rsi_1h > 55 && rsi_1h < 70) bullScore += 2;
  if (rsi_15m < 25 && rsi_1h < 35) bullScore += 5;  // Oversold bounce

  // 5. Volume Profile (0-8 points)
  if (vp_4h.signal === "BULLISH_BREAKOUT") bullScore += 5;
  if (vp_4h.at_POC) bullScore += 3;  // Neutral, but adds weight

  // 6. Order book (0-2 points)
  if (orderBookImbalance > 0.2) bullScore += 2;  // More bids than asks

  // 7. ADX + DI (0-2 points)
  if (adx_1h > 25 && diPlus > diMinus + 5) bullScore += 2;

  // 8. Regime & breadth multipliers
  if (regime.regime === "BULL" && regime.confidence !== "LOW") {
    bullScore *= 1.15;  // 15% boost in bull market
  }
  if (marketState.market_breadth === "STRONG_BULL") {
    bullScore *= 1.10;  // 10% boost when 70%+ coins green
  }

  // Conviction levels
  const diff = Math.abs(bullScore - bearScore);
  const total = bullScore + bearScore;

  if (bullScore > bearScore) {
    side = "BUY";
    if (diff > 15 && total > 20) conviction = "EXTREME";
    else if (diff > 8 && total > 12) conviction = "HIGH";
    else if (diff > 4) conviction = "MEDIUM";
    else conviction = "LOW";
  }

  return { side, bullScore, bearScore, conviction };
}
```

**Primjer Scoring:**

```
Coin: RLCUSDT
altRankJump: +420
pct24h: +12.5%
ms_4h: UPTREND
rsi_1h: 62
vp_4h.at_POC: true
orderBookImbalance: +0.35
adx_1h: 32, diPlus: 35, diMinus: 18

bullScore = 15 (momentum) + 5 (price) + 3 (ms_4h) + 1.5 (ms_1h)
          + 2 (rsi) + 3 (vp) + 2 (ob) + 2 (adx)
          = 33.5 × 1.15 (regime BULL) × 1.10 (breadth)
          = 42.5

bearScore = 2 (minor signals)

diff = 40.5, total = 44.5
→ side: BUY, conviction: EXTREME (diff > 15, total > 20)
```

#### 8. **Enhanced Alpha Score** (Final Composite Score)

```javascript
function enhancedAlphaScore(coin, side, regime, marketState, vpMetrics, weights, marketScenario, sectorLeadership) {
  let alpha = 0;

  // Weights (total = 1.0)
  const weights = {
    social: 0.20,          // LunarCrush social scores
    momentum: 0.30,        // Alt rank jumps, galaxy score
    liquidity: 0.20,       // Volume, turnover, OI
    technical: 0.15,       // TA indicators
    vp: 0.10,              // Volume Profile
    orderbook: 0.05        // Order book imbalance
  };

  // 1. Social (0-25 points)
  const lcScore = coin.score || 0;  // LunarCrush composite score
  alpha += Math.min(lcScore / 2.5, 25) * weights.social;

  // 2. Momentum (0-30 points)
  const altRankJump = Math.abs(coin.derived.alt_rank_jump || 0);
  alpha += Math.min(altRankJump / 20, 30) * weights.momentum;

  // 3. Liquidity (0-20 points)
  const volume24h = coin.derived.volume_24h_usdt || 0;
  const liquidityScore = Math.min(volume24h / 5_000_000, 20);
  alpha += liquidityScore * weights.liquidity;

  // 4. Technical (0-15 points)
  const rsi = coin.ta_1h.rsi || 50;
  const adx = coin.ta_1h.adx.adx || 0;
  const technicalScore = (adx > 25 ? 10 : 5) + (Math.abs(rsi - 50) / 10);
  alpha += Math.min(technicalScore, 15) * weights.technical;

  // 5. VP (0-10 points)
  alpha += vpMetrics.vp_score * weights.vp;

  // 6. Order book (0-5 points)
  const obImbalance = Math.abs(coin.derived.orderBookImbalance || 0);
  alpha += Math.min(obImbalance * 25, 5) * weights.orderbook;

  // Scenario bonus
  if (marketScenario.scenario === "PEAK_ALT_SEASON") alpha *= 1.15;
  else if (marketScenario.scenario === "ALT_DECOUPLING") alpha *= 1.10;

  // Sector leadership bonus
  if (sectorLeadership.is_leader) alpha *= 1.05;

  return Math.min(alpha, 100);
}
```

### 📤 RATING Node Output:

```json
{
  "symbol": "RLCUSDT",
  "price": 1.0544,
  "side": "BUY",
  "conviction": "EXTREME",
  "position_size_usdt": 90,
  "alpha_score": 87.5,
  "vp_setup_quality": "GOLDEN",
  "market_scenario": "PEAK_ALT_SEASON",
  "sector_leadership": {
    "is_leader": true,
    "sector": "defi",
    "outperformance": 5.2
  },
  "btc_regime": {
    "regime": "BULL",
    "confidence": "HIGH",
    "strength": "STRONG"
  },
  "_reasoning": [
    "🚀 PEAK ALT SEASON: BTC rising + Money flowing to alts",
    "💎 SECTOR LEADER: Outperforming DeFi sector by 5.2%",
    "✨ GOLDEN VP SETUP: All 3 TF at POC"
  ]
}
```

---

## Node 2: SL TP FINDER 🎯

**File:** `sl-tp-finder.js` (793 linija, 30KB)
**Purpose:** Calculate optimal Stop Loss & Take Profit levels with liquidity sweep protection
**Input:** Rated candidates from Rating Node
**Output:** Candidates + SL/TP prices with risk/reward ratios

### 🔴 PROBLEM V1 → ✅ SOLUTION V2:

**V1 Problem:**
```
Support @ $0.8234
SL placed @ $0.8234
❌ Market makers sweep this level → stopped out → price recovers
```

**V2 Solution:**
```
Support @ $0.8234
Sweep protection buffer: -0.4% (high-weight 4H level)
Support clearance: -0.5%
SL placed @ $0.8150 ✅
```

### 🔧 Configuration:

```javascript
const SLTP_CONFIG = {
  // SL Distance targets (% from entry)
  sl_distance_targets: {
    "EXTREME": { min: 5, optimal: 7, max: 10 },
    "HIGH": { min: 6, optimal: 8, max: 12 },
    "MEDIUM": { min: 7, optimal: 10, max: 15 },
    "LOW": { min: 8, optimal: 12, max: 18 }
  },

  // 🆕 ATR-based minimum (avoid noise stop-outs)
  atr_sl_multiplier: {
    "EXTREME": 1.5,  // Min 1.5× ATR distance
    "HIGH": 1.8,
    "MEDIUM": 2.0,
    "LOW": 2.2
  },

  // 🆕 Sweep protection buffer (% BELOW obvious levels)
  sweep_protection: {
    high_weight_levels: 0.4,    // 4H VA, POC: -0.4% extra
    medium_weight_levels: 0.25, // 1H levels: -0.25% extra
    low_weight_levels: 0.15     // 15M levels: -0.15% extra
  },

  // 🆕 Minimum clearance from support
  support_clearance_pct: 0.5,  // SL must be 0.5% BELOW nearest support

  // TP Risk multiples
  tp_risk_multiples: {
    "EXTREME": { tp1: 1.5, tp2: 3.5, tp3: 7.0 },
    "HIGH": { tp1: 1.3, tp2: 3.0, tp3: 6.0 },
    "MEDIUM": { tp1: 1.2, tp2: 2.5, tp3: 5.0 },
    "LOW": { tp1: 1.0, tp2: 2.0, tp3: 4.0 }
  },

  // VP quality SL adjustment
  vp_quality_sl_adjustment: {
    "GOLDEN": 0.85,      // Tighter SL (-15%)
    "EXCELLENT": 0.92,   // Slightly tighter (-8%)
    "GOOD": 1.0,
    "MODERATE": 1.15     // Wider SL (+15%)
  },

  // Dynamic safety buffer (volatility-based)
  volatility_safety_buffer: {
    "EXTREME": 1.0,   // +1.0% extra for slippage
    "HIGH": 0.75,
    "MEDIUM": 0.5,
    "LOW": 0.3
  },

  // Minimum R:R ratios
  min_rr: {
    "EXTREME": 2.5,
    "HIGH": 2.0,
    "MEDIUM": 1.8,
    "LOW": 1.5
  }
};
```

### 📊 SL Calculation Process:

```javascript
function calculateStopLoss(coin, side, conviction, vpQuality, volatility) {
  const entry = coin.price;

  // 1️⃣ Get base SL distance from conviction
  const slTargets = SLTP_CONFIG.sl_distance_targets[conviction];
  let sl_distance_pct = slTargets.optimal;  // e.g., 7% for EXTREME

  // 2️⃣ Adjust for VP quality
  const vpAdj = SLTP_CONFIG.vp_quality_sl_adjustment[vpQuality];
  sl_distance_pct *= vpAdj;  // 7% × 0.85 = 5.95% for GOLDEN

  // 3️⃣ Adjust for volatility
  const volAdj = SLTP_CONFIG.volatility_sl_adjustment[volatility];
  sl_distance_pct *= volAdj;  // 5.95% × 1.0 = 5.95% for MEDIUM vol

  // 4️⃣ Check ATR minimum
  const atr_1h = coin.ta_1h.atr || 0;
  const atr_pct = (atr_1h / entry) * 100;
  const atr_multiplier = SLTP_CONFIG.atr_sl_multiplier[conviction];  // 1.5 for EXTREME
  const atr_min_distance = atr_pct * atr_multiplier;  // e.g., 2% × 1.5 = 3%

  sl_distance_pct = Math.max(sl_distance_pct, atr_min_distance);  // 5.95% (already > 3%)

  // 5️⃣ Calculate initial SL price
  let sl_price = side === "BUY"
    ? entry * (1 - sl_distance_pct / 100)
    : entry * (1 + sl_distance_pct / 100);

  // 6️⃣ Extract VP levels (supports for BUY, resistances for SELL)
  const vpLevels = extractVPLevels(coin, side);

  // 7️⃣ 🆕 SWEEP PROTECTION: Find nearest support ABOVE initial SL
  const nearestSupport = findNearestLevel(vpLevels.supports, sl_price, "above");

  if (nearestSupport) {
    const levelWeight = nearestSupport.weight;  // e.g., 3.0 for 4H level

    // Get sweep buffer
    let sweepBuffer = 0;
    if (levelWeight >= 2.5) sweepBuffer = 0.4;        // High-weight (4H)
    else if (levelWeight >= 2.0) sweepBuffer = 0.25;  // Medium-weight (1H)
    else sweepBuffer = 0.15;                           // Low-weight (15M)

    // Get support clearance
    const clearance = SLTP_CONFIG.support_clearance_pct;  // 0.5%

    // Total buffer below support
    const total_buffer_pct = sweepBuffer + clearance;  // 0.4% + 0.5% = 0.9%

    // Adjust SL to be BELOW support by total buffer
    const adjusted_sl = nearestSupport.price * (1 - total_buffer_pct / 100);

    // Use adjusted SL if it gives us better protection
    if (adjusted_sl < sl_price) {
      sl_price = adjusted_sl;
      console.log(`   🛡️  SL moved BELOW ${nearestSupport.tf} support (${nearestSupport.price}) by ${total_buffer_pct}%`);
    }
  }

  // 8️⃣ Add volatility safety buffer
  const safetyBuffer = SLTP_CONFIG.volatility_safety_buffer[volatility];  // 0.5% for MEDIUM
  sl_price *= (1 - safetyBuffer / 100);

  // 9️⃣ Validate SL is within min/max range
  const actualDistance = Math.abs((entry - sl_price) / entry) * 100;
  if (actualDistance < slTargets.min) {
    sl_price = entry * (1 - slTargets.min / 100);
  } else if (actualDistance > slTargets.max) {
    sl_price = entry * (1 - slTargets.max / 100);
  }

  return {
    sl_price: sl_price,
    sl_distance_pct: ((entry - sl_price) / entry) * 100,
    risk_usdt: position_size_usdt,
    nearest_support: nearestSupport
  };
}
```

**Primjer:**

```
Entry: $1.0544 (RLCUSDT)
Conviction: EXTREME
VP Quality: GOLDEN
Volatility: MEDIUM

Step 1: Base SL distance = 7% (optimal for EXTREME)
Step 2: VP adjustment = 7% × 0.85 = 5.95%
Step 3: Vol adjustment = 5.95% × 1.0 = 5.95%
Step 4: ATR check = 2% × 1.5 = 3% → OK (5.95% > 3%)
Step 5: Initial SL = $1.0544 × (1 - 0.0595) = $0.9917

Step 6: VP Levels:
  - 4H POC: $0.9980 (weight: 3.0)
  - 4H VA Low: $0.9850 (weight: 3.0)
  - 1H Support: $1.0200 (weight: 2.0)

Step 7: Nearest support ABOVE SL ($0.9917) = 4H POC ($0.9980)
  - Sweep buffer: 0.4% (high-weight)
  - Clearance: 0.5%
  - Total: 0.9%
  - Adjusted SL = $0.9980 × (1 - 0.009) = $0.9890 ✅

Step 8: Safety buffer = 0.5% → SL = $0.9890 × 0.995 = $0.9840

Step 9: Validate:
  - Actual distance = (1.0544 - 0.9840) / 1.0544 = 6.67%
  - Within range [5%, 10%] ✅

Final SL: $0.9840 (6.67% below entry)
```

### 🎯 TP Calculation:

```javascript
function calculateTakeProfits(coin, side, conviction, sl_data, marketScenario, sectorLeadership) {
  const entry = coin.price;
  const risk_distance = sl_data.sl_distance_pct;  // 6.67%

  // 1️⃣ Get TP risk multiples
  const tpMultiples = SLTP_CONFIG.tp_risk_multiples[conviction];
  // EXTREME: { tp1: 1.5, tp2: 3.5, tp3: 7.0 }

  // 2️⃣ Calculate base TP distances
  let tp1_distance = risk_distance * tpMultiples.tp1;  // 6.67% × 1.5 = 10.0%
  let tp2_distance = risk_distance * tpMultiples.tp2;  // 6.67% × 3.5 = 23.3%
  let tp3_distance = risk_distance * tpMultiples.tp3;  // 6.67% × 7.0 = 46.7%

  // 3️⃣ Apply scenario extension
  const scenario = marketScenario.scenario;
  const extension = SLTP_CONFIG.scenario_tp_extension[scenario] || 1.0;
  // PEAK_ALT_SEASON: 1.5

  tp1_distance *= extension;  // 10.0% × 1.5 = 15.0%
  tp2_distance *= extension;  // 23.3% × 1.5 = 35.0%
  tp3_distance *= extension;  // 46.7% × 1.5 = 70.0%

  // 4️⃣ Calculate TP prices
  const tp1_price = entry * (1 + tp1_distance / 100);  // $1.0544 × 1.15 = $1.2126
  const tp2_price = entry * (1 + tp2_distance / 100);  // $1.0544 × 1.35 = $1.4234
  const tp3_price = entry * (1 + tp3_distance / 100);  // $1.0544 × 1.70 = $1.7925

  // 5️⃣ Check VP resistance levels (snap to HVN/resistance if close)
  const vpLevels = extractVPLevels(coin, side);

  // Snap TP1 to nearest HVN if within 2%
  const nearestHVN_tp1 = findNearestLevel(vpLevels.hvn_levels, tp1_price, "any", 2);
  if (nearestHVN_tp1) {
    tp1_price = nearestHVN_tp1.price;
    console.log(`   🎯 TP1 snapped to ${nearestHVN_tp1.tf} HVN`);
  }

  // 6️⃣ Validate minimum R:R
  const minRR = SLTP_CONFIG.min_rr[conviction];  // 2.5 for EXTREME
  const actualRR_tp1 = (tp1_price - entry) / (entry - sl_data.sl_price);

  if (actualRR_tp1 < minRR) {
    // Adjust TP1 to meet minimum R:R
    tp1_price = entry + (minRR * (entry - sl_data.sl_price));
  }

  return {
    tp1: { price: tp1_price, size_pct: 33, label: "TP1" },
    tp2: { price: tp2_price, size_pct: 33, label: "TP2" },
    tp3: { price: tp3_price, size_pct: 34, label: "TP3" },
    rr_tp1: actualRR_tp1,
    rr_tp2: (tp2_price - entry) / (entry - sl_data.sl_price),
    rr_tp3: (tp3_price - entry) / (entry - sl_data.sl_price)
  };
}
```

**Primjer Output:**

```
Entry: $1.0544
SL: $0.9840 (6.67% below)
Risk: 90 USDT

TP1: $1.2126 (15.0% above) → 1.5 R:R → 33% position (135 USDT profit)
TP2: $1.4234 (35.0% above) → 3.5 R:R → 33% position (315 USDT profit)
TP3: $1.7925 (70.0% above) → 7.0 R:R → 34% position (630 USDT profit)

Total potential: +1080 USDT (+1200% ROI on 90 USDT risk)
```

### 📤 SL TP FINDER Output:

```json
{
  "symbol": "RLCUSDT",
  "price": 1.0544,
  "side": "BUY",
  "position_size_usdt": 90,
  "sl": {
    "price": 0.9840,
    "distance_pct": 6.67,
    "risk_usdt": 90,
    "nearest_support": {
      "price": 0.9980,
      "tf": "4H",
      "type": "POC",
      "weight": 3.0
    },
    "sweep_protection": "ACTIVE (-0.9% below support)"
  },
  "take_profits": [
    { "price": 1.2126, "size_pct": 33, "label": "TP1", "rr": 1.5 },
    { "price": 1.4234, "size_pct": 33, "label": "TP2", "rr": 3.5 },
    { "price": 1.7925, "size_pct": 34, "label": "TP3", "rr": 7.0 }
  ],
  "risk_reward": {
    "tp1_rr": 1.5,
    "tp2_rr": 3.5,
    "tp3_rr": 7.0,
    "avg_rr": 4.0
  }
}
```

---

## Node 3: LEVERAGE FINDER 📈

**File:** `leverage-finder.js` (25KB)
**Purpose:** Calculate optimal leverage based on conviction, volatility, and account risk tolerance
**Input:** Candidates + SL/TP from SL TP Finder
**Output:** Candidates + recommended leverage & quantity

### 🔧 Configuration:

```javascript
const LEVERAGE_CONFIG = {
  account_balance_usdt: 1000,  // Total account size
  max_risk_per_trade_pct: 10,  // Max 10% account risk per trade

  // Base leverage by conviction
  base_leverage: {
    "EXTREME": 8,
    "HIGH": 6,
    "MEDIUM": 4,
    "LOW": 3
  },

  // Volatility adjustments
  volatility_leverage_adjustment: {
    "EXTREME": 0.5,   // 50% reduction
    "HIGH": 0.75,     // 25% reduction
    "MEDIUM": 1.0,
    "LOW": 1.2        // 20% increase
  },

  // VP quality adjustments
  vp_leverage_adjustment: {
    "GOLDEN": 1.25,       // +25% leverage
    "EXCELLENT": 1.15,
    "GOOD": 1.0,
    "MODERATE": 0.85
  },

  // Market scenario adjustments
  scenario_leverage_adjustment: {
    "PEAK_ALT_SEASON": 1.2,
    "ALT_DECOUPLING": 1.1,
    "COIN_DECOUPLING": 1.05,
    "BTC_ONLY_RALLY": 0.7,
    "CAPITULATION": 0.5
  },

  // Absolute limits
  max_leverage: 10,
  min_leverage: 2
};
```

### 📊 Leverage Calculation:

```javascript
function calculateLeverage(coin, conviction, vpQuality, volatility, marketScenario, sl_distance_pct) {
  // 1️⃣ Get base leverage
  let leverage = LEVERAGE_CONFIG.base_leverage[conviction];  // 8 for EXTREME

  // 2️⃣ Adjust for volatility
  const volAdj = LEVERAGE_CONFIG.volatility_leverage_adjustment[volatility];
  leverage *= volAdj;  // 8 × 1.0 = 8 for MEDIUM volatility

  // 3️⃣ Adjust for VP quality
  const vpAdj = LEVERAGE_CONFIG.vp_leverage_adjustment[vpQuality];
  leverage *= vpAdj;  // 8 × 1.25 = 10 for GOLDEN

  // 4️⃣ Adjust for market scenario
  const scenario = marketScenario.scenario;
  const scenarioAdj = LEVERAGE_CONFIG.scenario_leverage_adjustment[scenario];
  leverage *= scenarioAdj;  // 10 × 1.2 = 12 for PEAK_ALT_SEASON

  // 5️⃣ Cap at max leverage
  leverage = Math.min(leverage, LEVERAGE_CONFIG.max_leverage);  // 12 → 10
  leverage = Math.max(leverage, LEVERAGE_CONFIG.min_leverage);  // 10 ≥ 2 ✅

  // 6️⃣ Round to nearest integer
  leverage = Math.round(leverage);  // 10

  // 7️⃣ Validate risk per trade
  const account_risk_usdt = LEVERAGE_CONFIG.account_balance_usdt *
    (LEVERAGE_CONFIG.max_risk_per_trade_pct / 100);  // 1000 × 0.10 = 100 USDT max risk

  const position_risk_usdt = coin.position_size_usdt;  // 90 USDT

  if (position_risk_usdt > account_risk_usdt) {
    // Reduce leverage proportionally
    leverage *= (account_risk_usdt / position_risk_usdt);  // 10 × (100/90) = 11.1 → 11
  }

  return Math.round(leverage);  // Final: 10
}
```

### 💰 Position Size Calculation:

```javascript
function calculatePositionQty(coin, position_size_usdt, leverage, sl_distance_pct) {
  const entry_price = coin.price;  // $1.0544

  // Total notional value
  const notional_value_usdt = position_size_usdt * leverage;  // 90 × 10 = 900 USDT

  // Quantity of coins
  const qty = notional_value_usdt / entry_price;  // 900 / 1.0544 = 853.64

  // Round to instrument precision (from instrument info)
  const minQty = coin.instrument?.minOrderQty || 1;
  const qtyStep = coin.instrument?.qtyStep || 1;

  const rounded_qty = Math.floor(qty / qtyStep) * qtyStep;  // 853

  // Validate minimum order size
  const actualNotional = rounded_qty * entry_price;  // 853 × 1.0544 = 899.40 USDT
  const minNotional = coin.instrument?.minNotionalValue || 10;

  if (actualNotional < minNotional) {
    console.error(`❌ Order too small: ${actualNotional} < ${minNotional}`);
    return null;
  }

  return {
    qty: rounded_qty,
    notional_value_usdt: actualNotional,
    capital_required_usdt: actualNotional / leverage,  // 899.40 / 10 = 89.94 USDT
    leverage: leverage
  };
}
```

### 📤 LEVERAGE FINDER Output:

```json
{
  "symbol": "RLCUSDT",
  "price": 1.0544,
  "side": "BUY",
  "leverage": 10,
  "qty": 853,
  "notional_value_usdt": 899.40,
  "capital_required_usdt": 89.94,
  "position_size_usdt": 90,
  "sl": {
    "price": 0.9840,
    "distance_pct": 6.67
  },
  "take_profits": [
    { "price": 1.2126, "size_pct": 33, "label": "TP1" },
    { "price": 1.4234, "size_pct": 33, "label": "TP2" },
    { "price": 1.7925, "size_pct": 34, "label": "TP3" }
  ],
  "risk": {
    "risk_usdt": 90,
    "risk_pct_of_account": 9.0,
    "max_loss_usdt": 90
  },
  "reward": {
    "tp1_profit_usdt": 135,
    "tp2_profit_usdt": 315,
    "tp3_profit_usdt": 630,
    "total_potential_usdt": 1080
  }
}
```

---

## Node 4: TRADE SELECTOR 🎯

**File:** `trade-selector.js` (18KB)
**Purpose:** Final filter & ranking - select top 10-20 trades to execute
**Input:** All candidates with SL/TP/Leverage
**Output:** Top trades ranked by composite score

### 🔧 Selection Criteria:

```javascript
const SELECTOR_CONFIG = {
  max_trades_to_execute: 20,        // Max trades per execution
  min_composite_score: 70,           // Minimum score to pass
  max_concurrent_positions: 5,       // Max open positions (from Position Manager)

  // Diversification
  max_per_sector: 3,                 // Max 3 trades per sector
  max_correlation: 0.7,              // Max correlation between selected trades

  // Risk management
  total_portfolio_risk_pct: 30,     // Max 30% total account at risk
  min_rr_ratio: 1.5,                 // Minimum R:R for any trade

  // Scoring weights
  composite_weights: {
    alpha_score: 0.30,
    conviction_score: 0.25,
    vp_quality_score: 0.20,
    rr_ratio: 0.15,
    liquidity_score: 0.10
  }
};
```

### 📊 Composite Scoring:

```javascript
function calculateCompositeScore(coin) {
  let score = 0;

  // 1. Alpha score (0-30 points)
  score += (coin.alpha_score / 100) * 30;

  // 2. Conviction score (0-25 points)
  const convictionPoints = {
    "EXTREME": 25,
    "HIGH": 18,
    "MEDIUM": 12,
    "LOW": 6
  };
  score += convictionPoints[coin.conviction];

  // 3. VP quality score (0-20 points)
  const vpPoints = {
    "GOLDEN": 20,
    "EXCELLENT": 15,
    "GOOD": 10,
    "MODERATE": 5
  };
  score += vpPoints[coin.vp_setup_quality];

  // 4. R:R ratio (0-15 points)
  const avgRR = (coin.take_profits[0].rr + coin.take_profits[1].rr + coin.take_profits[2].rr) / 3;
  score += Math.min((avgRR / 5) * 15, 15);  // Cap at 15 points

  // 5. Liquidity score (0-10 points)
  const volume24h = coin.derived.volume_24h_usdt || 0;
  const liquidityScore = Math.min((volume24h / 10_000_000) * 10, 10);
  score += liquidityScore;

  return Math.min(score, 100);
}
```

### 🎯 Selection Process:

```javascript
function selectTrades(candidates) {
  // 1️⃣ Calculate composite score for all
  candidates = candidates.map(c => ({
    ...c,
    composite_score: calculateCompositeScore(c)
  }));

  // 2️⃣ Filter by minimum score
  let qualified = candidates.filter(c =>
    c.composite_score >= SELECTOR_CONFIG.min_composite_score
  );

  console.log(`   ✅ ${qualified.length} candidates passed min score (70)`);

  // 3️⃣ Filter by minimum R:R
  qualified = qualified.filter(c => {
    const avgRR = (c.take_profits[0].rr + c.take_profits[1].rr + c.take_profits[2].rr) / 3;
    return avgRR >= SELECTOR_CONFIG.min_rr_ratio;
  });

  console.log(`   ✅ ${qualified.length} passed min R:R (1.5)`);

  // 4️⃣ Sort by composite score DESC
  qualified.sort((a, b) => b.composite_score - a.composite_score);

  // 5️⃣ Apply diversification (max 3 per sector)
  const sectorCounts = {};
  const diversified = [];

  for (const coin of qualified) {
    const sector = coin.sector_leadership?.sector || "unknown";
    const count = sectorCounts[sector] || 0;

    if (count < SELECTOR_CONFIG.max_per_sector) {
      diversified.push(coin);
      sectorCounts[sector] = count + 1;
    }

    if (diversified.length >= SELECTOR_CONFIG.max_trades_to_execute) {
      break;
    }
  }

  console.log(`   ✅ ${diversified.length} trades selected (diversified)`);

  // 6️⃣ Validate total portfolio risk
  const totalRisk = diversified.reduce((sum, c) => sum + c.position_size_usdt, 0);
  const accountBalance = SELECTOR_CONFIG.account_balance_usdt || 1000;
  const totalRiskPct = (totalRisk / accountBalance) * 100;

  if (totalRiskPct > SELECTOR_CONFIG.total_portfolio_risk_pct) {
    console.warn(`   ⚠️  Total risk ${totalRiskPct.toFixed(1)}% exceeds limit ${SELECTOR_CONFIG.total_portfolio_risk_pct}%`);
    // Reduce position sizes proportionally
    const scaleFactor = SELECTOR_CONFIG.total_portfolio_risk_pct / totalRiskPct;
    diversified.forEach(c => {
      c.position_size_usdt *= scaleFactor;
      c.qty = Math.floor(c.qty * scaleFactor);
    });
  }

  return diversified;
}
```

### 📤 TRADE SELECTOR Output:

```json
[
  {
    "rank": 1,
    "symbol": "RLCUSDT",
    "composite_score": 87.5,
    "alpha_score": 87.5,
    "conviction": "EXTREME",
    "vp_setup_quality": "GOLDEN",
    "avg_rr": 4.0,
    "side": "BUY",
    "price": 1.0544,
    "leverage": 10,
    "qty": 853,
    "sl": { "price": 0.9840 },
    "take_profits": [
      { "price": 1.2126, "size_pct": 33 },
      { "price": 1.4234, "size_pct": 33 },
      { "price": 1.7925, "size_pct": 34 }
    ],
    "sector": "defi"
  },
  {
    "rank": 2,
    "symbol": "AAVEUSDT",
    "composite_score": 82.3,
    // ...
  }
  // ... up to 20 trades
]
```

---

## Node 5: TRADE CLEANER 🧹

**File:** `trade-cleaner.js` (16KB)
**Purpose:** Format & validate data for Trade Runner API
**Input:** Selected trades from Trade Selector
**Output:** Clean JSON payload ready for execution

### 🔧 Cleaning Process:

```javascript
function cleanTradeData(trades) {
  return trades.map(trade => {
    // 1️⃣ Round prices to instrument precision
    const tickSize = trade.instrument?.tickSize || 0.0001;

    const entry_price = roundToTickSize(trade.price, tickSize);
    const sl_price = roundToTickSize(trade.sl.price, tickSize);
    const tp1_price = roundToTickSize(trade.take_profits[0].price, tickSize);
    const tp2_price = roundToTickSize(trade.take_profits[1].price, tickSize);
    const tp3_price = roundToTickSize(trade.take_profits[2].price, tickSize);

    // 2️⃣ Format symbol (remove "USDT" suffix for API)
    const symbol = trade.symbol.replace("USDT", "");

    // 3️⃣ Map side to API format
    const side = trade.side === "BUY" ? "Buy" : "Sell";

    // 4️⃣ Calculate TP quantities
    const tp1_qty = Math.floor(trade.qty * 0.33);
    const tp2_qty = Math.floor(trade.qty * 0.33);
    const tp3_qty = trade.qty - tp1_qty - tp2_qty;  // Remainder

    // 5️⃣ Create clean payload
    return {
      symbol: symbol,
      side: side,
      qty: trade.qty.toString(),
      leverage: trade.leverage,
      stop_loss: sl_price.toString(),
      take_profits: [
        {
          price: tp1_price.toString(),
          size_pct: 33,
          qty: tp1_qty.toString(),
          label: "TP1"
        },
        {
          price: tp2_price.toString(),
          size_pct: 33,
          qty: tp2_qty.toString(),
          label: "TP2"
        },
        {
          price: tp3_price.toString(),
          size_pct: 34,
          qty: tp3_qty.toString(),
          label: "TP3"
        }
      ],
      position_idx: 0,  // One-way mode
      skip_leverage: false,

      // Metadata for logging
      _metadata: {
        composite_score: trade.composite_score,
        conviction: trade.conviction,
        vp_quality: trade.vp_setup_quality,
        scenario: trade.market_scenario?.scenario,
        avg_rr: trade.avg_rr
      }
    };
  });
}

function roundToTickSize(price, tickSize) {
  return Math.round(price / tickSize) * tickSize;
}
```

### 📤 TRADE CLEANER Output:

```json
[
  {
    "symbol": "RLC",
    "side": "Buy",
    "qty": "853",
    "leverage": 10,
    "stop_loss": "0.9840",
    "take_profits": [
      {
        "price": "1.2126",
        "size_pct": 33,
        "qty": "281",
        "label": "TP1"
      },
      {
        "price": "1.4234",
        "size_pct": 33,
        "qty": "281",
        "label": "TP2"
      },
      {
        "price": "1.7925",
        "size_pct": 34,
        "qty": "291",
        "label": "TP3"
      }
    ],
    "position_idx": 0,
    "skip_leverage": false,
    "_metadata": {
      "composite_score": 87.5,
      "conviction": "EXTREME",
      "vp_quality": "GOLDEN",
      "scenario": "PEAK_ALT_SEASON",
      "avg_rr": 4.0
    }
  }
]
```

---

## Node 6: HTTP REQUEST 🚀

**Type:** `n8n-nodes-base.httpRequest`
**Purpose:** Send trades to Trade Runner API for execution
**Input:** Clean trade data from Trade Cleaner
**Output:** Execution results from Trade Runner

### 🔧 Configuration:

```json
{
  "url": "http://trade-runner:8000/webhook/trade",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{{ $json }}",
  "timeout": 30000
}
```

### 📤 Request Payload:

```json
{
  "symbol": "RLC",
  "side": "Buy",
  "qty": "853",
  "leverage": 10,
  "stop_loss": "0.9840",
  "take_profits": [
    { "price": "1.2126", "size_pct": 33, "qty": "281", "label": "TP1" },
    { "price": "1.4234", "size_pct": 33, "qty": "281", "label": "TP2" },
    { "price": "1.7925", "size_pct": 34, "qty": "291", "label": "TP3" }
  ],
  "position_idx": 0,
  "skip_leverage": false
}
```

### 📥 Expected Response:

```json
{
  "status": "success",
  "entry_order_id": "1234567890",
  "sl_order_id": "SL_abc123",
  "tp_order_ids": ["TP1_111", "TP2_222", "TP3_333"],
  "message": "Position opened successfully"
}
```

---

## Kompletni Flow Diagram 🔄

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA INGESTION                          │
├─────────────────────────────────────────────────────────────┤
│ • Bybit Tickers (price, volume, OI)                         │
│ • LunarCrush Data (alt_rank, galaxy_score, sentiment)       │
│ • TA Indicators (15m/1h/4h EMA, RSI, ADX, BB, ATR)         │
│ • Volume Profile (POC, VA, HVN/LVN)                         │
│ • Order Book (bid/ask imbalance)                            │
│ • Funding Rate History                                      │
│ • Instrument Info (leverage limits, tick size)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTIVE JS ENGINE v8                     │
├─────────────────────────────────────────────────────────────┤
│ • Scores 900+ coins                                          │
│ • Applies weighted ranking:                                  │
│   - Liquidity (20%)                                          │
│   - Social momentum (30%)                                    │
│   - Rank jumps (28%)                                         │
│   - Market momentum (20%)                                    │
│   - Category bonus (2%)                                      │
│ • Filters to top 50 "beast-mode" candidates                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              NODE 1: RATING (Multi-TF Regime)               │
├─────────────────────────────────────────────────────────────┤
│ 1. BTC Multi-TF Regime (15m/1h/4h)                          │
│    → BULL/BEAR/NEUTRAL + Confidence + Strength              │
│                                                              │
│ 2. BTC Dominance Calculation                                │
│    → RISING/FALLING/NEUTRAL                                 │
│                                                              │
│ 3. Market Scenario Detection                                │
│    → PEAK_ALT_SEASON / ALT_DECOUPLING / BTC_ONLY_RALLY /   │
│      CAPITULATION / COIN_DECOUPLING / FUNDING_DIVERGENCE    │
│                                                              │
│ 4. Sector Leadership Scoring                                │
│    → Is coin outperforming its sector?                      │
│                                                              │
│ 5. Volume Profile Scoring (Multi-TF)                        │
│    → GOLDEN / EXCELLENT / GOOD / MODERATE                   │
│                                                              │
│ 6. Side Decision (BUY/SELL)                                 │
│    → Conviction: EXTREME / HIGH / MEDIUM / LOW              │
│                                                              │
│ 7. V2 Tiered Position Sizing                               │
│    → 30-90 USDT (conviction × VP × vol × scenario)         │
│                                                              │
│ 8. Enhanced Alpha Score                                     │
│    → Composite 0-100                                         │
│                                                              │
│ OUTPUT: Top 10-20 candidates with position sizes            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         NODE 2: SL TP FINDER (Sweep Protection)             │
├─────────────────────────────────────────────────────────────┤
│ 1. Extract VP Levels (supports/resistances/POC/HVN)        │
│    → Multi-TF priority: 4H (3.0) > 1H (2.0) > 15M (1.5)    │
│                                                              │
│ 2. Calculate Base SL Distance                              │
│    → Conviction-based (EXTREME: 7%, LOW: 12%)               │
│    → VP quality adjustment (GOLDEN: 0.85×)                  │
│    → Volatility adjustment                                  │
│                                                              │
│ 3. ATR Minimum Check                                        │
│    → SL must be ≥ 1.5-2.2× ATR                             │
│                                                              │
│ 4. 🛡️ SWEEP PROTECTION (V2)                                │
│    → Find nearest support ABOVE initial SL                  │
│    → Add sweep buffer (0.15-0.4% below support)            │
│    → Add clearance (0.5% below support)                     │
│    → Move SL BELOW support by total buffer                  │
│                                                              │
│ 5. Safety Buffer (volatility-based)                        │
│    → +0.3-1.0% for slippage                                 │
│                                                              │
│ 6. Calculate TPs                                            │
│    → TP1/TP2/TP3 = Risk × Multiples × Scenario Extension   │
│    → Snap to HVN/resistance if within 2%                    │
│    → Validate minimum R:R (1.5-2.5)                         │
│                                                              │
│ OUTPUT: Candidates + SL/TP prices + R:R ratios              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           NODE 3: LEVERAGE FINDER (Dynamic)                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Base Leverage (by conviction)                            │
│    → EXTREME: 8×, HIGH: 6×, MEDIUM: 4×, LOW: 3×            │
│                                                              │
│ 2. Volatility Adjustment                                    │
│    → EXTREME vol: 0.5× (halve leverage)                     │
│    → LOW vol: 1.2× (increase 20%)                           │
│                                                              │
│ 3. VP Quality Adjustment                                    │
│    → GOLDEN: 1.25× (boost leverage)                         │
│    → MODERATE: 0.85× (reduce leverage)                      │
│                                                              │
│ 4. Scenario Adjustment                                      │
│    → PEAK_ALT_SEASON: 1.2×                                  │
│    → CAPITULATION: 0.5×                                     │
│                                                              │
│ 5. Cap at Max Leverage (2-10×)                              │
│                                                              │
│ 6. Validate Account Risk                                    │
│    → Max 10% account risk per trade                         │
│                                                              │
│ 7. Calculate Position Qty                                   │
│    → Qty = (Position Size × Leverage) / Entry Price        │
│    → Round to instrument precision                          │
│                                                              │
│ OUTPUT: Candidates + leverage + qty                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          NODE 4: TRADE SELECTOR (Final Filter)              │
├─────────────────────────────────────────────────────────────┤
│ 1. Calculate Composite Score                                │
│    → Alpha (30%) + Conviction (25%) + VP (20%) +           │
│      R:R (15%) + Liquidity (10%)                            │
│                                                              │
│ 2. Filter by Min Score (70)                                │
│                                                              │
│ 3. Filter by Min R:R (1.5)                                  │
│                                                              │
│ 4. Sort by Composite Score DESC                            │
│                                                              │
│ 5. Apply Diversification                                    │
│    → Max 3 trades per sector                                │
│    → Limit to top 20 trades                                 │
│                                                              │
│ 6. Validate Total Portfolio Risk                           │
│    → Max 30% total account at risk                          │
│    → Scale down positions if exceeded                       │
│                                                              │
│ OUTPUT: Top 10-20 trades ranked by score                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           NODE 5: TRADE CLEANER (Format Data)               │
├─────────────────────────────────────────────────────────────┤
│ 1. Round Prices to Tick Size                               │
│    → Bybit precision (e.g., 0.0001 for most pairs)         │
│                                                              │
│ 2. Format Symbol                                            │
│    → Remove "USDT" suffix (RLCUSDT → RLC)                   │
│                                                              │
│ 3. Map Side to API Format                                  │
│    → BUY → "Buy", SELL → "Sell"                             │
│                                                              │
│ 4. Calculate TP Quantities                                  │
│    → TP1: 33%, TP2: 33%, TP3: 34% (remainder)              │
│                                                              │
│ 5. Create Clean JSON Payload                               │
│    → Compatible with Trade Runner API                       │
│                                                              │
│ OUTPUT: Clean trade payloads ready for execution            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│        NODE 6: HTTP REQUEST (Trade Execution)               │
├─────────────────────────────────────────────────────────────┤
│ POST http://trade-runner:8000/webhook/trade                │
│                                                              │
│ For each trade:                                              │
│   1. Validate position (max 5 long / 5 short)              │
│   2. Check duplicate position                               │
│   3. Set leverage (if not skip_leverage)                    │
│   4. Place entry order (Market)                             │
│   5. Place SL order (Stop Market)                           │
│   6. Place TP1/TP2/TP3 orders (Limit)                      │
│                                                              │
│ OUTPUT: Order IDs + execution status                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Kritične Preporuke & Improvements 💡

### 1. **Risk Management**

**Problem:** Trenutno nema hard limit na broj istovremenih pozicija.

**Rješenje:**
```javascript
// U Trade Selector node-u dodaj:
const POSITION_MANAGER = {
  max_concurrent_positions: 5,
  max_exposure_usdt: 500,  // Max 50% account if account = 1000
  correlation_threshold: 0.7
};

// Pre selekcije, fetch active positions from Trade Runner
const activePositions = await fetchActivePositions();

if (activePositions.length >= POSITION_MANAGER.max_concurrent_positions) {
  console.warn("❌ Max concurrent positions reached. Skipping execution.");
  return [];
}
```

### 2. **Liquidity Sweeps - Enhanced**

**Problem:** V2 sweep protection je dobra, ali bi mogla biti bolja za extreme vol markets.

**Rješenje:**
```javascript
// U SL TP Finder node-u:
function calculateDynamicSweepBuffer(level, volatility, volume24h) {
  let buffer = 0;

  // Base buffer by level weight
  if (level.weight >= 2.5) buffer = 0.4;
  else if (level.weight >= 2.0) buffer = 0.25;
  else buffer = 0.15;

  // Increase buffer in high volatility
  if (volatility === "EXTREME") buffer *= 1.5;  // 0.4% → 0.6%
  else if (volatility === "HIGH") buffer *= 1.25;

  // Increase buffer for low liquidity coins
  if (volume24h < 1_000_000) buffer *= 1.3;

  return buffer;
}
```

### 3. **Correlation Analysis**

**Problem:** Može se desiti da se odabere 10 DeFi tokena koji su visoko korelisani.

**Rješenje:**
```javascript
// U Trade Selector node-u:
function filterByCorrelation(trades, maxCorrelation = 0.7) {
  const selected = [trades[0]];  // Always take #1

  for (let i = 1; i < trades.length; i++) {
    const candidate = trades[i];
    let isUncorrelated = true;

    for (const existing of selected) {
      const correlation = calculateCorrelation(
        candidate.derived.pct_history_24h,
        existing.derived.pct_history_24h
      );

      if (correlation > maxCorrelation) {
        isUncorrelated = false;
        console.log(`   ⚠️  ${candidate.symbol} correlated with ${existing.symbol} (${correlation.toFixed(2)})`);
        break;
      }
    }

    if (isUncorrelated) {
      selected.push(candidate);
    }

    if (selected.length >= 20) break;
  }

  return selected;
}
```

### 4. **Drawdown Protection**

**Problem:** Nema zaštite kada portfolio gubi previše.

**Rješenje:**
```javascript
// Pre izvršavanja novih trade-ova, proveri drawdown:
const DRAWDOWN_CONFIG = {
  max_drawdown_pct: 20,  // Stop trading if down 20%
  recovery_threshold_pct: 10  // Resume when recovered to -10%
};

async function checkDrawdownProtection() {
  const accountBalance = await fetchAccountBalance();
  const initialBalance = 1000;  // Store this in DB

  const currentDrawdown = ((initialBalance - accountBalance) / initialBalance) * 100;

  if (currentDrawdown >= DRAWDOWN_CONFIG.max_drawdown_pct) {
    console.error(`💀 DRAWDOWN PROTECTION: ${currentDrawdown.toFixed(1)}% loss. Halting trades.`);
    return false;  // Stop trading
  }

  return true;  // Continue trading
}
```

### 5. **Backtesting Integration**

**Problem:** Nema backtesting-a pre deploy-a.

**Rješenje:**
```javascript
// Kreirati Backtest Node koji simulira trading:
function backtestStrategy(historicalData, startDate, endDate) {
  let balance = 1000;
  const trades = [];

  for (const day of historicalData) {
    // Run Rating → SL TP Finder → Leverage Finder → Selector
    const selectedTrades = runStrategy(day.data);

    // Simulate execution
    for (const trade of selectedTrades) {
      const result = simulateTrade(trade, day.futureData);
      balance += result.pnl;
      trades.push({ ...trade, ...result });
    }
  }

  return {
    final_balance: balance,
    roi: ((balance - 1000) / 1000) * 100,
    win_rate: calculateWinRate(trades),
    max_drawdown: calculateMaxDrawdown(trades),
    sharpe_ratio: calculateSharpe(trades)
  };
}
```

### 6. **Real-Time Monitoring Dashboard**

**Problem:** Ne vidiš šta se dešava u real-time.

**Rješenje:**
- Dodaj **WebSocket connection** sa Bybit-om za real-time price updates
- Kreirati **Dashboard UI** (React + Kibo UI) koji prikazuje:
  - Active positions
  - P&L real-time
  - Upcoming TP/SL levels
  - Drawdown meter
  - BTC regime live indicator

### 7. **Emergency Stop**

**Problem:** Ako market crash-uje, nema panic button-a.

**Rješenje:**
```javascript
// Dodaj Emergency Stop HTTP endpoint:
app.post("/emergency-stop", async (req, res) => {
  console.error("🚨 EMERGENCY STOP TRIGGERED");

  // 1. Cancel all pending orders
  await cancelAllOrders();

  // 2. Close all positions at market price
  await closeAllPositions("market");

  // 3. Disable automated trading
  await setTradingEnabled(false);

  res.json({ status: "All positions closed, trading disabled" });
});
```

### 8. **Performance Tracking**

**Problem:** Ne znaš koliko je svaki node uspešan.

**Rješenje:**
```javascript
// Dodaj logging za svaki node:
const performanceLog = {
  rating_node: {
    total_processed: 900,
    passed_to_next: 50,
    pass_rate: 5.5
  },
  sl_tp_finder: {
    total_processed: 50,
    passed_to_next: 45,
    avg_rr: 3.2
  },
  leverage_finder: {
    total_processed: 45,
    avg_leverage: 7.2
  },
  trade_selector: {
    total_processed: 45,
    selected: 18,
    selection_rate: 40
  },
  trade_cleaner: {
    total_processed: 18,
    formatted: 18
  },
  http_request: {
    total_sent: 18,
    successful: 16,
    failed: 2,
    success_rate: 88.9
  }
};

// Store in DB and visualize in dashboard
```

---

## Zaključak 🎓

Ovo je **world-class** trading system sa:

✅ Multi-timeframe BTC regime detection
✅ Market scenario analysis (ALT_SEASON, CAPITULATION, itd.)
✅ Tiered position sizing (30-90 USDT)
✅ Volume Profile integration (S-tier)
✅ Liquidity sweep protection
✅ Dynamic leverage (2-10×)
✅ Sector diversification
✅ Risk management (max 10% per trade, 30% total)

**Sledeći Koraci:**
1. Implement preporuke (#1-8)
2. Backtest na istorijskim podacima
3. Deploy na testnet prvo
4. Paper trading 1-2 nedelje
5. Live sa malim capital-om ($100-500)
6. Scale up postupno

---

**Status:** Ready for Production (sa preporukama implementiranim)
**Risk Level:** Medium-High (futures trading sa leverage-om)
**Recommended Starting Capital:** $500-1000 USDT

**Author:** Claude (Bybit Leverage Workflow Analysis)
**Date:** November 2025
**Version:** V2
