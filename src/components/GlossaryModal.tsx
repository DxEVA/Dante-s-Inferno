import React, { useState, useMemo } from 'react';

export interface GlossaryTerm {
  id: string;
  term: string;
  acronym?: string;
  category: 'VOLUME PROFILE' | 'SMC & AMD' | 'ORDERFLOW & VSA' | 'OPTIONS & GEX' | 'QUANT & RISK' | 'PRICE ACTION';
  color: string;
  plainEnglish: string;
  institutionalEdge: string;
  actionableRule: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // 1. VOLUME PROFILE & AUCTIONS
  {
    id: 'poc',
    term: 'Point of Control',
    acronym: 'POC',
    category: 'VOLUME PROFILE',
    color: '#f59e0b',
    plainEnglish: 'The single price level where the most volume (trading contracts) was exchanged during a specific time period. Think of it as the market\'s fair-value center of gravity.',
    institutionalEdge: 'Market makers and algorithmic desks balance their inventory around the POC. When price strays far away on low volume, algorithms pull price back here like a magnet.',
    actionableRule: 'If price breaks out but volume does not follow, expect rotation back to POC. If entering at edges (VAH/VAL), POC serves as primary Take Profit 1 (TP1).',
  },
  {
    id: 'vah',
    term: 'Value Area High',
    acronym: 'VAH',
    category: 'VOLUME PROFILE',
    color: '#00f0ff',
    plainEnglish: 'The highest price boundary of the zone containing 70% of total volume traded. Above VAH, prices are considered expensive (premium).',
    institutionalEdge: 'Institutions treat prices above VAH as an auction test: if aggressive market buy orders continue, price discovers higher value; if not, smart money rejects the high and pushes price back inside.',
    actionableRule: 'Fade false breakouts back inside VAH targeting POC. Only hold longs if a candle closes above VAH with RVOL > 1.5x confirming price acceptance.',
  },
  {
    id: 'val',
    term: 'Value Area Low',
    acronym: 'VAL',
    category: 'VOLUME PROFILE',
    color: '#00f0ff',
    plainEnglish: 'The lowest price boundary of the 70% volume zone. Below VAL, prices are considered cheap (discounted).',
    institutionalEdge: 'Whales look for liquidity sweeps below VAL to trigger retail stop losses before stepping in with passive limit orders to accumulate inventory.',
    actionableRule: 'Look for bullish absorption candles or pin bars dipping below VAL and closing back inside. Target POC with stops placed 0.5% below the sweep wick.',
  },
  {
    id: 'vdu',
    term: 'Volume Dry-Up',
    acronym: 'VDU',
    category: 'VOLUME PROFILE',
    color: '#38bdf8',
    plainEnglish: 'A candle or bar where trading volume plummets to less than half of normal volume (RVOL <= 0.45x). Indicates an absence of aggressive selling or buying pressure.',
    institutionalEdge: 'When price pulls back into a support zone on VDU, it proves to institutions that opposing traders have zero ammunition left. This is the hallmark of a low-risk pullback entry.',
    actionableRule: 'Never chase candles during VDU. Instead, stalk a pullback into an Order Block or VAL when RVOL <= 0.45x, then enter on the first ignition bar.',
  },
  {
    id: 'naked_poc',
    term: 'Naked Point of Control',
    acronym: 'nPOC / VPOC',
    category: 'VOLUME PROFILE',
    color: '#fbbf24',
    plainEnglish: 'A historical Point of Control from a previous day or session that has never been touched or revisited by price since its creation.',
    institutionalEdge: 'Because high volume transacted here previously, significant resting limit orders and dealer inventory remain untriggered. nPOCs act as high-probability magnet targets.',
    actionableRule: 'Mark nPOCs on your higher-timeframe charts. When price enters the corridor within 1.5% of an nPOC, treat it as a high-conviction target or reversal pivot.',
  },
  {
    id: 'single_prints',
    term: 'Single Prints (Low Volume Nodes)',
    acronym: 'LVN',
    category: 'VOLUME PROFILE',
    color: '#a78bfa',
    plainEnglish: 'Price ranges with extremely low trading volume on the volume profile where price sliced through rapidly without stopping to trade.',
    institutionalEdge: 'Because virtually zero liquidity was transacted in these pockets, price encounters almost no resistance when moving through them again. They act as "express elevators".',
    actionableRule: 'Do not place take-profit orders inside an LVN. Price will either blow straight through it or reject before entering. Place TP just beyond the LVN at the next High Volume Node.',
  },

  // 2. SMART MONEY CONCEPTS & AMD
  {
    id: 'order_block',
    term: 'Order Block',
    acronym: 'OB',
    category: 'SMC & AMD',
    color: '#4edea3',
    plainEnglish: 'The last opposing candle right before an aggressive, explosive price displacement that broke structure. It marks where institutions placed massive limit orders.',
    institutionalEdge: 'Institutions cannot fill billion-dollar positions instantly without slippage. When price returns to the Order Block, their remaining pending limit orders fill, causing a sharp rebound.',
    actionableRule: 'Enter on retest of the OB midpoint (50% equilibrium) with stop loss placed just past the OB extreme wick. Risk/reward typically exceeds 2.5R.',
  },
  {
    id: 'fvg',
    term: 'Fair Value Gap',
    acronym: 'FVG',
    category: 'SMC & AMD',
    color: '#34d399',
    plainEnglish: 'A 3-candle pattern where candle 1\'s wick and candle 3\'s wick do not overlap, leaving a hollow gap in candle 2. It represents one-sided liquidity displacement.',
    institutionalEdge: 'Algorithmic delivery models (IPDA) are programmed to achieve price efficiency by re-auctioning through previous imbalances. FVGs get "filled" like magnets.',
    actionableRule: 'Wait for price to retrace into the 50% midpoint (consequent encroachment) of the FVG. Confluence with an Order Block produces the highest win rate.',
  },
  {
    id: 'liquidity_pool',
    term: 'Liquidity Pool (Equal Highs/Lows)',
    acronym: 'EQH / EQL',
    category: 'SMC & AMD',
    color: '#f43f5e',
    plainEnglish: 'Obvious swing highs or swing lows that look like clean double tops or double bottoms. Retail traders cluster their stop-loss orders directly behind these levels.',
    institutionalEdge: 'Institutions need counterparty liquidity to enter large positions. They deliberately drive price through these levels to trigger retail stops, absorbing the fills before reversing.',
    actionableRule: 'Do not place stops directly above equal highs or below equal lows. Wait for the stop run (wick sweep), then enter in the opposite direction once a candle closes back inside.',
  },
  {
    id: 'inducement',
    term: 'Inducement',
    acronym: 'IDM',
    category: 'SMC & AMD',
    color: '#f97316',
    plainEnglish: 'A minor internal pullback or fake support level created deliberately to tempt impatient retail traders into entering early before the real institutional level is reached.',
    institutionalEdge: 'By creating a tempting minor support level, algorithms generate a fresh pool of stop orders directly in front of their true Order Block or Point of Control.',
    actionableRule: 'Identify the first internal high/low after a structural break. Do not trade it! Wait for the market to sweep that inducement level before executing.',
  },
  {
    id: 'amd_cycle',
    term: 'Accumulation - Manipulation - Distribution',
    acronym: 'AMD / Power of 3',
    category: 'SMC & AMD',
    color: '#c084fc',
    plainEnglish: 'The three-phase institutional daily cycle: (1) Asian session flat range (Accumulation), (2) London open fakeout sweep of range highs/lows (Manipulation / Judas Swing), (3) NY session massive trend expansion (Distribution).',
    institutionalEdge: 'Whales build positions quietly in the tight range, engineer a false breakout to trick retail breakout traders and take their liquidity, then launch the real trend.',
    actionableRule: 'Never trade the first breakout from a consolidated Asian range. Wait for the fakeout sweep (Judas swing) to fail and close back inside, then enter with the real expansion.',
  },

  // 3. ORDERFLOW & VSA
  {
    id: 'delta_cvd',
    term: 'Cumulative Volume Delta',
    acronym: 'CVD',
    category: 'ORDERFLOW & VSA',
    color: '#22d3ee',
    plainEnglish: 'The running tally of aggressive market buy orders minus aggressive market sell orders. Shows who is currently paying the taker fee to cross the spread.',
    institutionalEdge: 'When price makes a higher high but CVD makes a lower high (CVD Divergence), it reveals that buyers are exhausted and smart money is passively absorbing the market.',
    actionableRule: 'Spot CVD divergences at key levels: If price tests resistance while CVD drops, fade the top. If price tests support while CVD rises, expect a powerful squeeze upward.',
  },
  {
    id: 'delta_absorption',
    term: 'Delta Absorption',
    acronym: 'ABSORPTION',
    category: 'ORDERFLOW & VSA',
    color: '#f59e0b',
    plainEnglish: 'Occurs when aggressive market orders hit the orderbook in large quantities, but price refuses to move further because a giant iceberg limit order absorbs every contract.',
    institutionalEdge: 'Institutions use iceberg limit orders to quietly buy from panicked sellers without driving the price up. Once the sellers exhaust themselves, price catapults.',
    actionableRule: 'Look for large red Delta bubbles (heavy selling) with small candle bodies and long bottom wicks. Enter long on the next candle open with tight invalidation.',
  },
  {
    id: 'volume_ignition',
    term: 'Volume Ignition Surge',
    acronym: 'IGNITION',
    category: 'ORDERFLOW & VSA',
    color: '#e11d48',
    plainEnglish: 'An explosive candle accompanied by volume at least 2.0x to 3.0x higher than the 20-period moving average, breaking out of a consolidation zone.',
    institutionalEdge: 'High-frequency trading algorithms ignite momentum on purpose to trigger stop losses, cascade liquidations, and pull breakout algorithms into the trend.',
    actionableRule: 'Do not chase the ignition candle top. Mark the midpoint of the ignition candle body; stalk pullbacks into the 50% level for high-probability trend continuation.',
  },
  {
    id: 'trapped_traders',
    term: 'Trapped Traders / Squeeze',
    acronym: 'TRAP / SQUEEZE',
    category: 'ORDERFLOW & VSA',
    color: '#ef4444',
    plainEnglish: 'Traders who entered on a breakout at the very high or low of a move, but price immediately reversed, leaving their positions deeply in the red.',
    institutionalEdge: 'When trapped traders are forced to panic-sell or get liquidated by the exchange, their liquidation orders automatically become market orders that propel the reversal faster.',
    actionableRule: 'Identify candles with huge volume at the extreme wick tip followed by a prompt candle reversal. Trade in the direction of the trapped traders\' pain.',
  },

  // 4. OPTIONS & GAMMA EXPOSURE
  {
    id: 'gex',
    term: 'Net Gamma Exposure',
    acronym: 'GEX',
    category: 'OPTIONS & GEX',
    color: '#a855f7',
    plainEnglish: 'The rate of change of options delta for market makers. When GEX is positive, dealers trade against price (dampening volatility). When negative, dealers trade with price (accelerating volatility).',
    institutionalEdge: 'Options market makers must stay delta-neutral. In positive GEX (+GEX), they buy dips and sell rips, pinning price in a tight range. In negative GEX (-GEX), they must sell dumps and buy pumps, creating violent trend cascades.',
    actionableRule: 'In +GEX environments, scalp mean-reversion between Call & Put walls. In -GEX environments, avoid fading breakouts — trade momentum expansions with wider targets.',
  },
  {
    id: 'call_wall',
    term: 'Call Wall Strike',
    acronym: 'CW',
    category: 'OPTIONS & GEX',
    color: '#9333ea',
    plainEnglish: 'The specific strike price with the largest concentration of open interest in Call options. Acts as the primary institutional ceiling for the active expiry.',
    institutionalEdge: 'As price nears the Call Wall, market makers who sold those calls must short futures contracts to hedge their delta risk, creating massive algorithmic selling resistance.',
    actionableRule: 'Treat the Call Wall as a hard take-profit target for long positions. Avoid entering fresh longs directly into the Call Wall unless a massive volume ignition breaks it.',
  },
  {
    id: 'put_wall',
    term: 'Put Wall Strike',
    acronym: 'PW',
    category: 'OPTIONS & GEX',
    color: '#10b981',
    plainEnglish: 'The strike price with the largest concentration of open interest in Put options. Acts as the primary institutional floor.',
    institutionalEdge: 'Market makers must aggressively buy underlying futures as price drops toward the Put Wall to rebalance delta, providing strong automated bid support.',
    actionableRule: 'Use the Put Wall as a high-confidence invalidation baseline. Placing stop losses 0.5% below the Put Wall minimizes false stop-outs.',
  },
  {
    id: 'max_pain',
    term: 'Max Pain Strike',
    acronym: 'MAX PAIN',
    category: 'OPTIONS & GEX',
    color: '#c084fc',
    plainEnglish: 'The strike price at which the largest number of total call and put options contracts would expire completely worthless, causing the maximum financial pain to options buyers.',
    institutionalEdge: 'Because options writers (predominantly institutions and market makers) profit when options expire worthless, price gravitates toward the Max Pain strike as expiry approaches (08:00 UTC).',
    actionableRule: 'On option expiry days (Fridays, monthly/quarterly closes), if price is trading within 2% of Max Pain, fade moves away from it and expect pinning toward that strike.',
  },
  {
    id: 'skew_25d',
    term: '25-Delta Skew',
    acronym: '25D SKEW',
    category: 'OPTIONS & GEX',
    color: '#38bdf8',
    plainEnglish: 'The difference in implied volatility between out-of-the-money put options and out-of-the-money call options. Measures whether smart money is paying up for downside protection or upside speculation.',
    institutionalEdge: 'Negative skew means calls are priced higher than puts (aggressive institutional FOMO / upside positioning). Positive skew means puts are expensive (institutional downside hedging).',
    actionableRule: 'When skew drops into deeply negative territory while price is consolidating, expect an impending bullish volatility breakout.',
  },

  // 5. QUANTITATIVE & RISK
  {
    id: 'sharpe_sortino',
    term: 'Rolling Sharpe & Sortino Ratios',
    acronym: 'SHARPE / SORTINO',
    category: 'QUANT & RISK',
    color: '#34d399',
    plainEnglish: 'Mathematical formulas that calculate how much profit you earn per unit of risk. Sharpe measures return vs all volatility; Sortino measures return vs bad (downside) volatility only.',
    institutionalEdge: 'Hedge funds use Sharpe > 1.0 to distinguish true alpha from lucky gambling. A high Sortino ratio proves an asset is trending steadily upward without nauseating drawdowns.',
    actionableRule: 'When Sharpe is >= 1.0, increase trade sizing and hold for multi-R trend expansions. When Sharpe is < 0.5, cut size by 50% and strictly scalp mean-reversions.',
  },
  {
    id: 'z_score',
    term: 'Z-Score (Standard Deviations from VWMA)',
    acronym: 'Z-SCORE (σ)',
    category: 'QUANT & RISK',
    color: '#06b6d4',
    plainEnglish: 'Measures how many standard deviations price is currently stretched away from its 50-period Volume-Weighted Moving Average. 0 is fair value; +2.0 is statistically stretched; -2.0 is oversold.',
    institutionalEdge: 'In statistical mechanics and quant finance, prices distributed normally revert to the mean 95.4% of the time once they reach ±2.0 standard deviations.',
    actionableRule: 'Never buy when Z-score is > +2.0σ, and never short when Z-score is < -2.0σ. Look for exhaustion wicks to fade back toward the 0-line mean.',
  },
  {
    id: 'rvol',
    term: 'Relative Volume Multiple',
    acronym: 'RVOL',
    category: 'QUANT & RISK',
    color: '#f59e0b',
    plainEnglish: 'Compares the volume of the current candle to the average volume of candles at the exact same time of day over the last 20 periods. 1.0x is average; >2.0x is institutional ignition; <0.45x is dry-up.',
    institutionalEdge: 'High RVOL indicates institutional participation and conviction. Low RVOL indicates retail noise and low liquidity.',
    actionableRule: 'Require RVOL > 1.5x on any breakout trade. Breakouts with RVOL < 1.0x fail 78% of the time and should be faded.',
  },
  {
    id: 'kaufman_efficiency',
    term: 'Kaufman Trend Efficiency Ratio',
    acronym: 'KER',
    category: 'QUANT & RISK',
    color: '#60a5fa',
    plainEnglish: 'Measures whether price is moving in a straight, clean directional line (100% efficient) or thrashing back and forth in a noisy, whippy chop zone (0% efficient).',
    institutionalEdge: 'Trend-following algorithms disable momentum execution when efficiency drops below 30% to prevent death by a thousand papercuts in sideways ranges.',
    actionableRule: 'Only use trailing stops and breakout entries when KER > 40%. In low KER (<30%), switch to fixed limit orders at range boundaries.',
  },

  // 6. PRICE ACTION & TREND
  {
    id: 'bos',
    term: 'Break of Structure',
    acronym: 'BOS',
    category: 'PRICE ACTION',
    color: '#4edea3',
    plainEnglish: 'When price cleanly breaks and closes beyond the previous major swing high in an uptrend or swing low in a downtrend, confirming trend continuation.',
    institutionalEdge: 'BOS confirms that institutional orderflow has successfully cleared all resting liquidity and continues to push prices in the direction of the dominant auction.',
    actionableRule: 'Wait for a full candle body close beyond the swing point (not just a wick). Once BOS is printed, mark the originating Order Block for your pullback entry.',
  },
  {
    id: 'choch',
    term: 'Change of Character',
    acronym: 'CHoCH',
    category: 'PRICE ACTION',
    color: '#f43f5e',
    plainEnglish: 'The very first break of an opposing swing high or low that signals the trend may be reversing rather than continuing.',
    institutionalEdge: 'Smart money uses CHoCH to transition from accumulation into markup, or from distribution into markdown. It is the earliest structural warning of a trend flip.',
    actionableRule: 'When an uptrend prints a lower low (bearish CHoCH), immediately close long positions and prepare to short the first pullback into the newly formed bearish Order Block.',
  },
  {
    id: 'ema_ribbon',
    term: 'EMA Ribbon Alignment',
    acronym: 'EMA 20/50/200',
    category: 'PRICE ACTION',
    color: '#3b82f6',
    plainEnglish: 'Stacking of the 20, 50, and 200 exponential moving averages. When 20 > 50 > 200, the trend is cleanly bullish; when 20 < 50 < 200, the trend is cleanly bearish.',
    institutionalEdge: 'Trend-following CTAs and quantitative macro funds allocate capital programmatically based on moving average slope and separation.',
    actionableRule: 'Only take long setups when price is above the 50 and 200 EMA. In a bullish ribbon alignment, the 20 EMA serves as dynamic trailing support.',
  },
  {
    id: 'confluence',
    term: 'Multi-Theory Confluence Score',
    acronym: 'CONFLUENCE',
    category: 'PRICE ACTION',
    color: '#10b981',
    plainEnglish: 'When three or more independent analytical theories (e.g. Volume Profile, Order Blocks, Options Walls, and RSI/CVD) point to the exact same price level.',
    institutionalEdge: 'Independent institutions trade different models. When multiple models align at one price, their orders stack together, creating the highest probability reaction zones.',
    actionableRule: 'Only take trades when Confluence Score >= 70%. If only one lens triggers without structural confluence, pass on the trade or cut position size by half.',
  },
];

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTermId?: string;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose, initialTermId }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm>(
    GLOSSARY_TERMS.find((t) => t.id === initialTermId) || GLOSSARY_TERMS[0]
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['ALL', 'VOLUME PROFILE', 'SMC & AMD', 'ORDERFLOW & VSA', 'OPTIONS & GEX', 'QUANT & RISK', 'PRICE ACTION'];

  const filteredTerms = useMemo(() => {
    return GLOSSARY_TERMS.filter((t) => {
      const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.term.toLowerCase().includes(q) ||
        (t.acronym && t.acronym.toLowerCase().includes(q)) ||
        t.plainEnglish.toLowerCase().includes(q) ||
        t.actionableRule.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  const handleCopyRule = (term: GlossaryTerm) => {
    navigator.clipboard.writeText(`${term.term} (${term.acronym}) Rule: ${term.actionableRule}`).then(() => {
      setCopiedId(term.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0b0e14] border border-[#00f0ff]/40 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#272a31] bg-[#141821]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff]">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-[15px] font-bold text-[#dbfcff]">
                  INSTITUTIONAL QUANT & SMC GLOSSARY
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] font-mono text-[10px] font-semibold">
                  25+ ROOKIE-FRIENDLY TERMS
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#849495]">
                Plain-English institutional definitions, smart-money edge & actionable trading execution rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#191c22] hover:bg-[#272a31] text-[#849495] hover:text-[#e1e2eb] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Strip: Search and Category Pills */}
        <div className="p-3 border-b border-[#272a31] bg-[#10131a] flex flex-col gap-2.5">
          <div className="relative">
            <span className="absolute left-3 top-2.5 material-symbols-outlined text-[16px] text-[#849495]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by term name, acronym, or concept (e.g. POC, Order Block, CVD, GEX, Sharpe)..."
              className="w-full h-9 pl-9 pr-4 bg-[#0b0e14] border border-[#272a31] focus:border-[#00f0ff] rounded-lg font-mono text-[12px] text-[#e1e2eb] placeholder:text-[#849495] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'bg-[#191c22] text-[#849495] hover:text-[#e1e2eb] border border-[#272a31]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content: Split Pane on Desktop (Terms List on Left, Deep Dive on Right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#1e2433]">
          {/* Left Column: Term Cards */}
          <div className="md:col-span-5 overflow-y-auto no-scrollbar divide-y divide-[#191c22]/80 max-h-[40vh] md:max-h-none">
            {filteredTerms.length === 0 ? (
              <div className="p-6 text-center font-mono text-[12px] text-[#849495]">
                No terms found matching &quot;{search}&quot;
              </div>
            ) : (
              filteredTerms.map((term) => {
                const isSelected = selectedTerm.id === term.id;
                return (
                  <button
                    key={term.id}
                    onClick={() => setSelectedTerm(term)}
                    className={`w-full p-3 text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-[#141821] border-l-4 border-l-[#00f0ff]'
                        : 'hover:bg-[#121620]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-bold text-[#dbfcff]">
                          {term.term}
                        </span>
                        {term.acronym && (
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.2 rounded font-semibold"
                            style={{
                              backgroundColor: `${term.color}20`,
                              color: term.color,
                              border: `1px solid ${term.color}50`,
                            }}
                          >
                            {term.acronym}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[8px] text-[#849495] uppercase">
                        {term.category}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#849495] line-clamp-2 leading-relaxed">
                      {term.plainEnglish}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Deep-Dive Card */}
          <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto no-scrollbar flex flex-col gap-4 bg-[#0d1017]">
            {/* Term Title & Badges */}
            <div className="flex flex-col gap-2 pb-3 border-b border-[#1e2433]">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedTerm.color }}
                  ></span>
                  <h2 className="font-mono text-[18px] sm:text-[20px] font-bold text-[#dbfcff] tracking-tight">
                    {selectedTerm.term}
                  </h2>
                </div>
                {selectedTerm.acronym && (
                  <span
                    className="font-mono text-[11px] px-2 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: `${selectedTerm.color}25`,
                      color: selectedTerm.color,
                      border: `1px solid ${selectedTerm.color}60`,
                    }}
                  >
                    {selectedTerm.acronym}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#849495]">
                <span>CATEGORY:</span>
                <span className="text-[#00f0ff] font-semibold">{selectedTerm.category}</span>
              </div>
            </div>

            {/* Row 1: What it is in Plain English (Rookie Friendly) */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-lg bg-[#141821] border border-[#272a31]">
              <div className="flex items-center gap-2 text-[#00f0ff] font-mono text-[11px] font-bold">
                <span className="material-symbols-outlined text-[16px]">school</span>
                <span>WHAT IT MEANS IN PLAIN ENGLISH</span>
              </div>
              <p className="font-sans text-[12px] sm:text-[13px] text-[#e1e2eb] leading-relaxed">
                {selectedTerm.plainEnglish}
              </p>
            </div>

            {/* Row 2: Institutional Edge (Why hedge funds & market makers use it) */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-lg bg-[#141821] border border-[#272a31]">
              <div className="flex items-center gap-2 text-[#f59e0b] font-mono text-[11px] font-bold">
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>THE INSTITUTIONAL EDGE</span>
              </div>
              <p className="font-sans text-[12px] sm:text-[13px] text-[#cbd5e1] leading-relaxed">
                {selectedTerm.institutionalEdge}
              </p>
            </div>

            {/* Row 3: Actionable Trading Execution Rule */}
            <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#141821] border border-[#4edea3]/30 shadow-[0_0_12px_rgba(78,222,163,0.1)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#4edea3] font-mono text-[11px] font-bold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>ACTIONABLE EXECUTION RULE</span>
                </div>
                <button
                  onClick={() => handleCopyRule(selectedTerm)}
                  className="px-2 py-0.5 rounded bg-[#191c22] hover:bg-[#272a31] text-[#849495] hover:text-[#4edea3] border border-[#272a31] font-mono text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {copiedId === selectedTerm.id ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedId === selectedTerm.id ? 'COPIED' : 'COPY RULE'}</span>
                </button>
              </div>
              <p className="font-mono text-[12px] sm:text-[12.5px] text-[#4edea3] leading-relaxed bg-[#0b0e14] p-2.5 rounded border border-[#4edea3]/20">
                {selectedTerm.actionableRule}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#272a31] bg-[#141821] flex items-center justify-between font-mono text-[10px] text-[#849495]">
          <span>VERTEX COMPANION RADAR // INSTITUTIONAL KNOWLEDGE BASE</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 font-semibold transition-colors cursor-pointer"
          >
            CLOSE GLOSSARY
          </button>
        </div>
      </div>
    </div>
  );
};
