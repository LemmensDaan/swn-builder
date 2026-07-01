/**
 * TradeCalculator — Speculative Trade / Merchant rules
 * Stars Without Number Revised, pp. 237–238
 *
 * Self-contained component; wire into HomeScreen as a new tab.
 */

import { useState } from 'react';
import {
  GOODS_TIERS,
  roll2d6,
  rollD6,
  calcBuyPrice,
  calcSellPrice,
  isCargoLost,
  type GoodsTier,
} from '../../data/trade';

// ── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ── Small helper label ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-gray-500 uppercase tracking-wider">{children}</span>;
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-mono font-bold ${highlight ? 'text-amber-300' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TradeCalculator() {
  const [tier, setTier] = useState<GoodsTier>('finished_goods');
  const [tons, setTons] = useState(10);
  const [tradeSkill, setTradeSkill] = useState(0);

  // Buy state
  const [buyRoll, setBuyRoll] = useState<number | null>(null);
  const [buyBargained, setBuyBargained] = useState(false);
  const [buyBargainSuccess, setBuyBargainSuccess] = useState(false);
  const [buyLossRoll, setBuyLossRoll] = useState<number | null>(null);

  // Sell state
  const [sellRoll, setSellRoll] = useState<number | null>(null);
  const [sellBargained, setSellBargained] = useState(false);
  const [sellBargainSuccess, setSellBargainSuccess] = useState(false);
  const [sellLossRoll, setSellLossRoll] = useState<number | null>(null);

  const tierDef = GOODS_TIERS.find(t => t.id === tier)!;

  function handleBuyRoll() {
    setBuyRoll(roll2d6());
    setBuyLossRoll(null);
    setSellRoll(null);
    setSellLossRoll(null);
  }

  function handleBuyLossCheck() {
    setBuyLossRoll(rollD6());
  }

  function handleSellRoll() {
    setSellRoll(roll2d6() + 1); // 2d6+1
    setSellLossRoll(null);
  }

  function handleSellLossCheck() {
    setSellLossRoll(rollD6());
  }

  const buyPrice = buyRoll !== null
    ? calcBuyPrice(tierDef.buyMultiplier, buyRoll, tons, tradeSkill, buyBargained && buyBargainSuccess)
    : null;

  const sellPrice = sellRoll !== null
    ? calcSellPrice(tierDef.sellMultiplier, sellRoll, tons, tradeSkill, sellBargained && sellBargainSuccess)
    : null;

  const buyLost = buyLossRoll !== null ? isCargoLost(buyLossRoll, buyBargained) : null;
  const sellLost = sellLossRoll !== null ? isCargoLost(sellLossRoll, sellBargained) : null;

  const profit = buyPrice !== null && sellPrice !== null && buyLost !== true && sellLost !== true
    ? sellPrice - buyPrice
    : null;

  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Speculative Trade</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quick merchant rules — <em>Stars Without Number Revised</em> pp. 237–238
          </p>
        </div>

        {/* ── Setup ── */}
        <Section title="Cargo Setup">
          <div className="space-y-4">
            {/* Goods tier */}
            <div>
              <Label>Goods Tier</Label>
              <div className="mt-1 space-y-1">
                {GOODS_TIERS.map(t => (
                  <label key={t.id} className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="tier" value={t.id} checked={tier === t.id}
                      onChange={() => {
                        setTier(t.id as GoodsTier);
                        setBuyRoll(null); setSellRoll(null); setBuyLossRoll(null); setSellLossRoll(null);
                      }}
                      className="mt-0.5 accent-amber-400" />
                    <div>
                      <span className="text-sm font-medium text-gray-200">{t.label}</span>
                      <span className="text-xs text-gray-500 ml-2">×{t.buyMultiplier.toLocaleString()} cr/ton</span>
                      <p className="text-xs text-gray-600">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Tons */}
            <div>
              <Label>Cargo (tons)</Label>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => setTons(t => Math.max(1, t - 1))}
                  className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm flex items-center justify-center">−</button>
                <input type="number" min={1} value={tons} onChange={e => setTons(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-center bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-amber-500" />
                <button onClick={() => setTons(t => t + 1)}
                  className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm flex items-center justify-center">+</button>
                <span className="text-xs text-gray-600">tons</span>
              </div>
            </div>

            {/* Trade skill */}
            <div>
              <Label>Bargainer's Trade Skill Level</Label>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2, 3, 4].map(lvl => (
                  <button key={lvl} onClick={() => setTradeSkill(lvl)}
                    className={`w-8 h-8 rounded text-sm font-bold transition-colors ${tradeSkill === lvl ? 'bg-amber-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {tradeSkill > 0
                  ? `Buy: −${tradeSkill * 10}% on success · Sell: +${tradeSkill * 10}% on success`
                  : 'No Trade skill — no bargaining bonus/penalty'}
              </p>
            </div>
          </div>
        </Section>

        {/* ── Buying ── */}
        <Section title="Buying Cargo (Source World)">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Roll 2d6 and multiply by {tierDef.buyMultiplier.toLocaleString()} cr for the base price per ton.
              PCs can bargain with Cha/Trade vs. seller's Wis/Trade; success reduces price by {tradeSkill > 0 ? `${tradeSkill * 10}%` : '—'}.
            </p>
            <button onClick={handleBuyRoll}
              className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
              Roll 2d6 (Buy Price)
            </button>

            {buyRoll !== null && (
              <div className="space-y-3">
                <ResultRow label="2d6 roll" value={String(buyRoll)} />
                <ResultRow label="Base price / ton" value={`${(buyRoll * tierDef.buyMultiplier).toLocaleString()} cr`} />

                {tradeSkill > 0 && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={buyBargained} onChange={e => setBuyBargained(e.target.checked)}
                        className="accent-amber-400" />
                      <span className="text-sm text-gray-300">Attempted to bargain (Cha/Trade check)</span>
                    </label>
                    {buyBargained && (
                      <label className="flex items-center gap-2 ml-5 cursor-pointer">
                        <input type="checkbox" checked={buyBargainSuccess} onChange={e => setBuyBargainSuccess(e.target.checked)}
                          className="accent-green-500" />
                        <span className="text-sm text-gray-300">Bargain succeeded</span>
                      </label>
                    )}
                  </div>
                )}

                <ResultRow
                  label={`Total buy price (${tons} tons)`}
                  value={`${buyPrice!.toLocaleString()} cr`}
                  highlight
                />

                {/* Cargo loss check */}
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">
                    Before loading: roll 1d6{buyBargained ? ' (−1 because you bargained)' : ''}. On 1 or less the deal goes wrong.
                  </p>
                  <button onClick={handleBuyLossCheck}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
                    Roll d6 Loss Check
                  </button>
                  {buyLossRoll !== null && (
                    <div className={`mt-2 p-2 rounded text-sm font-medium ${buyLost ? 'bg-red-900/40 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                      Rolled {buyLossRoll}{buyBargained ? ' (−1 = ' + (buyLossRoll - 1) + ')' : ''} —{' '}
                      {buyLost
                        ? 'Cargo lost, stolen, confiscated, or fake! Take an adventure to recover.'
                        : 'Cargo loaded successfully.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Selling ── */}
        <Section title="Selling Cargo (Destination World)">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Roll 2d6+1 and multiply by {tierDef.sellMultiplier.toLocaleString()} cr for the offered sell price per ton.
              PCs can bargain with Cha/Trade vs. buyer's Wis/Trade; success adds {tradeSkill > 0 ? `${tradeSkill * 10}%` : '—'}.
            </p>
            <button onClick={handleSellRoll}
              className="px-4 py-2 rounded-lg bg-sky-800 hover:bg-sky-700 text-white text-sm font-semibold transition-colors">
              Roll 2d6+1 (Sell Price)
            </button>

            {sellRoll !== null && (
              <div className="space-y-3">
                <ResultRow label="2d6+1 roll" value={String(sellRoll)} />
                <ResultRow label="Base sell price / ton" value={`${(sellRoll * tierDef.sellMultiplier).toLocaleString()} cr`} />

                {tradeSkill > 0 && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={sellBargained} onChange={e => setSellBargained(e.target.checked)}
                        className="accent-amber-400" />
                      <span className="text-sm text-gray-300">Attempted to bargain (Cha/Trade check)</span>
                    </label>
                    {sellBargained && (
                      <label className="flex items-center gap-2 ml-5 cursor-pointer">
                        <input type="checkbox" checked={sellBargainSuccess} onChange={e => setSellBargainSuccess(e.target.checked)}
                          className="accent-green-500" />
                        <span className="text-sm text-gray-300">Bargain succeeded</span>
                      </label>
                    )}
                  </div>
                )}

                <ResultRow
                  label={`Total sell price (${tons} tons)`}
                  value={`${sellPrice!.toLocaleString()} cr`}
                  highlight
                />

                {/* Cargo loss check */}
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2">
                    After sale finalized: roll 1d6{sellBargained ? ' (−1 because you bargained)' : ''}. On 1 or less the sale goes wrong.
                  </p>
                  <button onClick={handleSellLossCheck}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
                    Roll d6 Loss Check
                  </button>
                  {sellLossRoll !== null && (
                    <div className={`mt-2 p-2 rounded text-sm font-medium ${sellLost ? 'bg-red-900/40 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
                      Rolled {sellLossRoll}{sellBargained ? ' (−1 = ' + (sellLossRoll - 1) + ')' : ''} —{' '}
                      {sellLost
                        ? 'Sale went wrong! PCs lose both money and goods. Recover via adventure.'
                        : 'Sale completed successfully.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Profit Summary ── */}
        {profit !== null && (
          <Section title="Run Summary">
            <div className="space-y-1">
              <ResultRow label="Buy total" value={`${buyPrice!.toLocaleString()} cr`} />
              <ResultRow label="Sell total" value={`${sellPrice!.toLocaleString()} cr`} />
              <div className={`flex items-center justify-between py-2 mt-1 rounded px-2 ${profit >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                <span className="text-sm font-semibold text-gray-300">Profit / Loss</span>
                <span className={`text-lg font-bold font-mono ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : ''}{profit.toLocaleString()} cr
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {tons} ton{tons !== 1 ? 's' : ''} × {tierDef.label}
              </p>
            </div>
          </Section>
        )}

        {/* ── Reference ── */}
        <Section title="Quick Reference — Trade Rules">
          <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
            <p><span className="text-gray-300 font-semibold">Finding a deal:</span> PCs must wait one week to find a new trade deal at a given world.</p>
            <p><span className="text-gray-300 font-semibold">Buy price:</span> Roll 2d6 × tier multiplier per ton. Bargain with opposed Cha/Trade vs. Wis/Trade; success = −10% per Trade level.</p>
            <p><span className="text-gray-300 font-semibold">Cargo loss (buy):</span> Roll 1d6 before loading. −1 if bargained. Result ≤ 1 → cargo lost/fake/confiscated.</p>
            <p><span className="text-gray-300 font-semibold">Sell price:</span> Roll (2d6+1) × tier multiplier per ton. Bargain with same opposed check; success = +10% per Trade level.</p>
            <p><span className="text-gray-300 font-semibold">Cargo loss (sell):</span> Roll 1d6 after sale. −1 if bargained. Result ≤ 1 → both money and goods lost.</p>
            <div className="border border-gray-800 rounded p-2 mt-2">
              <p className="text-gray-400 font-semibold mb-1">Tier Multipliers</p>
              <div className="space-y-0.5">
                <p>Bulk goods: ×10 cr/ton (raw commodities)</p>
                <p>Finished goods: ×100 cr/ton (manufactured items)</p>
                <p>Expensive goods: ×1,000 cr/ton (high-tech / luxury)</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
