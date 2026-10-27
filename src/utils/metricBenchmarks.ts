export interface ExternalLearningLink {
  title: string;               // e.g. "Investopedia: Z-Score & Standard Deviation"
  type: 'ARTICLE' | 'VIDEO' | 'INTERACTIVE' | 'COURSE';
  sourceName: string;          // e.g. "Binance Academy", "Investopedia", "Deribit Insights", "YouTube Education"
  url: string;                 // Reliable canonical URL or structured educational search URL
  durationOrLevel: string;     // e.g. "5 min read • Beginner"
}

export interface RookieMentorGuide {
  familiarBridge: string;      // Connects this pro metric to a basic indicator (RSI, EMA, S/R, Volume)
  whatItIsSimple: string;      // Zero-jargon explanation of what this value measures
  standardRangeGuide: {
    normal: string;            // Standard equilibrium range (e.g. "+0.0100% / 8h")
    tooHigh: string;           // Meaning of high deviation (e.g. ">= +0.0300% = Over-leveraged Longs")
    tooLow: string;            // Meaning of low/negative deviation (e.g. "< 0.0000% = Trapped Shorts")
  };
  liveStepByStepStory: string; // Dynamic 2-3 sentence story using the LIVE number
  rookieActionRule: {
    doThis: string;
    avoidTrap: string;
  };
  resources: ExternalLearningLink[];
}

export interface MetricBenchmarkResult {
  metricId: string;
  label: string;
  rookieMentor: RookieMentorGuide;
  resources: ExternalLearningLink[];
}

/**
 * Curated, zero-scam educational links pointing to Investopedia, Binance Academy,
 * Deribit Insights, TradingView Knowledge Base, and targeted YouTube tutorials.
 */
const METRIC_MENTOR_CATALOG: Record<string, (symbol: string, liveVal: string) => RookieMentorGuide> = {
  funding_rate: (symbol, liveVal) => ({
    familiarBridge:
      'Think of Funding Rate like a "Crowd Sentiment RSI" specifically for leveraged futures traders—it shows whether too many people are borrowing money to bet Long or Short.',
    whatItIsSimple:
      'Every 8 hours, perpetual futures traders pay a small fee to each other to keep futures prices anchored to real Spot prices. Positive = Longs pay Shorts; Negative = Shorts pay Longs.',
    standardRangeGuide: {
      normal: '+0.0050% to +0.0100% / 8h (Healthy baseline bull bias)',
      tooHigh: '≥ +0.0300% / 8h (Greedy crowded Longs — Long Squeeze danger!)',
      tooLow: '< 0.0000% / 8h (Crowded aggressive Shorts — Short Squeeze fuel!)',
    },
    liveStepByStepStory: `Right now on ${symbol}, Funding is ${liveVal || '+0.0100% / 8h'}. When funding stays near +0.01%, leverage is balanced; if it spikes far positive while price stalls, late retail longs are paying heavy fees and are ripe for a stop-hunt flush.`,
    rookieActionRule: {
      doThis: 'Buy pullbacks when funding is neutral (+0.01%) or negative (< 0%) while price holds support.',
      avoidTrap: 'Never market-buy a breakout when funding is ≥ +0.03%—you are buying the top of a crowded leverage boat.',
    },
    resources: [
      {
        title: 'What Are Perpetual Futures Contracts & Funding Rates?',
        type: 'ARTICLE',
        sourceName: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/what-are-perpetual-futures-contracts',
        durationOrLevel: '6 min read • Beginner',
      },
      {
        title: 'How Crypto Funding Rates Predict Short & Long Squeezes',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=crypto+perpetual+funding+rate+explained+trading+strategy',
        durationOrLevel: '10 min video • Beginner',
      },
      {
        title: 'Perpetual Futures & Funding Rate Interactive Course',
        type: 'COURSE',
        sourceName: 'Binance Academy',
        url: 'https://academy.binance.com/en/courses/track/beginner-track',
        durationOrLevel: 'Interactive Course • Beginner',
      },
    ],
  }),

  oi_4h_delta: (symbol, liveVal) => ({
    familiarBridge:
      'Standard Volume bars only show how many coins traded; Open Interest (OI) Delta shows whether those trades OPENED brand-new leveraged bets or CLOSED old ones.',
    whatItIsSimple:
      'Measures the % change in total active futures contracts over the last 4 hours alongside price movement.',
    standardRangeGuide: {
      normal: '-1.5% to +2.0% OI Δ (Normal position rotation)',
      tooHigh: '≥ +4.5% OI Δ (Aggressive leverage piling in — volatility incoming)',
      tooLow: '≤ -4.0% OI Δ (Mass liquidation flush or profit-taking)',
    },
    liveStepByStepStory: `On ${symbol}, 4H OI Delta is ${liveVal || '+1.2%'}. Price rising + OI rising means fresh institutional money is backing the uptrend ("Long Build"). Price rising + OI falling means shorts are simply panic-closing ("Short Cover").`,
    rookieActionRule: {
      doThis: 'Trust breakouts when Price and Open Interest rise together alongside Spot buying.',
      avoidTrap: 'Do not FOMO into a sudden price spike if OI surges +6% at resistance while Spot CVD is flat—that is a leverage trap.',
    },
    resources: [
      {
        title: 'Open Interest vs. Trading Volume Explained Simply',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/o/openinterest.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'How to Read Open Interest & Liquidations in Crypto',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=how+to+use+open+interest+in+crypto+trading',
        durationOrLevel: '12 min video • Beginner+',
      },
      {
        title: 'Open Interest & Price 4-Quadrant Interactive Guide',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502298-open-interest/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  }),

  sharpe_sortino: (symbol, liveVal) => ({
    familiarBridge:
      'If Moving Averages show trend direction, Rolling Sharpe & Sortino measure "Trend Cleanliness"—telling you whether the trend is a smooth escalator or a violent rollercoaster.',
    whatItIsSimple:
      'Calculates how much return the coin is generating per unit of volatility risk. Sortino only penalizes downside drops (bad volatility), ignoring upside breakouts.',
    standardRangeGuide: {
      normal: 'Sharpe 0.50 to 1.00 (Moderate tradeable drift)',
      tooHigh: 'Sharpe ≥ 1.20 & Efficiency ≥ 50% (Clean institutional trend)',
      tooLow: '|Sharpe| < 0.35 (Noisy 50/50 chop — breakouts fail)',
    },
    liveStepByStepStory: `Right now on ${symbol}, Rolling Sharpe/Sortino reads ${liveVal || '1.15'}. Readings above 1.0 mean trend-following setups are getting paid cleanly; readings near 0.0 mean price is whipping back and forth and eating stop-losses.`,
    rookieActionRule: {
      doThis: 'Trade trend pullbacks when Sharpe ≥ 0.80; switch to sitting on hands or range extremes when |Sharpe| < 0.35.',
      avoidTrap: 'Never trade momentum breakouts when Sharpe is near 0.0—chop markets punish breakout buyers.',
    },
    resources: [
      {
        title: 'Sharpe Ratio Formula & What Counts as a Good Sharpe',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/s/sharperatio.asp',
        durationOrLevel: '6 min read • Beginner',
      },
      {
        title: 'Sharpe & Sortino Ratio Visualized for Traders',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=sharpe+ratio+vs+sortino+ratio+explained+simply',
        durationOrLevel: '8 min video • Beginner',
      },
      {
        title: 'Sortino Ratio & Downside Risk Portfolio Module',
        type: 'COURSE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/s/sortinoratio.asp',
        durationOrLevel: 'Interactive Module • Beginner+',
      },
    ],
  }),

  z_score: (symbol, liveVal) => ({
    familiarBridge:
      'Just like RSI > 70 or Bollinger Band touches warn that price is overbought, VWMA Z-Score measures exact statistical stretch in Standard Deviations (σ).',
    whatItIsSimple:
      'Measures how many standard deviations (σ) spot price is stretched away from its 50-bar Volume-Weighted Moving Average (VWMA50).',
    standardRangeGuide: {
      normal: '-1.0σ to +1.0σ (Inside 68% normal fair-value zone)',
      tooHigh: '≥ +2.0σ (Top 2.3% statistical extreme — snap-back risk!)',
      tooLow: '≤ -2.0σ (Bottom 2.3% statistical washout — bounce zone)',
    },
    liveStepByStepStory: `On ${symbol}, the Statistical Z-Score is ${liveVal || '+0.45σ'}. In normal bell-curve statistics, 95.4% of all trading stays inside -2.0σ to +2.0σ, so readings beyond ±2.0σ act like a stretched rubberband ready to snap back toward VWMA50.`,
    rookieActionRule: {
      doThis: 'Take profit on longs when Z-Score crosses +2.0σ, and stalk mean-reversion bounces when Z-Score hits -2.0σ at support.',
      avoidTrap: 'Never open a brand-new market Long when Z-Score is already above +2.0σ.',
    },
    resources: [
      {
        title: 'Z-Score & Standard Deviation in Financial Markets',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/z/zscore.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Mean Reversion & Z-Score Trading Explained',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=z+score+mean+reversion+trading+explained',
        durationOrLevel: '9 min video • Intermediate',
      },
      {
        title: 'Volume-Weighted Moving Average (VWMA) Interactive Charting',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000592293-volume-weighted-moving-average-vwma/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  }),

  cvd_divergence: (symbol, liveVal) => ({
    familiarBridge:
      'Basic Volume bars paint the whole bar green or red based on close price. CVD (Cumulative Volume Delta) looks INSIDE the bar to count exact Market Buy orders minus Market Sell orders.',
    whatItIsSimple:
      'Compares 14-period RSI price momentum against true Taker Orderflow (aggressive buyers lifting the ask vs. aggressive sellers hitting the bid).',
    standardRangeGuide: {
      normal: 'RSI 40–60 & Balanced CVD (Equilibrium)',
      tooHigh: 'Price Higher High + Negative CVD (Bearish Exhaustion / Trap)',
      tooLow: 'Price Lower Low + Positive CVD (Bullish Passive Absorption!)',
    },
    liveStepByStepStory: `On ${symbol}, RSI & CVD read ${liveVal || 'Balanced'}. When price dips to support while CVD turns positive (or prints a Gold Absorption Ring), giant passive limit buy walls are quietly eating all retail panic selling.`,
    rookieActionRule: {
      doThis: 'Look for Bullish Absorption (price holding support while aggressive sellers fail to push it lower) before entering long.',
      avoidTrap: 'Do not trust a green breakout candle if Taker CVD Delta is negative—passive limit sellers are unloading into the pump.',
    },
    resources: [
      {
        title: 'Relative Strength Index (RSI) & Orderflow Divergences',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/r/rsi.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Orderflow, CVD Divergence & Limit Absorption Tutorial',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=cumulative+volume+delta+cvd+absorption+trading+explained',
        durationOrLevel: '11 min video • Intermediate',
      },
      {
        title: 'Volume Delta & Cumulative Volume Delta (CVD) Interactive Tool',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000725057-volume-delta/',
        durationOrLevel: 'Interactive Tool • Beginner+',
      },
    ],
  }),

  net_gex: (symbol, liveVal) => ({
    familiarBridge:
      'If Support & Resistance lines show where chart traders might react, Net GEX (Gamma Exposure) shows where Options Market Makers are MATHEMATICALLY FORCED to buy or sell futures.',
    whatItIsSimple:
      'Measures whether options dealers hold Positive Gamma (+GEX: they calm the market down by buying dips and selling rips) or Negative Gamma (-GEX: they pour fuel on breakouts and crashes).',
    standardRangeGuide: {
      normal: '+$10M to +$150M Net GEX (Calm range-pinning regime)',
      tooHigh: '> +$200M Net GEX (Heavy dealer magnet pinning near Max Pain)',
      tooLow: '< $0M Negative GEX (Volatility accelerator — violent moves!)',
    },
    liveStepByStepStory: `Right now on ${symbol}, Net GEX is ${liveVal || '+$45M'}. Positive GEX acts like shock absorbers on a car (fade extremes back to POC/Max Pain); Negative GEX means the brakes are cut and dealers must trade in the direction of the breakout.`,
    rookieActionRule: {
      doThis: 'In Positive GEX (+GEX), take profits earlier at resistance walls. In Negative GEX (-GEX), trade momentum breakouts and widen stops.',
      avoidTrap: 'Never try to counter-trend fade a cascading breakdown when Net GEX is deeply negative (< $0M).',
    },
    resources: [
      {
        title: 'What Is Gamma in Options Trading & Dealer Hedging?',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/g/gamma.asp',
        durationOrLevel: '6 min read • Beginner+',
      },
      {
        title: 'How Options Gamma & Zero-Gamma Flip Move Spot Prices',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=gamma+exposure+gex+options+dealer+hedging+explained',
        durationOrLevel: '12 min video • Intermediate',
      },
      {
        title: 'Deribit Options Gamma & Greeks Interactive Course',
        type: 'COURSE',
        sourceName: 'Deribit Insights',
        url: 'https://insights.deribit.com/education/',
        durationOrLevel: 'Interactive Course • Intermediate',
      },
    ],
  }),

  options_skew: (symbol, liveVal) => ({
    familiarBridge:
      'Think of 25-Delta Options Skew as "Smart-Money Crash Insurance Pricing"—comparing the price of Puts (downside insurance) vs. Calls (upside lottery tickets).',
    whatItIsSimple:
      'Measures the Implied Volatility (IV) difference between 25-Delta Put options and 25-Delta Call options, paired with the Put/Call Open Interest Ratio.',
    standardRangeGuide: {
      normal: '-2.0% to +2.0% Skew • P/C Ratio 0.60–0.90 (Balanced)',
      tooHigh: 'Skew > +5.0% (Whales paying huge premiums for Put crash protection)',
      tooLow: 'Skew < -3.0% (Whales aggressively bidding Call options for upside)',
    },
    liveStepByStepStory: `On ${symbol}, Options Skew & Put/Call read ${liveVal || 'Balanced'}. When Call options become much more expensive than Put options, institutional desks are positioning for upside expansion.`,
    rookieActionRule: {
      doThis: 'Align swing trades with institutional options demand when 25Δ Call Skew and Spot CVD both point higher.',
      avoidTrap: 'Be careful holding unhedged high-leverage longs if Put protection skew suddenly spikes above +5%.',
    },
    resources: [
      {
        title: 'Understanding Volatility Skew & 25-Delta Risk Reversals',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/v/volatility-skew.asp',
        durationOrLevel: '5 min read • Intermediate',
      },
      {
        title: 'Options 25-Delta Skew Explained for Crypto Traders',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=25+delta+skew+options+crypto+explained',
        durationOrLevel: '9 min video • Intermediate',
      },
      {
        title: 'Put-Call Ratio & Options Sentiment Interactive Course',
        type: 'COURSE',
        sourceName: 'Deribit Insights',
        url: 'https://insights.deribit.com/education/',
        durationOrLevel: 'Interactive Course • Beginner+',
      },
    ],
  }),

  zero_gamma_basis: (symbol, liveVal) => ({
    familiarBridge:
      'Think of the Zero-Gamma (0-Γ) Flip Level as the "Weather Equator" on your chart: above it, the market weather is calm (+GEX); below it, storms accelerate (-GEX).',
    whatItIsSimple:
      'Shows the exact price level where options dealers flip from dampening volatility to amplifying volatility, alongside the Spot-to-Perpetual Basis (in basis points, where 100 bps = 1.00%).',
    standardRangeGuide: {
      normal: 'Price Above 0-Γ • Basis -2 bps to +8 bps (Healthy Spot-Perp sync)',
      tooHigh: 'Basis > +15 bps (Perp trading at frothy premium over Spot)',
      tooLow: 'Price Below 0-Γ • Basis < -10 bps (Negative Gamma + Backwardation)',
    },
    liveStepByStepStory: `On ${symbol}, Zero-Gamma & Basis read ${liveVal || 'Synced'}. Trading above the 0-Γ level with a modest basis means spot and derivatives markets are in healthy equilibrium.`,
    rookieActionRule: {
      doThis: 'Watch the Zero-Gamma Flip price as a major regime pivot—reclaiming it calms volatility and supports steady trends.',
      avoidTrap: 'Avoid buying Leveraged Perp breakouts when Perp Basis is overheated (> +15 bps) while Spot lags behind.',
    },
    resources: [
      {
        title: 'Futures Basis & Contango vs. Backwardation Explained',
        type: 'ARTICLE',
        sourceName: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/what-is-contango-and-backwardation',
        durationOrLevel: '6 min read • Beginner+',
      },
      {
        title: 'Zero Gamma Level & Options Dealer Flip Zones',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=zero+gamma+level+options+trading+explained',
        durationOrLevel: '10 min video • Intermediate',
      },
      {
        title: 'Deribit Options Positioning & Zero-Gamma Curriculum',
        type: 'COURSE',
        sourceName: 'Deribit Insights',
        url: 'https://insights.deribit.com/education/',
        durationOrLevel: 'Interactive Course • Intermediate',
      },
    ],
  }),

  volume_profile: (symbol, liveVal) => ({
    familiarBridge:
      'Normal Volume bars at the bottom of your chart tell you WHEN people traded. Volume Profile turns those bars sideways on the price scale to show you WHERE (at what exact price) 70% of all buying and selling happened.',
    whatItIsSimple:
      'Maps Point of Control (POC: the #1 highest-volume fair value price) and the 70% Value Area between VAH (Value Area High ceiling) and VAL (Value Area Low floor).',
    standardRangeGuide: {
      normal: 'Inside VAL to VAH (70% Bell-Curve Balance Zone)',
      tooHigh: 'Above VAH on low volume (Overpriced Premium — likely to reject back inside)',
      tooLow: 'Below VAL on exhaustion wick (Discount Sweep — prime rotation back to POC)',
    },
    liveStepByStepStory: `On ${symbol}, Volume Profile levels are ${liveVal || 'active on chart'}. Institutions buy discounts near VAL and take profits near POC (the fair-value magnet) or VAH.`,
    rookieActionRule: {
      doThis: 'Place limit entries near VAL or Bullish Order Blocks and set Take-Profit 1 (TP1) at the POC magnet.',
      avoidTrap: 'Never place market orders right in the middle of the Value Area near POC—that is 50/50 chop.',
    },
    resources: [
      {
        title: 'Volume Profile Indicators: POC, VAH & VAL Complete Guide',
        type: 'ARTICLE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/',
        durationOrLevel: '7 min read • Beginner',
      },
      {
        title: 'How Institutions Trade Volume Profile (POC, VAH, VAL)',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=volume+profile+trading+strategy+poc+vah+val+explained',
        durationOrLevel: '14 min video • Beginner',
      },
      {
        title: 'Volume Profile (POC, VAH, VAL) Interactive Charting Tool',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  }),

  order_blocks: (symbol, liveVal) => ({
    familiarBridge:
      'Basic Support & Resistance draws a thin line at a wick tip; an Order Block (OB) highlights the entire institutional base candle before an explosive move, focusing on its 50% midpoint ("Mean Threshold").',
    whatItIsSimple:
      'Highlights unmitigated institutional buy/sell footprint zones that launched a ≥1.5x ATR impulse move and left a Fair Value Gap (FVG) imbalance.',
    standardRangeGuide: {
      normal: 'Unmitigated OB with FVG Confluence (High-Probability Reaction Zone)',
      tooHigh: 'Bearish OB Supply Ceiling (Institutional sell limits resting above)',
      tooLow: 'Bullish OB 50% Mean Threshold Broken on Full Close (Zone Invalidated)',
    },
    liveStepByStepStory: `On ${symbol}, Order Block status is ${liveVal || 'monitored live'}. When price pulls back into an unmitigated Order Block on low volume (VDU), resting institutional limit orders defend the 50% midpoint.`,
    rookieActionRule: {
      doThis: 'Stalk limit entries between the top edge and 50% Mean Threshold of an unmitigated Order Block, placing your stop just beyond the far wick.',
      avoidTrap: 'If a full candle body closes past the 50% Mean Threshold of an Order Block, do not hold and hope—the zone is invalidated.',
    },
    resources: [
      {
        title: 'Supply and Demand Zones vs. Support and Resistance',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/s/support.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Order Blocks & Fair Value Gaps (SMC) Explained Step-by-Step',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=order+blocks+and+fair+value+gaps+explained+for+beginners',
        durationOrLevel: '12 min video • Beginner',
      },
      {
        title: 'Smart Money Order Blocks & FVG Interactive Scripts',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/scripts/orderblock/',
        durationOrLevel: 'Interactive Tool • Beginner+',
      },
    ],
  }),

  amd_cycle: (symbol, liveVal) => ({
    familiarBridge:
      'Beginners often get stopped out by "Fakeouts" right before price moves in their original direction. Wyckoff AMD explains WHY: smart money deliberately sweeps stops (Manipulation) before launching the real trend (Expansion).',
    whatItIsSimple:
      'Tracks the 3-step institutional liquidity cycle: 1. Accumulation (tight sideways box) → 2. Manipulation (false breakout / Judas stop-sweep) → 3. Expansion / Distribution (true trend run).',
    standardRangeGuide: {
      normal: 'Phase 1: Accumulation (Range compression, low ATR)',
      tooHigh: 'Phase 2: Manipulation / Judas Sweep (Wick fakeout past swing high/low)',
      tooLow: 'Phase 3: Expansion / Distribution (High RVOL trend displacement)',
    },
    liveStepByStepStory: `On ${symbol}, the AMD Engine detects ${liveVal || 'Accumulation/Manipulation'}. Waiting for the Manipulation stop-sweep to close back inside the range lets you enter alongside whales instead of being their exit liquidity.`,
    rookieActionRule: {
      doThis: 'Wait for a tight range to get swept by a long wick (Manipulation) and close back inside before pulling the trigger.',
      avoidTrap: 'Never market-buy the very first breakout of a quiet Asian session range—it is frequently a Judas Swing fakeout.',
    },
    resources: [
      {
        title: 'The Wyckoff Method: Accumulation, Manipulation & Distribution',
        type: 'ARTICLE',
        sourceName: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/the-wyckoff-method-explained',
        durationOrLevel: '8 min read • Beginner',
      },
      {
        title: 'Power of 3 (AMD: Accumulation, Manipulation, Distribution) Visual Guide',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=accumulation+manipulation+distribution+amd+trading+explained',
        durationOrLevel: '10 min video • Beginner',
      },
      {
        title: 'Wyckoff Schematics & Liquidity Sweep Interactive Module',
        type: 'COURSE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/articles/active-trading/070715/making-money-wyckoff-way.asp',
        durationOrLevel: 'Interactive Course • Beginner+',
      },
    ],
  }),

  hurst_adx: (symbol, liveVal) => ({
    familiarBridge:
      'Every beginner asks: "Should I buy the breakout or fade the range today?" Hurst Exponent (H) + ADX answers that mathematically so you never use a trend strategy in a chop market.',
    whatItIsSimple:
      'Hurst (0 to 1) measures whether price has "trend memory" (H > 0.55 = trends keep going) or "rubberband snap-back memory" (H < 0.45 = breakouts fail and revert). ADX measures trend strength.',
    standardRangeGuide: {
      normal: 'H ≈ 0.48–0.52 & ADX < 20 (Random Walk / Transitional)',
      tooHigh: 'H > 0.55 or ADX ≥ 25 (Persistent Momentum Trend — do NOT fade!)',
      tooLow: 'H < 0.45 & ADX < 20 (Mean-Reverting Range — fade VAH/VAL extremes)',
    },
    liveStepByStepStory: `Right now on ${symbol}, Hurst & ADX read ${liveVal || 'H = 0.48'}. When H > 0.55 or ADX ≥ 25, the terminal automatically locks out counter-trend reversal fades to protect you from stepping in front of a freight train.`,
    rookieActionRule: {
      doThis: 'Use range-fade setups when H < 0.48 and ADX < 25; use trend-pullback setups when H > 0.55 or ADX ≥ 25.',
      avoidTrap: 'Never short a "double top" or "shooting star" when Hurst > 0.55 and ADX > 25.',
    },
    resources: [
      {
        title: 'Average Directional Index (ADX): Measuring Trend Strength',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/a/adx.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Hurst Exponent: How Quants Separate Trend from Mean Reversion',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=hurst+exponent+trading+mean+reversion+vs+trend+explained',
        durationOrLevel: '10 min video • Intermediate',
      },
      {
        title: 'Directional Movement & ADX Interactive Charting Guide',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000502253-average-directional-index-adx/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  }),

  session_rvol: (symbol, liveVal) => ({
    familiarBridge:
      'Standard Volume compares the current bar to the last 20 bars—which is flawed when quiet Asian hours transition into busy New York hours. Session RVOL compares current volume strictly against the same time-of-day UTC session.',
    whatItIsSimple:
      'Shows whether volume is unusually dead (💧 VDU ≤ 0.45x = sellers exhausted) or surging (⚡ Ignition ≥ 2.0x = institutional breakout).',
    standardRangeGuide: {
      normal: '0.70x to 1.40x Session RVOL (Normal time-of-day participation)',
      tooHigh: '⚡ ≥ 2.00x Session RVOL (Institutional Volume Ignition Surge)',
      tooLow: '💧 ≤ 0.45x Session RVOL (Volume Dry-Up — pullback seller exhaustion)',
    },
    liveStepByStepStory: `On ${symbol}, Session RVOL is ${liveVal || '1.00x'}. A pullback into support on ≤ 0.45x RVOL (VDU) proves sellers have run out of ammo, creating a spring-loaded bounce setup.`,
    rookieActionRule: {
      doThis: 'Stalk pullbacks into support where RVOL drops ≤ 0.45x (💧 VDU), then enter when an ignition bar (> 1.5x RVOL) fires.',
      avoidTrap: 'Never buy a breakout candle if Session RVOL is below 1.0x—low-volume breakouts fail nearly 80% of the time.',
    },
    resources: [
      {
        title: 'Relative Volume (RVOL): How Day Traders Spot Big Money',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/r/relative-volume.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Volume Dry-Up (VDU) & Volume Spread Analysis Explained',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=volume+dry+up+vdu+relative+volume+trading+explained',
        durationOrLevel: '9 min video • Beginner+',
      },
      {
        title: 'Relative Volume at Time (Session RVOL) Interactive Tool',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000635870-relative-volume-at-time/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  }),

  fee_drag: (symbol, liveVal) => ({
    familiarBridge:
      'Beginners focus 100% on chart entry signals and ignore exchange fees. When you use a tiny stop-loss with high leverage, exchange Taker fees + slippage secretly eat 25%–50% of your risk budget on every trade.',
    whatItIsSimple:
      'Measures how much of your 1R dollar risk is lost to exchange fees and orderbook slippage (Maker Limit = 2 bps vs. Taker Market = 5 bps + slippage), plus your Net Reward-to-Risk and Half-Kelly bet size.',
    standardRangeGuide: {
      normal: 'Fee Drag < 10% of 1R • Net R:R ≥ 1.8R • Half-Kelly 0.5%–1.5%',
      tooHigh: 'Fee Drag > 20% of 1R (Stop is too tight — fees are bleeding you dry!)',
      tooLow: 'Net R:R < 1.5R (Reward does not justify the risk after fees)',
    },
    liveStepByStepStory: `On ${symbol}, your execution metrics read ${liveVal || 'active in Sizer'}. Switching from Market (Taker) to resting Limit (Maker) orders cuts fee drag by more than half and boosts your real take-home Net R:R.`,
    rookieActionRule: {
      doThis: 'Keep Stop Distance ≥ 0.50% and use Maker Limit orders at key levels so fee drag stays under 10% of your 1R risk.',
      avoidTrap: 'Never scalp with 0.15% stops using Market orders—exchange fees turn a 55% win-rate strategy into a guaranteed loser.',
    },
    resources: [
      {
        title: 'Maker vs. Taker Fees & Bid-Ask Slippage Explained',
        type: 'ARTICLE',
        sourceName: 'Binance Academy',
        url: 'https://academy.binance.com/en/articles/what-are-makers-and-takers',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'How to Calculate Position Size by Fixed Dollar Risk (1R)',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=crypto+position+size+calculator+risk+management+explained',
        durationOrLevel: '10 min video • Beginner',
      },
      {
        title: 'Position Sizing & The Kelly Criterion Interactive Course',
        type: 'COURSE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/articles/trading/04/091504.asp',
        durationOrLevel: 'Interactive Course • Beginner+',
      },
    ],
  }),
};

/**
 * Resolves a RookieMentorGuide for any metric key, curriculum indicator ID, or tooltip title.
 */
export function getRookieMentorGuide(
  keyOrTitle: string,
  symbol: string = 'BTCUSDT',
  liveValueFormatted: string = '',
  extraContext: string = ''
): RookieMentorGuide {
  const k = (keyOrTitle || '').toLowerCase();

  if (k.includes('funding')) {
    return METRIC_MENTOR_CATALOG.funding_rate(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('oi') || k.includes('open interest') || k.includes('spot_perp') || k.includes('spot vs')) {
    return METRIC_MENTOR_CATALOG.oi_4h_delta(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('sharpe') || k.includes('sortino') || k.includes('kaufman')) {
    return METRIC_MENTOR_CATALOG.sharpe_sortino(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('z-score') || k.includes('z_score') || k.includes('zscore') || k.includes('stretch') || k.includes('vwma')) {
    return METRIC_MENTOR_CATALOG.z_score(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('cvd') || k.includes('divergence') || k.includes('delta') || k.includes('absorption')) {
    return METRIC_MENTOR_CATALOG.cvd_divergence(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('0-γ') || k.includes('zero-gamma') || k.includes('zerogamma') || k.includes('basis')) {
    return METRIC_MENTOR_CATALOG.zero_gamma_basis(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('gex') || k.includes('gamma') || k.includes('max pain') || k.includes('maxpain') || k.includes('wall')) {
    return METRIC_MENTOR_CATALOG.net_gex(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('skew') || k.includes('put/call') || k.includes('p/c')) {
    return METRIC_MENTOR_CATALOG.options_skew(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('hurst') || k.includes('adx') || k.includes('regime')) {
    return METRIC_MENTOR_CATALOG.hurst_adx(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('rvol') || k.includes('vdu') || k.includes('ignition')) {
    return METRIC_MENTOR_CATALOG.session_rvol(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('poc') || k.includes('vah') || k.includes('val') || k.includes('volume profile') || k.includes('vp_')) {
    return METRIC_MENTOR_CATALOG.volume_profile(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('order block') || k.includes('order_block') || k.includes('ob') || k.includes('fvg')) {
    return METRIC_MENTOR_CATALOG.order_blocks(symbol, liveValueFormatted || extraContext);
  }
  if (k.includes('amd') || k.includes('wyckoff') || k.includes('manipulation') || k.includes('judas')) {
    return METRIC_MENTOR_CATALOG.amd_cycle(symbol, liveValueFormatted || extraContext);
  }
  if (
    k.includes('risk') ||
    k.includes('fee') ||
    k.includes('kelly') ||
    k.includes('leverage') ||
    k.includes('notional') ||
    k.includes('maker') ||
    k.includes('taker') ||
    k.includes('sizer')
  ) {
    return METRIC_MENTOR_CATALOG.fee_drag(symbol, liveValueFormatted || extraContext);
  }

  // Default fallback for Price Action / Candles / EMAs
  return {
    familiarBridge:
      'Connects standard candlestick wicks, Moving Average ribbons (9/21/50/200 EMA), and ATR volatility into a single institutional structure score.',
    whatItIsSimple:
      'Measures whether buyers or sellers are winning the intrabar tug-of-war (CLV & Wick Ratio) and whether price is trending cleanly along its moving averages.',
    standardRangeGuide: {
      normal: 'Within ±1.5x ATR of 21 EMA • CLV 35%–65% (Balanced Trend)',
      tooHigh: '> +2.5x ATR above 21 EMA (Overextended — wait for pullback)',
      tooLow: 'Long lower wick (>50%) + CLV > 70% at Support (Bullish Rejection)',
    },
    liveStepByStepStory: `On ${symbol}, live structure reads ${liveValueFormatted || extraContext || 'active on chart'}. Waiting for price to pull back to the 21 EMA or a key Volume Profile node gives you a high-probability entry with a tight invalidation stop.`,
    rookieActionRule: {
      doThis: 'Buy pullbacks to the 21 EMA or VAL support when a high-CLV rejection candle confirms buyers stepped in.',
      avoidTrap: 'Do not chase green candles when price is stretched more than 2.2x ATR away from the 21 EMA.',
    },
    resources: [
      {
        title: 'Exponential Moving Average (EMA) & Trend Ribbons Guide',
        type: 'ARTICLE',
        sourceName: 'Investopedia',
        url: 'https://www.investopedia.com/terms/e/ema.asp',
        durationOrLevel: '5 min read • Beginner',
      },
      {
        title: 'Candlestick Wick Rejection & Close Location Value Tutorial',
        type: 'VIDEO',
        sourceName: 'YouTube Education',
        url: 'https://www.youtube.com/results?search_query=candlestick+wick+rejection+and+atr+trading+explained',
        durationOrLevel: '10 min video • Beginner',
      },
      {
        title: 'Average True Range (ATR) & EMA Ribbon Interactive Tool',
        type: 'INTERACTIVE',
        sourceName: 'TradingView',
        url: 'https://www.tradingview.com/support/solutions/43000501823-average-true-range-atr/',
        durationOrLevel: 'Interactive Tool • Beginner',
      },
    ],
  };
}

/**
 * Maps any institutional metric key or tooltip title directly to its 3-link educational triad
 * (ARTICLE, VIDEO, and INTERACTIVE/COURSE).
 */
export function getMetricLearningResources(
  keyOrTitle: string,
  symbol: string = 'BTCUSDT'
): ExternalLearningLink[] {
  return getRookieMentorGuide(keyOrTitle, symbol).resources;
}

export function getMetricBenchmarkResult(
  metricId: string,
  symbol: string = 'BTCUSDT',
  liveValueFormatted: string = ''
): MetricBenchmarkResult {
  const mentor = getRookieMentorGuide(metricId, symbol, liveValueFormatted);
  return {
    metricId,
    label: metricId.toUpperCase(),
    rookieMentor: mentor,
    resources: mentor.resources,
  };
}

