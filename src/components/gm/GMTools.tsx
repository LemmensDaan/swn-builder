import { useState } from 'react';
import { Dices, RefreshCw } from 'lucide-react';
import {
  rollNPC,
  rollAdventure,
  rollSociety,
  rollReligion,
  rollName,
  rollRandomName,
  NAME_TABLES,
  type GeneratedNPC,
  type GeneratedAdventure,
  type GeneratedSociety,
  type GeneratedReligion,
  type Culture,
} from '../../data/gm-generators';
import TradeCalculator from '../trade/TradeCalculator';

// ─── helpers ─────────────────────────────────────────────────────────────────

type Tab = 'npc' | 'adventure' | 'society' | 'religion' | 'names' | 'trade';

const TABS: { key: Tab; label: string }[] = [
  { key: 'npc', label: 'NPC' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'society', label: 'Society' },
  { key: 'religion', label: 'Religion' },
  { key: 'names', label: 'Names' },
  { key: 'trade', label: 'Trade' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/70 select-none">
      {children}
    </span>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-100">{value}</span>
    </div>
  );
}

function RollButton({ onClick, label = 'Roll' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors shadow"
    >
      <Dices size={15} />
      {label}
    </button>
  );
}

function RerollButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Re-roll"
      className="p-1.5 rounded text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors"
    >
      <RefreshCw size={13} />
    </button>
  );
}

function ResultCard({
  title,
  onReroll,
  children,
}: {
  title?: string;
  onReroll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        {title && <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>}
        <RerollButton onClick={onReroll} />
      </div>
      {children}
    </div>
  );
}

// ─── NPC tab ─────────────────────────────────────────────────────────────────

function NPCTab() {
  const [npc, setNPC] = useState<GeneratedNPC | null>(null);

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Instantly generate a quick NPC with role, motivation, and hooks — using the one-roll NPC tables from the book.
      </p>
      <RollButton onClick={() => setNPC(rollNPC())} label="Roll Quick NPC" />
      {npc && (
        <ResultCard title="Quick NPC" onReroll={() => setNPC(rollNPC())}>
          <div className="mb-3">
            <SectionLabel>Snapshot</SectionLabel>
          </div>
          <ResultRow label="Age" value={npc.age} />
          <ResultRow label="Role in Society" value={npc.role} />
          <ResultRow label="Background" value={npc.background} />
          <ResultRow label="Most Obvious Trait" value={npc.trait} />
          <ResultRow label="Biggest Problem" value={npc.problem} />
          <ResultRow label="Greatest Desire" value={npc.desire} />
          <div className="mt-3 mb-2">
            <SectionLabel>As a People-style NPC</SectionLabel>
          </div>
          <ResultRow label="Motivation" value={npc.motivation} />
          <ResultRow label="What They Want from the PCs" value={npc.want} />
          <ResultRow label="Their Power" value={npc.power} />
          <ResultRow label="Memorable Hook" value={npc.hook} />
          <ResultRow label="Initial Manner" value={npc.manner} />
        </ResultCard>
      )}
    </div>
  );
}

// ─── Adventure tab ───────────────────────────────────────────────────────────

function AdventureTab() {
  const [adv, setAdv] = useState<GeneratedAdventure | null>(null);

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Generate a Problem/adventure seed using the Conflict Type, Situation, Focus, Restraint, and Twist tables (pp. 184-185).
      </p>
      <RollButton onClick={() => setAdv(rollAdventure())} label="Roll Adventure Seed" />
      {adv && (
        <ResultCard title="Adventure Seed" onReroll={() => setAdv(rollAdventure())}>
          <div className="mb-3">
            <SectionLabel>Conflict</SectionLabel>
          </div>
          <ResultRow label="Conflict Type" value={adv.conflictType} />
          <ResultRow label="Overall Situation" value={adv.situation} />
          <ResultRow label="Specific Focus" value={adv.focus} />
          <div className="mt-3 mb-2">
            <SectionLabel>Complications</SectionLabel>
          </div>
          <ResultRow label="Restraint (why it hasn't boiled over)" value={adv.restraint} />
          <ResultRow label="Twist" value={adv.twist} />
        </ResultCard>
      )}
    </div>
  );
}

// ─── Society tab ─────────────────────────────────────────────────────────────

function SocietyTab() {
  const [soc, setSoc] = useState<GeneratedSociety | null>(null);

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Build a world society using the one-roll Origins, Rulers, Ruled, and Flavor tables (pp. 292-303).
      </p>
      <RollButton onClick={() => setSoc(rollSociety())} label="Roll Society" />
      {soc && (
        <ResultCard title="World Society" onReroll={() => setSoc(rollSociety())}>
          <div className="mb-3">
            <SectionLabel>Origins</SectionLabel>
          </div>
          <ResultRow label="Reason Founded" value={soc.originReason} />
          <ResultRow label="Local Resource/Benefit" value={soc.localResource} />
          <ResultRow label="Age of Society" value={soc.age} />
          <ResultRow label="Other Societies" value={soc.otherGroups} />
          <ResultRow label="Prior Culture Relationship" value={soc.priorCultures} />
          <ResultRow label="Remnant of Prior Culture" value={soc.remnant} />

          <div className="mt-3 mb-2">
            <SectionLabel>Rulers</SectionLabel>
          </div>
          <ResultRow label="Form of Rule" value={soc.ruleForm} />
          <ResultRow label="Source of Legitimacy" value={soc.legitimacy} />
          <ResultRow label="Security of Rule" value={soc.ruleSecurity} />
          <ResultRow label="How Completely They Rule" value={soc.ruleCompleteness} />
          <ResultRow label="Conflict with Ruled Populace" value={soc.rulerConflict} />
          <ResultRow label="Conflict Among Ruling Class" value={soc.rulerClassConflict} />

          <div className="mt-3 mb-2">
            <SectionLabel>Ruled Class</SectionLabel>
          </div>
          <ResultRow label="Uniformity" value={soc.ruledUniformity} />
          <ResultRow label="Contentment" value={soc.ruledContent} />
          <ResultRow label="Ruled Trend" value={soc.ruledTrend} />
          <ResultRow label="Internal Conflict" value={soc.ruledClassConflict} />
          <ResultRow label="Their Power Over Rulers" value={soc.ruledPower} />
          <ResultRow label="Last Major Threat to Rulers" value={soc.ruledLastThreat} />

          <div className="mt-3 mb-2">
            <SectionLabel>Flavor</SectionLabel>
          </div>
          <ResultRow label="Cultural Flavor" value={soc.culturalFlavor} />
          <ResultRow label="Societal Virtue" value={soc.virtue} />
          <ResultRow label="Societal Vice" value={soc.vice} />
          <ResultRow label="Attitude to Outsiders" value={soc.xenophilia} />
          <ResultRow label="Custom or Quirk" value={soc.quirk} />
          <ResultRow label="Potential Patron" value={soc.patron} />
        </ResultCard>
      )}
    </div>
  );
}

// ─── Religion tab ─────────────────────────────────────────────────────────────

function ReligionTab() {
  const [rel, setRel] = useState<GeneratedReligion | null>(null);

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Generate a religion from scratch — origin, leadership, beliefs, attitude to psionics, current tensions, and taboos.
      </p>
      <RollButton onClick={() => setRel(rollReligion())} label="Roll Religion" />
      {rel && (
        <ResultCard title="Religion" onReroll={() => setRel(rollReligion())}>
          <ResultRow label="Origin" value={rel.origin} />
          <ResultRow label="Leadership Structure" value={rel.leadership} />
          <ResultRow label="Core Belief Focus" value={rel.beliefFocus} />
          <ResultRow label="Attitude to Psionics" value={rel.attitudeToPsionics} />
          <ResultRow label="Current Internal Issue" value={rel.currentIssue} />
          <ResultRow label="Relationship to State" value={rel.relationshipToState} />
          <ResultRow label="Primary Virtue" value={rel.virtue} />
          <ResultRow label="Major Taboo" value={rel.taboo} />
        </ResultCard>
      )}
    </div>
  );
}

// ─── Names tab ────────────────────────────────────────────────────────────────

interface GeneratedNameResult {
  culture: Culture;
  given: string;
  surname: string;
  gender: 'male' | 'female';
}

function NamesTab() {
  const [results, setResults] = useState<GeneratedNameResult[]>([]);
  const [selectedCulture, setSelectedCulture] = useState<Culture | 'random'>('random');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'random'>('random');
  const [count, setCount] = useState(5);

  const cultures = Object.keys(NAME_TABLES) as Culture[];

  function generate() {
    const newResults: GeneratedNameResult[] = [];
    for (let i = 0; i < count; i++) {
      if (selectedCulture === 'random') {
        newResults.push(rollRandomName(selectedGender));
      } else {
        newResults.push({ culture: selectedCulture, ...rollName(selectedCulture, selectedGender) });
      }
    }
    setResults(newResults);
  }

  return (
    <div>
      <p className="text-sm text-gray-400 mb-4">
        Generate names from the book's culture tables: Arabic, Chinese, English, Greek, Indian, Japanese, Latin, Nigerian, Russian, and Spanish.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Culture</label>
          <select
            value={selectedCulture}
            onChange={e => setSelectedCulture(e.target.value as Culture | 'random')}
            className="rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="random">Random</option>
            {cultures.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Gender</label>
          <select
            value={selectedGender}
            onChange={e => setSelectedGender(e.target.value as 'male' | 'female' | 'random')}
            className="rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="random">Random</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Count</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            {[1, 3, 5, 10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <RollButton onClick={generate} label="Generate Names" />

      {results.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Generated Names</SectionLabel>
            <RerollButton onClick={generate} />
          </div>
          <div className="flex flex-col divide-y divide-gray-800">
            {results.map((r, i) => (
              <div key={i} className="py-2 flex items-center justify-between gap-4">
                <span className="text-sm text-gray-100 font-medium">
                  {r.given} {r.surname}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {r.culture} · {r.gender}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function GMTools() {
  const [activeTab, setActiveTab] = useState<Tab>('npc');

  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 px-3 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-amber-400">GM Tools</h2>
          <p className="text-xs text-gray-500 mt-0.5">Random generators from Stars Without Number (Revised)</p>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-3 py-4 sm:px-6 sm:py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 pb-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'npc' && <NPCTab />}
        {activeTab === 'adventure' && <AdventureTab />}
        {activeTab === 'society' && <SocietyTab />}
        {activeTab === 'religion' && <ReligionTab />}
        {activeTab === 'names' && <NamesTab />}
        {activeTab === 'trade' && <TradeCalculator />}
      </div>
    </div>
  );
}
