/**
 * fixtures.js — Realistic canned payloads for all 12 MCP tools.
 *
 * Shapes are built from the REAL tool source files in
 * backend/src/mcp/public/tools/*.ts.  Data is vivid and plausible so
 * demo/marketing screenshots look real.
 *
 * Each export is either a plain object or a function(symbol) for ticker-scoped
 * tools.  The poller calls these as fixtures[toolName](args) or fixtures[toolName].
 */

const NOW = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// get_market_stats
// ---------------------------------------------------------------------------
// Byte-identical to the live wire shape: this legacy tool is snake_case and
// carries no overall sentiment index / bull-bear ratio / alert count. The panel
// derives an overall read from the three index sentiments.
export const get_market_stats = {
  spy_put_call_ratio: 0.78,
  qqq_put_call_ratio: 0.65,
  iwm_put_call_ratio: 1.12,
  spy_sentiment: 'Bullish',
  qqq_sentiment: 'Bullish',
  iwm_sentiment: 'Bearish',
  largest_trade_premium: 3_840_000,
  largest_trade_symbol: 'NVDA260710C00185000',
  largest_trade_strike: 185,
  largest_trade_expiry: '07/10/26',
  largest_trade_type: 'CALL',
  tradingDate: '2026-07-07',
  timestamp: NOW(),
  marketOpen: true,
};

// ---------------------------------------------------------------------------
// get_unusual_activity
// ---------------------------------------------------------------------------
const UA_ROWS = [
  {
    id: 'ua-001', tradeTime: '2026-07-07T13:45:22Z',
    ticker: 'NVDA', type: 'CALL', premium: 3_840_000, volume: 4200, openInterest: 18900,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 94,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 22.2, vsADV: 380.1,
    flowDescription: 'Aggressive sweep across 7 exchanges — institutional accumulation pattern',
    tier: 'LEGENDARY', tierColor: '#f59e0b', tierDescription: 'Top 5% unusual flow',
    repeatCount: 3, clusterId: 'cl-nvda-1', convictionLevel: 'ultra-high',
    isRepeatFlow: true, sentimentAction: 'bought calls', sentimentLabel: 'Bullish Conviction',
    sentimentDescription: 'Large call sweep — buyer is paying for upside exposure aggressively',
    sentimentExplanation: 'CALL bought on ask signals directional conviction, not hedging',
    isDivergentFlow: false, moneynessPct: 2.4, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-002', tradeTime: '2026-07-07T13:42:07Z',
    ticker: 'SPY', type: 'PUT', premium: 2_150_000, volume: 9100, openInterest: 42000,
    sentiment: 'Bearish', sentimentConfidence: 'high', score: 87,
    tradeType: 'block', executionSpeed: 'normal', vsOI: 21.7, vsADV: 210.3,
    flowDescription: 'Sizable put block — large hedge or directional short bet ahead of FOMC',
    tier: 'ELITE', tierColor: '#8b5cf6', tierDescription: 'Top 10% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'high',
    isRepeatFlow: false, sentimentAction: 'bought puts', sentimentLabel: 'Hedge', flowIntent: 'hedge',
    sentimentDescription: 'Put block bought on ask — downside protection or directional bet',
    sentimentExplanation: 'PUT bought on ask at market close time suggests macro hedge',
    isDivergentFlow: false, moneynessPct: -1.8, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-003', tradeTime: '2026-07-07T13:38:55Z',
    ticker: 'TSLA', type: 'CALL', premium: 1_920_000, volume: 6800, openInterest: 31200,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 89,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 21.8, vsADV: 295.4,
    flowDescription: 'Multi-leg sweep — aggressive call buying ahead of earnings catalyst',
    tier: 'ELITE', tierColor: '#8b5cf6', tierDescription: 'Top 10% unusual flow',
    repeatCount: 2, clusterId: 'cl-tsla-1', convictionLevel: 'high',
    isRepeatFlow: true, sentimentAction: 'bought calls', sentimentLabel: 'Bullish Conviction',
    sentimentDescription: 'Repeated call sweeps confirm institutional accumulation',
    sentimentExplanation: 'CALL bought on ask, repeat flow = rising conviction',
    isDivergentFlow: false, moneynessPct: 3.1, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-004', tradeTime: '2026-07-07T13:35:11Z',
    ticker: 'AAPL', type: 'CALL', premium: 1_340_000, volume: 3100, openInterest: 22400,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 81,
    tradeType: 'block', executionSpeed: 'normal', vsOI: 13.8, vsADV: 142.7,
    flowDescription: 'Institutional call block — quiet accumulation before product event',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought calls', sentimentLabel: 'Bullish',
    sentimentDescription: 'Call block signals bullish positioning or overwrite rollout',
    sentimentExplanation: 'CALL bought slightly above mid — directional lean',
    isDivergentFlow: false, moneynessPct: 1.2, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-005', tradeTime: '2026-07-07T13:30:44Z',
    ticker: 'AMD', type: 'CALL', premium: 975_000, volume: 2800, openInterest: 14900,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 78,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 18.8, vsADV: 188.2,
    flowDescription: 'Call sweep on pullback — smart money buying dip in semis',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought calls', sentimentLabel: 'Bullish',
    sentimentDescription: 'Sweep on bid side — opportunistic upside capture',
    sentimentExplanation: 'CALL bought on pullback, sweep pattern = urgency',
    isDivergentFlow: false, moneynessPct: 2.8, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-006', tradeTime: '2026-07-07T13:27:18Z',
    ticker: 'META', type: 'CALL', premium: 2_610_000, volume: 5400, openInterest: 28700,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 92,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 18.8, vsADV: 312.5,
    flowDescription: 'Massive call sweep — AI infrastructure play, near 52-week high',
    tier: 'LEGENDARY', tierColor: '#f59e0b', tierDescription: 'Top 5% unusual flow',
    repeatCount: 2, clusterId: 'cl-meta-1', convictionLevel: 'ultra-high',
    isRepeatFlow: true, sentimentAction: 'bought calls', sentimentLabel: 'Bullish Conviction',
    sentimentDescription: 'Repeat call sweeps — size and speed signal institutional intent',
    sentimentExplanation: 'CALL sweep on ask repeated = persistent buy interest',
    isDivergentFlow: false, moneynessPct: 1.5, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-007', tradeTime: '2026-07-07T13:22:03Z',
    ticker: 'QQQ', type: 'PUT', premium: 890_000, volume: 3200, openInterest: 67500,
    sentiment: 'Bearish', sentimentConfidence: 'high', score: 74,
    tradeType: 'block', executionSpeed: 'normal', vsOI: 4.7, vsADV: 89.4,
    flowDescription: 'Macro hedge — large put block to protect tech exposure',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought puts', sentimentLabel: 'Hedge', flowIntent: 'hedge',
    sentimentDescription: 'Put block in QQQ suggests portfolio protection, not panic',
    sentimentExplanation: 'PUT block bought at mid — typical hedging behavior',
    isDivergentFlow: false, moneynessPct: -2.1, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-008', tradeTime: '2026-07-07T13:18:47Z',
    ticker: 'MSFT', type: 'CALL', premium: 1_120_000, volume: 2400, openInterest: 19300,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 82,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 12.4, vsADV: 165.0,
    flowDescription: 'Call sweep — Azure cloud momentum, AI spending thesis intact',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought calls', sentimentLabel: 'Bullish',
    sentimentDescription: 'Sweep signals buyers view dip as opportunity',
    sentimentExplanation: 'CALL bought on ask with urgency pattern',
    isDivergentFlow: false, moneynessPct: 2.0, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-009', tradeTime: '2026-07-07T13:15:22Z',
    ticker: 'AMZN', type: 'CALL', premium: 1_680_000, volume: 3900, openInterest: 24100,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 86,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 16.2, vsADV: 241.0,
    flowDescription: 'Call sweep ahead of AWS earnings catalyst — smart money loading',
    tier: 'ELITE', tierColor: '#8b5cf6', tierDescription: 'Top 10% unusual flow',
    repeatCount: 2, clusterId: 'cl-amzn-1', convictionLevel: 'high',
    isRepeatFlow: true, sentimentAction: 'bought calls', sentimentLabel: 'Bullish Conviction',
    sentimentDescription: 'Repeat sweeps confirm institutional intent before print',
    sentimentExplanation: 'CALL sweep pattern with repeat = high conviction directional',
    isDivergentFlow: false, moneynessPct: 2.5, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-010', tradeTime: '2026-07-07T13:10:05Z',
    ticker: 'GS', type: 'CALL', premium: 620_000, volume: 1400, openInterest: 8900,
    sentiment: 'Bullish', sentimentConfidence: 'inferred', score: 71,
    tradeType: 'block', executionSpeed: 'normal', vsOI: 15.7, vsADV: 123.4,
    flowDescription: 'Financials call block — rate cut narrative reawakening',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought calls', sentimentLabel: 'Bullish',
    sentimentDescription: 'Call block in financials aligns with steepening yield curve',
    sentimentExplanation: 'CALL bought at mid slightly — directional but measured',
    isDivergentFlow: false, moneynessPct: 1.8, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-011', tradeTime: '2026-07-07T13:05:33Z',
    ticker: 'XOM', type: 'PUT', premium: 520_000, volume: 2100, openInterest: 16400,
    sentiment: 'Bearish', sentimentConfidence: 'high', score: 73,
    tradeType: 'sweep', executionSpeed: 'normal', vsOI: 12.8, vsADV: 198.7,
    flowDescription: 'Energy put sweep — oil demand uncertainty, China growth fears',
    tier: 'NOTABLE', tierColor: '#3b82f6', tierDescription: 'Top 20% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'medium',
    isRepeatFlow: false, sentimentAction: 'bought puts', sentimentLabel: 'Bearish', flowIntent: 'directional',
    sentimentDescription: 'Put sweep signals near-term downside bet in energy',
    sentimentExplanation: 'PUT bought on ask — directional short, not portfolio hedge',
    isDivergentFlow: false, moneynessPct: -1.5, moneynessBucket: 'OTM',
  },
  {
    id: 'ua-012', tradeTime: '2026-07-07T13:01:11Z',
    ticker: 'GOOGL', type: 'CALL', premium: 1_430_000, volume: 2900, openInterest: 21800,
    sentiment: 'Bullish', sentimentConfidence: 'high', score: 84,
    tradeType: 'sweep', executionSpeed: 'fast', vsOI: 13.3, vsADV: 178.6,
    flowDescription: 'Search monopoly narrative intact — call sweep into ad revenue data',
    tier: 'ELITE', tierColor: '#8b5cf6', tierDescription: 'Top 10% unusual flow',
    repeatCount: 1, clusterId: null, convictionLevel: 'high',
    isRepeatFlow: false, sentimentAction: 'bought calls', sentimentLabel: 'Bullish',
    sentimentDescription: 'Call sweep signals buyers positioning for upside into print',
    sentimentExplanation: 'CALL sweep on ask — urgency suggests time-sensitive bet',
    isDivergentFlow: false, moneynessPct: 2.2, moneynessBucket: 'OTM',
  },
];

export const get_unusual_activity = {
  data: UA_ROWS,
  total: UA_ROWS.length,
  aggregates: {
    totalPremium: UA_ROWS.reduce((s, r) => s + r.premium, 0),
    bullishPremium: UA_ROWS.filter((r) => r.sentiment === 'Bullish').reduce((s, r) => s + r.premium, 0),
    bearishPremium: UA_ROWS.filter((r) => r.sentiment === 'Bearish').reduce((s, r) => s + r.premium, 0),
    bullishCount: UA_ROWS.filter((r) => r.sentiment === 'Bullish').length,
    bearishCount: UA_ROWS.filter((r) => r.sentiment === 'Bearish').length,
    avgScore: parseFloat((UA_ROWS.reduce((s, r) => s + r.score, 0) / UA_ROWS.length).toFixed(1)),
    topTicker: 'NVDA',
    topPremium: 3_840_000,
  },
  filters: { ticker: null, direction: null, minPremium: null, limit: 25 },
  timestamp: NOW(),
};

// ---------------------------------------------------------------------------
// get_gex_overview
// ---------------------------------------------------------------------------
function makeGexSymbol(sym, totalGex, bias) {
  const byStrike = [470, 480, 490, 500, 510, 520, 530].map((strike, i) => ({
    strike,
    callGex: Math.round((i - 2) * 1.2e9 + 2e9),
    putGex: Math.round((3 - i) * 0.9e9 - 1.5e9),
    netGex: Math.round((i - 2) * 0.8e9 + 0.5e9),
    callOi: 12000 + i * 800,
    putOi: 9000 + (6 - i) * 700,
    callGamma: parseFloat((0.008 + i * 0.002).toFixed(4)),
    putGamma: parseFloat((0.009 - i * 0.0015).toFixed(4)),
    distanceFromSpot: parseFloat(((strike - 499) / 499 * 100).toFixed(2)),
    isAboveSpot: strike >= 499,
  }));
  return { symbol: sym, totalGEX: totalGex, callGex: totalGex * 0.62, putGex: totalGex * -0.38,
    netGex: totalGex, flipPoint: 487, spot: 499, bias, byStrike };
}

export const get_gex_overview = {
  SPY: makeGexSymbol('SPY', 4.8e9, 'LONG_GAMMA'),
  QQQ: makeGexSymbol('QQQ', 2.1e9, 'LONG_GAMMA'),
  SPX: makeGexSymbol('SPX', 11.4e9, 'LONG_GAMMA'),
  marketSummary: {
    totalGEX: 18.3e9,
    bias: 'LONG_GAMMA',
    interpretation: 'Market makers are net long gamma. Expect mean reversion and dampened volatility.',
  },
};

// ---------------------------------------------------------------------------
// get_gex_ticker — function(symbol)
// ---------------------------------------------------------------------------
export function get_gex_ticker(args) {
  const sym = (args?.symbol ?? 'NVDA').toUpperCase();
  const base = sym === 'NVDA' ? 1.2e9 : 0.8e9;
  const spot = sym === 'NVDA' ? 128.45 : 125;
  const byStrike = [100, 110, 120, 130, 140].map((strike, i) => ({
    strike, callGex: base * (0.3 + i * 0.1), putGex: -base * (0.25 - i * 0.04),
    netGex: base * (0.05 + i * 0.06), callOi: 5000 + i * 400, putOi: 4000 + (4-i)*350,
    callGamma: 0.012 + i * 0.003, putGamma: 0.011 - i * 0.002,
    distanceFromSpot: parseFloat(((strike - spot) / spot * 100).toFixed(2)),
    isAboveSpot: strike >= spot,
  }));
  return {
    symbol: sym, totalGEX: base * 1.4, callGex: base * 0.9, putGex: -base * 0.5,
    netGex: base * 1.4, flipPoint: 118, spot, bias: 'LONG_GAMMA', byStrike,
    proxy: sym === 'QQQ' ? { symbol: 'NQ', scaleFactor: 0.24 } : null,
  };
}

// ---------------------------------------------------------------------------
// get_sector_flow
// ---------------------------------------------------------------------------
const SECTORS = [
  { sym: 'XLK', name: 'Technology',           flowNet: 4_200_000, chgPct:  1.82, flowSide: 'calls', sentiment: 78, avgConviction: 83, cpRatio: 0.61, cylinders: 'bullish' },
  { sym: 'XLY', name: 'Consumer Discretionary',flowNet: 2_100_000, chgPct:  0.94, flowSide: 'calls', sentiment: 65, avgConviction: 71, cpRatio: 0.74, cylinders: null },
  { sym: 'XLF', name: 'Financials',            flowNet: 1_800_000, chgPct:  0.72, flowSide: 'calls', sentiment: 62, avgConviction: 68, cpRatio: 0.80, cylinders: null },
  { sym: 'XLE', name: 'Energy',               flowNet: -980_000,  chgPct: -0.65, flowSide: 'puts',  sentiment: 38, avgConviction: 61, cpRatio: 1.42, cylinders: 'bearish' },
  { sym: 'XLV', name: 'Health Care',          flowNet:  420_000,  chgPct:  0.21, flowSide: 'calls', sentiment: 54, avgConviction: 59, cpRatio: 0.98, cylinders: null },
  { sym: 'XLI', name: 'Industrials',          flowNet:  310_000,  chgPct:  0.18, flowSide: 'calls', sentiment: 55, avgConviction: 57, cpRatio: 0.95, cylinders: null },
  { sym: 'XLC', name: 'Communication Svcs',   flowNet: 1_640_000, chgPct:  0.88, flowSide: 'calls', sentiment: 64, avgConviction: 72, cpRatio: 0.77, cylinders: null },
  { sym: 'XLU', name: 'Utilities',            flowNet: -120_000,  chgPct: -0.09, flowSide: 'puts',  sentiment: 46, avgConviction: 50, cpRatio: 1.08, cylinders: null },
  { sym: 'XLRE',name: 'Real Estate',          flowNet: -210_000,  chgPct: -0.14, flowSide: 'puts',  sentiment: 44, avgConviction: 48, cpRatio: 1.18, cylinders: null },
  { sym: 'XLB', name: 'Materials',            flowNet:  180_000,  chgPct:  0.12, flowSide: 'calls', sentiment: 52, avgConviction: 54, cpRatio: 1.02, cylinders: null },
  { sym: 'XLP', name: 'Consumer Staples',     flowNet: -80_000,   chgPct: -0.06, flowSide: 'puts',  sentiment: 47, avgConviction: 49, cpRatio: 1.05, cylinders: null },
].map((s) => ({
  ...s, last: 450 + Math.random() * 100,
  sparkline: Array.from({ length: 20 }, (_, i) => 450 + Math.sin(i * 0.4) * 8 + Math.random() * 3),
  sentimentSpark: Array.from({ length: 10 }, (_, i) => (s.sentiment - 50) * 0.8 + Math.sin(i) * 5),
  hasEtf: true, pills: [],
}));

export const get_sector_flow = {
  window: 'today',
  macro: {
    label: 'Risk-On',
    description: 'Smart money is broadly buying calls across mega-cap tech. Rotation away from defensives.',
    riskOnScore: 74,
    dominantSector: 'Technology',
    dominantFlow: 'calls',
  },
  sectors: SECTORS,
  subsectors: [
    { sym: 'SMH', name: 'Semiconductors', flowNet: 3_100_000, chgPct: 2.14, flowSide: 'calls', sentiment: 82, avgConviction: 88, cpRatio: 0.55, cylinders: 'bullish', last: 248, sparkline: [240,242,244,247,245,246,248,249,251,250,248], sentimentSpark: [20,25,30,28,32,35,30,28,32,34], hasEtf: true, pills: [] },
    { sym: 'IGV', name: 'Software',       flowNet: 1_200_000, chgPct: 1.02, flowSide: 'calls', sentiment: 68, avgConviction: 72, cpRatio: 0.72, cylinders: null,      last: 98,  sparkline: [95,96,97,97,98,98,99,98,99,100,98], sentimentSpark: [10,12,15,13,14,16,14,15,16,15], hasEtf: true, pills: [] },
    { sym: 'XBI', name: 'Biotech',        flowNet: -340_000,  chgPct:-0.44, flowSide: 'puts',  sentiment: 40, avgConviction: 55, cpRatio: 1.28, cylinders: null,      last: 102, sparkline: [104,103,102,102,101,101,102,101,100,101,102], sentimentSpark: [-5,-8,-10,-8,-9,-12,-10,-8,-10,-9], hasEtf: true, pills: [] },
    { sym: 'KRE', name: 'Regional Banks', flowNet: 210_000,   chgPct: 0.31, flowSide: 'calls', sentiment: 55, avgConviction: 58, cpRatio: 0.94, cylinders: null,      last: 63,  sparkline: [61,62,62,63,63,62,63,64,63,63,63], sentimentSpark: [2,4,5,4,5,6,5,4,5,5], hasEtf: true, pills: [] },
  ],
  thematic: [
    { sym: 'KWEB', name: 'China Tech',    flowNet: -420_000,  chgPct:-0.82, flowSide: 'puts',  sentiment: 36, avgConviction: 62, cpRatio: 1.52, cylinders: 'bearish', last: 29, sparkline: [31,30,29,29,28,29,28,28,27,28,29], sentimentSpark: [-15,-18,-20,-17,-19,-22,-20,-18,-20,-19], hasEtf: true, pills: [] },
    { sym: 'ARKK', name: 'Disruptive Innovation', flowNet: 380_000, chgPct: 1.1, flowSide: 'calls', sentiment: 61, avgConviction: 65, cpRatio: 0.82, cylinders: null, last: 58, sparkline: [55,56,57,57,58,58,59,58,59,60,58], sentimentSpark: [8,10,12,10,11,14,12,10,12,11], hasEtf: true, pills: [] },
  ],
  technicals: { bullish: ['XLK', 'SMH', 'XLY', 'XLC'], bearish: ['XLE', 'XLRE'] },
  walls: { events: [] },
  generatedAt: NOW(),
};

// ---------------------------------------------------------------------------
// get_put_call_ratios
// ---------------------------------------------------------------------------
export const get_put_call_ratios = {
  ticker: 'SPY',
  putCallRatio: 0.78,
  putCallRatioAvg20d: 0.88,
  expirationDate: '2026-07-11',
  putVolume: 124_800,
  callVolume: 160_000,
  sentiment: 'Bullish',
  dataSource: 'volume',
};

// ---------------------------------------------------------------------------
// get_earnings_flow
// ---------------------------------------------------------------------------
export const get_earnings_flow = {
  earnings: [
    {
      event: {
        symbol: 'TSLA', earningsDate: '2026-07-15', earningsTime: 'AMC',
        expectedMovePct: 8.4, expectedMovePrice: 22.50, realizedMovePct: null,
        realizedDirection: null, preEarningsClose: null, postEarningsOpen: null,
        preEarningsFlowCount: 14, preEarningsPremium: 4_200_000,
        preEarningsBullishPct: 72, preEarningsSentiment: 'Bullish',
        consensusConfidence: 'high', epsEstimate: 0.72, revenueEstimate: 25_800_000_000,
        sector: 'Consumer Discretionary', marketCapUsd: 900_000_000_000,
        lastEarningsOutcome: 'beat',
      },
      flows: [
        { daysBeforeEarnings: 8, signalWindow: '1w', signalWeight: 0.8, premium: 1_920_000, sentiment: 'Bullish', unusualScore: 89, tradeType: 'sweep', contractType: 'CALL', moneyness: 'OTM' },
        { daysBeforeEarnings: 3, signalWindow: '3d', signalWeight: 1.0, premium: 2_280_000, sentiment: 'Bullish', unusualScore: 94, tradeType: 'sweep', contractType: 'CALL', moneyness: 'OTM' },
      ],
      summary: { direction: 'Bullish', confidence: 'high', note: 'Strong call accumulation in final stretch' },
    },
    {
      event: {
        symbol: 'NFLX', earningsDate: '2026-07-16', earningsTime: 'AMC',
        expectedMovePct: 6.2, expectedMovePrice: 42.00, realizedMovePct: null,
        realizedDirection: null, preEarningsClose: null, postEarningsOpen: null,
        preEarningsFlowCount: 8, preEarningsPremium: 1_800_000,
        preEarningsBullishPct: 60, preEarningsSentiment: 'Neutral',
        consensusConfidence: 'medium', epsEstimate: 5.10, revenueEstimate: 10_500_000_000,
        sector: 'Communication Services', marketCapUsd: 280_000_000_000,
        lastEarningsOutcome: 'beat',
      },
      flows: [
        { daysBeforeEarnings: 5, signalWindow: '1w', signalWeight: 0.6, premium: 900_000, sentiment: 'Bullish', unusualScore: 74, tradeType: 'block', contractType: 'CALL', moneyness: 'OTM' },
        { daysBeforeEarnings: 2, signalWindow: '3d', signalWeight: 0.8, premium: 900_000, sentiment: 'Neutral', unusualScore: 68, tradeType: 'block', contractType: 'PUT', moneyness: 'OTM' },
      ],
      summary: { direction: 'Mixed', confidence: 'medium', note: 'Straddle-like positioning — market uncertain on direction' },
    },
    {
      event: {
        symbol: 'AMZN', earningsDate: '2026-07-30', earningsTime: 'AMC',
        expectedMovePct: 5.8, expectedMovePrice: 12.00, realizedMovePct: null,
        realizedDirection: null, preEarningsClose: null, postEarningsOpen: null,
        preEarningsFlowCount: 6, preEarningsPremium: 2_100_000,
        preEarningsBullishPct: 81, preEarningsSentiment: 'Bullish',
        consensusConfidence: 'high', epsEstimate: 1.34, revenueEstimate: 155_000_000_000,
        sector: 'Consumer Discretionary', marketCapUsd: 2_100_000_000_000,
        lastEarningsOutcome: 'beat',
      },
      flows: [
        { daysBeforeEarnings: 24, signalWindow: '1m', signalWeight: 0.5, premium: 2_100_000, sentiment: 'Bullish', unusualScore: 86, tradeType: 'sweep', contractType: 'CALL', moneyness: 'OTM' },
      ],
      summary: { direction: 'Bullish', confidence: 'medium', note: 'Early call sweeps — smart money positioning ahead of AWS print' },
    },
  ],
  count: 3,
  days: 7,
  timestamp: NOW(),
};

// ---------------------------------------------------------------------------
// get_economic_calendar
// ---------------------------------------------------------------------------
export const get_economic_calendar = {
  dateFrom: '2026-07-06',
  dateTo: '2026-07-10',
  totalEvents: 6,
  events: [
    { date: '2026-07-07', time: '08:30', event: 'ISM Services PMI', impact: 'high', forecast: '53.4', previous: '52.9', actual: null, country: 'US' },
    { date: '2026-07-08', time: '08:30', event: 'Initial Jobless Claims', impact: 'medium', forecast: '225K', previous: '219K', actual: null, country: 'US' },
    { date: '2026-07-09', time: '08:30', event: 'CPI (MoM)',             impact: 'high', forecast: '0.2%', previous: '0.1%', actual: null, country: 'US' },
    { date: '2026-07-09', time: '08:30', event: 'CPI (YoY)',             impact: 'high', forecast: '2.9%', previous: '3.0%', actual: null, country: 'US' },
    { date: '2026-07-10', time: '10:00', event: 'Michigan Sentiment',    impact: 'medium', forecast: '68.5', previous: '67.2', actual: null, country: 'US' },
    { date: '2026-07-10', time: '14:00', event: 'Federal Budget Balance', impact: 'low', forecast: '-$215B', previous: '-$228B', actual: null, country: 'US' },
  ],
};

// ---------------------------------------------------------------------------
// run_screener — function(args)
// ---------------------------------------------------------------------------
const SCREENER_RESULTS = {
  'daily-cuts': [
    { ticker: 'NVDA', name: 'NVIDIA Corp', price: 128.45, change: 2.34, changePct: 1.85, volume: 42_100_000, avgVolume: 31_800_000, relVol: 1.32, score: 94, sector: 'Technology', setup: 'Leveraged Trend', edgeScore: 87 },
    { ticker: 'META', name: 'Meta Platforms', price: 622.80, change: 8.20, changePct: 1.33, volume: 18_400_000, avgVolume: 14_200_000, relVol: 1.30, score: 91, sector: 'Communication Services', setup: 'CSP Wheel', edgeScore: 82 },
    { ticker: 'TSLA', name: 'Tesla Inc', price: 268.10, change: 5.40, changePct: 2.06, volume: 88_200_000, avgVolume: 62_100_000, relVol: 1.42, score: 88, sector: 'Consumer Discretionary', setup: 'LEAPS', edgeScore: 79 },
    { ticker: 'AMD',  name: 'Advanced Micro Devices', price: 154.30, change: 3.10, changePct: 2.05, volume: 28_900_000, avgVolume: 21_400_000, relVol: 1.35, score: 85, sector: 'Technology', setup: 'Leveraged Ignition', edgeScore: 76 },
    { ticker: 'AMZN', name: 'Amazon.com', price: 208.70, change: 2.90, changePct: 1.41, volume: 31_200_000, avgVolume: 24_600_000, relVol: 1.27, score: 83, sector: 'Consumer Discretionary', setup: 'LEAPS', edgeScore: 74 },
  ],
  'momentum': [
    { ticker: 'NVDA', price: 128.45, change: 2.34, changePct: 1.85, score: 94, sector: 'Technology' },
    { ticker: 'AVGO', price: 188.20, change: 3.80, changePct: 2.06, score: 88, sector: 'Technology' },
    { ticker: 'TSM',  price: 214.60, change: 4.20, changePct: 2.00, score: 86, sector: 'Technology' },
  ],
  'csp-wheel': [
    { ticker: 'META', price: 622.80, change: 8.20, changePct: 1.33, score: 91, sector: 'Communication Services', weeklyRoc: 1.42 },
    { ticker: 'AAPL', price: 211.50, change: 1.80, changePct: 0.86, score: 82, sector: 'Technology', weeklyRoc: 1.18 },
    { ticker: 'MSFT', price: 432.10, change: 3.40, changePct: 0.79, score: 79, sector: 'Technology', weeklyRoc: 1.08 },
  ],
  'volatility-squeeze': [
    { ticker: 'PLTR', price: 28.40, change: 0.60, changePct: 2.16, score: 83, sector: 'Technology' },
    { ticker: 'SOFI', price: 14.20, change: 0.35, changePct: 2.53, score: 78, sector: 'Financials' },
  ],
};

export function run_screener(args) {
  const key = args?.screener ?? 'daily-cuts';
  const rows = SCREENER_RESULTS[key] ?? SCREENER_RESULTS['daily-cuts'];
  const limit = args?.limit;
  const results = limit ? rows.slice(0, limit) : rows;
  return {
    screener: { id: key, name: key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    results,
    tickers: results.map((r) => r.ticker),
    count: rows.length,
    returned: results.length,
    timestamp: NOW(),
  };
}

// ---------------------------------------------------------------------------
// get_iv_rank — function(args)
// ---------------------------------------------------------------------------
export function get_iv_rank(args) {
  const sym = (args?.symbol ?? 'NVDA').toUpperCase();
  const rankMap = { NVDA: 72, SPY: 34, QQQ: 38, TSLA: 81, AAPL: 28, META: 55, AMD: 67 };
  const rank = rankMap[sym] ?? 50;
  const earningsSet = new Set(['NVDA', 'TSLA', 'AMZN']);
  return {
    symbol: sym, ivRank: rank, ivPercentile: rank + 5,
    earningsInWindow: earningsSet.has(sym),
    currentIV: parseFloat((0.35 + rank / 200).toFixed(3)),
    ivMin52w: 0.24, ivMax52w: 0.82,
    interpretation: rank > 60 ? 'rich' : rank < 30 ? 'cheap' : 'neutral',
    note: rank > 60
      ? 'Premium is elevated vs history — favor selling strategies (CSPs, credit spreads, covered calls)'
      : rank < 30
        ? 'Premium is depressed vs history — favor buying strategies (long calls/puts, debit spreads)'
        : 'IV is near its historical median — no strong edge to buyers or sellers',
  };
}

// ---------------------------------------------------------------------------
// get_strategy_ideas — function(args)
// ---------------------------------------------------------------------------
export function get_strategy_ideas(args) {
  const sym = (args?.symbol ?? 'NVDA').toUpperCase();
  return {
    symbol: sym, direction: 'bullish', derivedFromTechnicals: true,
    structures: [
      {
        archetype: 'bull_put_spread', rank: 1, score: 88,
        legs: [
          { type: 'PUT', side: 'sell', qty: 1, strike: 120, premium: 3.40, delta: -0.28 },
          { type: 'PUT', side: 'buy',  qty: 1, strike: 115, premium: 1.80, delta: -0.18 },
        ],
        maxProfit: 160, maxLoss: 340, breakevens: [118.40], pop: 0.72,
        capitalAtRisk: 340, expiration: '2026-08-07', dte: 31,
        rationale: `Sell the 120/115 put spread on ${sym}. Collects $1.60 credit with 72% POP. Structure benefits from continued upside or sideways action. Risk is defined.`,
        earningsInWindow: false,
      },
      {
        archetype: 'long_call', rank: 2, score: 79,
        legs: [
          { type: 'CALL', side: 'buy', qty: 1, strike: 130, premium: 4.20, delta: 0.42 },
        ],
        maxProfit: null, maxLoss: 420, breakevens: [134.20], pop: 0.42,
        capitalAtRisk: 420, expiration: '2026-08-07', dte: 31,
        rationale: `Long the 130 call on ${sym}. Directional leverage with defined risk. IV rank at 72 makes this slightly expensive but flow confirms the bull thesis.`,
        earningsInWindow: false,
      },
      {
        archetype: 'covered_call', rank: 3, score: 71,
        legs: [
          { type: 'STOCK', side: 'buy', qty: 100, strike: null, premium: 128.45, delta: 1.0 },
          { type: 'CALL', side: 'sell', qty: 1, strike: 132, premium: 2.80, delta: 0.38 },
        ],
        maxProfit: 635, maxLoss: 12565, breakevens: [125.65], pop: 0.62,
        capitalAtRisk: 12845, expiration: '2026-08-07', dte: 31,
        rationale: `Covered call on ${sym} at the 132 strike. Generates 2.2% monthly income. Capped upside above 132 — appropriate if mildly bullish or looking for income on existing position.`,
        earningsInWindow: false,
      },
    ],
    timestamp: NOW(),
  };
}

// ---------------------------------------------------------------------------
// get_edge_xray — function(args)
// ---------------------------------------------------------------------------
export function get_edge_xray(args) {
  const sym = (args?.symbol ?? 'NVDA').toUpperCase();
  const spot = 128.45;
  const grades = [115, 120, 125, 128, 130, 135, 140].flatMap((strike) =>
    ['CALL', 'PUT'].map((type) => {
      const residual = parseFloat(((Math.random() - 0.45) * 0.08).toFixed(4));
      return {
        strike, type, mid: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        iv: parseFloat((0.35 + Math.random() * 0.2).toFixed(3)),
        delta: type === 'CALL' ? parseFloat((0.7 - strike / spot * 0.5).toFixed(3)) : parseFloat((-0.3 + strike / spot * 0.2).toFixed(3)),
        residual, verdict: residual > 0.02 ? 'rich' : residual < -0.02 ? 'cheap' : 'fair',
      };
    }),
  );
  return {
    symbol: sym, spot, expiration: '2026-08-07', dte: 31,
    availableExpirations: ['2026-07-11', '2026-07-18', '2026-08-07', '2026-09-18', '2026-12-18'],
    contracts: grades,
    fairIvSummary: {
      callsMedianResidual: 0.018,
      putsMedianResidual: -0.012,
      overallBias: 'calls slightly rich, puts slightly cheap',
    },
    timestamp: NOW(),
  };
}
