import { useEffect, useState } from 'react';
import { SKILL_INFO } from '../data/skillInfo';
import { SKILLS, PSYCHIC_SKILLS } from '../data/skills';

/** Lock background page scroll while a full-screen overlay is open (avoids a second scrollbar). */
export function useLockBodyScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => { html.style.overflow = prevHtml; body.style.overflow = prevBody; };
  }, []);
}

interface Props {
  onClose: () => void;
}

function Section({ title, page, defaultOpen, children }: {
  title: string; page?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-gray-700 rounded-lg mb-3 bg-gray-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full cursor-pointer select-none px-4 py-3 flex items-center justify-between text-amber-300 font-bold hover:bg-gray-800/60 text-left"
      >
        <span>{title} {page && <span className="text-xs text-gray-600 font-normal">({page})</span>}</span>
        <span className={`text-gray-500 text-sm transition-transform duration-300 ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {/* grid-rows 0fr → 1fr animates height smoothly without measuring */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 border-l-2 border-amber-700 rounded-r px-4 py-2 my-2 text-sm text-gray-400">
      {children}
    </div>
  );
}

export default function HelpPage({ onClose }: Props) {
  useLockBodyScroll();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-amber-300 font-semibold">Rules Reference & FAQ</span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 text-gray-300 leading-relaxed">
          <p className="text-xs text-gray-600 mb-2">
            Page references are to <em>Stars Without Number: Revised Deluxe Edition</em> (Kevin Crawford, Sine Nomine Publishing).
          </p>

          {/* ── Encumbrance ─────────────────────────────────────────── */}
          <Section title="Encumbrance" page="p.65" defaultOpen>
            <p className="text-sm">
              You can only carry so much before it slows you down. Gear is either <strong className="text-gray-200">Readied</strong>
              {' '}or <strong className="text-gray-200">Stowed</strong>:
            </p>
            <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong className="text-gray-200">Readied</strong> — items you're wearing or using, or have to hand in sheaths,
                holsters, and belt pouches. <strong>Suits of armor count as Readied.</strong> Ordinary clothing and jewelry don't count.
                You can draw or produce a Readied item as part of any action.
                <br/><span className="text-amber-400">Maximum Readied = your Strength score ÷ 2, rounded down.</span>
              </li>
              <li>
                <strong className="text-gray-200">Stowed</strong> — items packed away in a backpack or pockets. Getting a Stowed
                item out in a hurry costs a Main Action.
                <br/><span className="text-amber-400">Maximum Stowed = your full Strength score.</span>
              </li>
            </ul>
            <p className="text-sm mt-3">You can overload yourself for a price in speed:</p>
            <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
              <li><strong className="text-amber-400">Lightly Encumbered</strong> — up to +2 Readied or +4 Stowed over the limit. Base move drops from 10m to <strong>7m</strong> per round.</li>
              <li><strong className="text-orange-400">Heavily Encumbered</strong> — a further +2 Readied or +4 Stowed. Base move drops to <strong>5m</strong> per round.</li>
            </ul>
            <p className="text-sm mt-3">
              Items with an Encumbrance value above 1 (e.g. rifles, vacc suits) count as that many items. Items marked as
              negligible ("*") don't count, and some small items can be bundled three-to-a-slot.
            </p>
            <Example>
              <strong className="text-gray-300">Example.</strong> A Strength 13 character can have <strong>6 Readied</strong> (13 ÷ 2 = 6.5 → 6)
              and <strong>13 Stowed</strong> items. They wear Woven Body Armor (Enc 2, Readied) and carry a Combat Rifle (Enc 2, Readied)
              and a Knife (Enc 1, Readied) = 5 Readied, fine. If they also strap on a second rifle (+2 → 7 Readied, 1 over the limit of 6),
              they become <strong className="text-amber-400">Lightly Encumbered</strong> and move 7m/round.
            </Example>
            <p className="text-xs text-gray-500">
              In this builder, armor and weapons are counted as Readied and general gear as Stowed. The Equipment step shows your
              running totals and warns when you cross an encumbrance threshold.
            </p>
          </Section>

          {/* ── Credits ─────────────────────────────────────────────── */}
          <Section title="Credits & Budget" page="p.65">
            <p className="text-sm">
              Starting money is either a fixed <strong>equipment package</strong> <em>or</em> <strong>2d6 × 100 credits</strong> to spend freely —
              pick one method. After either, you can add any extra credits your GM grants and buy more gear.
              In the Equipment step, the <strong className="text-gray-200">Budget</strong> is your total money; <strong className="text-gray-200">Spent</strong>
              {' '}is the cost of the gear you've bought; <strong className="text-gray-200">Remaining</strong> = Budget − Spent.
              Going over budget is allowed (it turns red) in case your GM granted extra funds or you're tracking debt.
            </p>
            <Example>
              <strong className="text-gray-300">Example.</strong> You roll 25 credits and buy a 50-credit item. Spent is 50,
              so Remaining is <strong className="text-red-400">−25</strong> — you're 25 over budget. The simple sheet just shows
              "−25 credits remaining"; the detailed view breaks out Budget / Spent / Remaining.
            </Example>
          </Section>

          {/* ── Core stats ──────────────────────────────────────────── */}
          <Section title="Core Calculations">
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><strong className="text-gray-200">Attribute modifier</strong> (p.6): 3 → −2, 4–7 → −1, 8–13 → +0, 14–17 → +1, 18 → +2.</li>
              <li><strong className="text-gray-200">Hit Points</strong> (p.9): 1d6 + CON modifier (min 1). Warriors add +2. Each level rerolls the whole pool.</li>
              <li><strong className="text-gray-200">Attack Bonus</strong> (p.17): Warrior = character level; everyone else = ½ level rounded down. Partial Warrior adds +1 at 1st and 5th level.</li>
              <li><strong className="text-gray-200">Armor Class</strong> (p.9): best worn armor (or 10 unarmored) + DEX modifier. Armor does not stack.</li>
              <li><strong className="text-gray-200">Saving Throws</strong> (p.9): 16 − level − the better relevant attribute modifier (so 15 − mod at level 1). Roll d20 equal or over to succeed.</li>
              <li><strong className="text-gray-200">System Strain</strong> (p.32): maximum equals your CON score.</li>
              <li><strong className="text-gray-200">Psionic Effort</strong> (p.21): 1 + your highest psychic skill + the better of WIS or CON modifier.</li>
            </ul>
          </Section>

          {/* ── Skills ──────────────────────────────────────────────── */}
          <Section title="Skills" page="p.12">
            <p className="text-sm mb-3">
              Skill checks roll 2d6 + the most applicable attribute modifier + skill level vs a difficulty. Levels run from
              0 (competent) to 4 (best in the sector); no starting character exceeds level-1.
            </p>
            <div className="space-y-1.5">
              {SKILLS.map(s => (
                <div key={s} className="text-sm">
                  <span className="text-amber-300 font-medium">{s}</span>
                  <span className="text-gray-400"> — {SKILL_INFO[s]}</span>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-indigo-300 mt-4 mb-1">Psychic Disciplines</p>
            <div className="space-y-1.5">
              {PSYCHIC_SKILLS.map(s => (
                <div key={s} className="text-sm">
                  <span className="text-indigo-300 font-medium">{s}</span>
                  <span className="text-gray-400"> — {SKILL_INFO[s]}</span>
                </div>
              ))}
            </div>
          </Section>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
