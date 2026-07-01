import { useState, useEffect } from 'react';
import {
  ArrowLeft, Skull,
  Plus, X, Check, Heart, Target, Swords, Shield, Eye, DollarSign,
  Coins, ChevronsUp, Home, Sparkles, MapPin, EyeOff, Play, Zap,
} from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import { REFERENCE_ASSETS, FACTION_TAGS, FACTION_TAGS_FULL, FACTION_GOALS, factionMaxHp } from '../../data/faction-assets';
import {
  factionIncome, factionMaintenance, xpToRaise, assetCap, assetsOfType,
  GENGINEERED_SLAVES, runAssetAbility, hasAutomatableAbility,
  getAbilityKind, buysStealthed, tagBuyCost, type AbilityKind,
} from '../../data/faction-turn';
import AttackResolver from './AttackResolver';
import AbilityModal from './AbilityModal';
import type { Faction, FactionAsset, FactionGoal, FactionAssetType, TimelineEvent } from '../../types/sector';

// ─── helpers ─────────────────────────────────────────────────────────────────

const derivedMaxHp = factionMaxHp;

function assetTypeColor(type: FactionAssetType) {
  switch (type) {
    case 'Force':   return 'text-sky-400 bg-sky-900/30 border-sky-800/50';
    case 'Cunning': return 'text-violet-400 bg-violet-900/30 border-violet-800/50';
    case 'Wealth':  return 'text-emerald-400 bg-emerald-900/30 border-emerald-800/50';
  }
}

function assetTypeBadge(type: FactionAssetType) {
  switch (type) {
    case 'Force':   return 'bg-sky-900/50 text-sky-300 border border-sky-800/50';
    case 'Cunning': return 'bg-violet-900/50 text-violet-300 border border-violet-800/50';
    case 'Wealth':  return 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/50';
  }
}

const STAT_ICON: Record<FactionAssetType, typeof Shield> = {
  Force:   Shield,
  Cunning: Eye,
  Wealth:  DollarSign,
};

// ─── sheet section ────────────────────────────────────────────────────────────

function SheetSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── stat spinner ─────────────────────────────────────────────────────────────

function StatSpinner({
  label, value, colorClass, onChange,
}: {
  label: string;
  value: number;
  colorClass: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold flex items-center justify-center transition-colors"
        >-</button>
        <span className={`w-8 text-center font-bold text-lg ${colorClass}`}>{value}</span>
        <button
          onClick={() => onChange(Math.min(8, value + 1))}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold flex items-center justify-center transition-colors"
        >+</button>
      </div>
    </div>
  );
}

// ─── asset picker modal ───────────────────────────────────────────────────────

function AssetPickerModal({
  factionForce, factionCunning, factionWealth, factionTags, facCreds,
  onPick, onClose,
}: {
  factionForce: number;
  factionCunning: number;
  factionWealth: number;
  factionTags: string[];
  facCreds: number;
  onPick: (asset: FactionAsset) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<FactionAssetType | 'all'>('all');

  const statLimit: Record<FactionAssetType, number> = {
    Force:   factionForce,
    Cunning: factionCunning,
    Wealth:  factionWealth,
  };

  // Eugenics Cult unlocks the tag-gated Gengineered Slaves asset (p.224).
  const pool = factionTags.includes('Eugenics Cult')
    ? [GENGINEERED_SLAVES, ...REFERENCE_ASSETS]
    : REFERENCE_ASSETS;

  const filtered = pool.filter(a =>
    filter === 'all' ? true : a.type === filter
  );

  function pick(ref: typeof REFERENCE_ASSETS[number]) {
    onPick({
      id: crypto.randomUUID(),
      name: ref.name,
      type: ref.type,
      rating: ref.rating,
      hp: ref.maxHp,
      maxHp: ref.maxHp,
      attack: ref.attack,
      counter: ref.counter,
      notes: '',
      category: ref.category,
      cost: ref.cost,
      tl: ref.tl,
      maintenance: ref.maintenance,
      note: ref.note,
      special: ref.special,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-lg">Add Asset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-800">
          {(['all', 'Force', 'Cunning', 'Wealth'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? f === 'Force'   ? 'bg-sky-700 text-sky-100'
                  : f === 'Cunning' ? 'bg-violet-700 text-violet-100'
                  : f === 'Wealth'  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-amber-600 text-amber-100'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {filtered.map(ref => {
            const limit = statLimit[ref.type];
            const unlocked = ref.rating <= limit;
            return (
              <button
                key={`${ref.type}-${ref.name}`}
                onClick={() => unlocked && pick(ref)}
                disabled={!unlocked}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  unlocked
                    ? `${assetTypeColor(ref.type)} hover:brightness-125 cursor-pointer`
                    : 'border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${unlocked ? assetTypeBadge(ref.type) : 'bg-gray-800 text-gray-600 border border-gray-700'}`}>
                      {ref.type[0]}{ref.rating}
                    </span>
                    <span className={`font-semibold text-sm ${unlocked ? '' : 'text-gray-600'}`}>{ref.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={!unlocked ? 'text-gray-700' : ref.cost > facCreds ? 'text-red-400' : 'text-amber-400'} title={unlocked && ref.cost > facCreds ? 'Not enough FacCreds' : undefined}>{ref.cost} FC</span>
                    <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>HP {ref.maxHp || '—'}</span>
                    <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>TL{ref.tl}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className={`uppercase tracking-wide ${unlocked ? 'text-gray-500' : 'text-gray-700'}`}>{ref.category}</span>
                  <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>Atk {ref.attack}</span>
                  <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>Ctr {ref.counter}</span>
                  {ref.maintenance ? <span className="text-orange-400">{ref.maintenance} FC/turn upkeep</span> : null}
                  {ref.note ? <span className="text-gray-600">[{ref.note}]</span> : null}
                </div>
                <p className={`text-xs mt-1 ${unlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                  {ref.special ?? ref.description}
                  {!unlocked && (
                    <span className="ml-2 text-red-500 font-medium">
                      (requires {ref.type} {ref.rating})
                    </span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── goal picker modal ────────────────────────────────────────────────────────

function GoalPickerModal({
  onPick, onClose,
}: {
  onPick: (goal: FactionGoal) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customXp, setCustomXp] = useState(2);

  function pickPreset(preset: typeof FACTION_GOALS[number]) {
    onPick({
      id: crypto.randomUUID(),
      name: preset.name,
      description: preset.description,
      completed: false,
      xpReward: preset.xpReward,
    });
  }

  function addCustom() {
    if (!customName.trim()) return;
    onPick({
      id: crypto.randomUUID(),
      name: customName.trim(),
      description: customDesc.trim(),
      completed: false,
      xpReward: customXp,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-lg">Add Goal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Preset Goals</p>
          {FACTION_GOALS.map(g => (
            <button
              key={g.name}
              onClick={() => pickPreset(g)}
              className="w-full text-left rounded-lg border border-amber-800/40 bg-amber-900/10 hover:bg-amber-900/25 px-4 py-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-amber-300">{g.name}</span>
                <span className="text-xs text-amber-500 font-medium">+{g.xpReward} XP</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{g.description}</p>
            </button>
          ))}

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Custom Goal</p>
            <div className="space-y-2">
              <input
                className="input text-sm"
                placeholder="Goal name"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
              <input
                className="input text-sm"
                placeholder="Description (optional)"
                value={customDesc}
                onChange={e => setCustomDesc(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">XP Reward:</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={customXp}
                  onChange={e => setCustomXp(Math.max(0, Math.min(10, Number(e.target.value))))}
                  className="input text-sm w-20"
                />
                <button
                  onClick={addCustom}
                  disabled={!customName.trim()}
                  className="ml-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  Add Custom
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  faction: Faction;
  sectorId: string;
  sectorName: string;
  onBack: () => void;
}

export default function FactionSheet({ faction, sectorId, sectorName, onBack }: Props) {
  const {
    updateFaction, factionRaiseStat,
    factionAdjustFacCreds, factionProcessTurnStart, factionLog,
    systems, sectors,
  } = useSectorStore();
  const [local, setLocal] = useState<Faction>({ ...faction });
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showAttack, setShowAttack] = useState(false);
  const [abilityFor, setAbilityFor] = useState<{ asset: FactionAsset; kind: AbilityKind } | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tlDate, setTlDate] = useState('');
  const [tlTitle, setTlTitle] = useState('');

  const maxHp = derivedMaxHp(local.force, local.cunning, local.wealth);
  const retired = local.retired ?? false;
  const facCreds = local.facCreds ?? 0;
  const income = factionIncome(local);
  const maintenance = factionMaintenance(local);
  const turn = local.turn ?? 0;

  // Systems in this sector — for homeworld / asset-location pickers.
  const sectorSystems = Object.values(systems).filter(sys => sys.sectorId === sectorId);
  // Live faction from the store (so the attack resolver sees applied damage immediately).
  const liveFaction = sectors.find(s => s.id === sectorId)?.factions.find(f => f.id === faction.id) ?? local;
  const rivals = (sectors.find(s => s.id === sectorId)?.factions ?? []).filter(f => f.id !== faction.id && !(f.retired ?? false));

  // Keep the local mirror in sync with store-driven actions (turn processing, attacks,
  // XP raises). liveFaction is the stored object reference, stable between real updates.
  useEffect(() => { setLocal({ ...liveFaction }); }, [liveFaction]);

  function patch(updates: Partial<Faction>) {
    const next = { ...local, ...updates };
    setLocal(next);
    updateFaction(sectorId, faction.id, updates);
  }

  function patchStat(key: 'force' | 'cunning' | 'wealth', val: number) {
    const next = { ...local, [key]: val };
    const newMax = derivedMaxHp(next.force, next.cunning, next.wealth);
    const newHp = Math.min(local.hp, newMax);
    setLocal({ ...next, hp: newHp });
    updateFaction(sectorId, faction.id, { [key]: val, hp: newHp });
  }

  function availableTagSuggestions(val: string) {
    return FACTION_TAGS.filter(t =>
      (!val.trim() || t.toLowerCase().includes(val.toLowerCase())) && !local.tags.includes(t)
    );
  }

  function handleTagInputChange(val: string) {
    setNewTagInput(val);
    setTagSuggestions(availableTagSuggestions(val));
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || local.tags.includes(trimmed)) return;
    patch({ tags: [...local.tags, trimmed] });
    setNewTagInput('');
    setTagSuggestions([]);
  }

  function removeTag(tag: string) {
    patch({ tags: local.tags.filter(t => t !== tag) });
  }

  function addTlEvent() {
    const trimmed = tlTitle.trim();
    if (!trimmed) return;
    const event: TimelineEvent = { id: crypto.randomUUID(), date: tlDate.trim(), title: trimmed };
    patch({ timeline: [event, ...(local.timeline ?? [])] });
    setTlDate('');
    setTlTitle('');
  }

  function removeTlEvent(id: string) {
    patch({ timeline: (local.timeline ?? []).filter(e => e.id !== id) });
  }

  function addAsset(asset: FactionAsset) {
    // Preceptor Archive discounts TL4+ assets; Secretive buys them Stealthed.
    const cost = tagBuyCost(local, { cost: asset.cost ?? 0, tl: asset.tl ?? 0 });
    const stealthed = buysStealthed(local) ? true : asset.stealthed;
    // Bought assets can't act until next turn; default their location to the homeworld.
    patch({
      assets: [...local.assets, { ...asset, stealthed, notReady: true, locationSystemId: local.homeworldSystemId ?? null }],
      facCreds: Math.max(0, facCreds - cost),
    });
    if (cost > 0 || stealthed) {
      factionLog(sectorId, faction.id, `Bought ${asset.name} (−${cost} FC)${stealthed ? ', begins Stealthed' : ''}.`);
    }
    setShowAssetPicker(false);
  }

  function updateAsset(id: string, updates: Partial<FactionAsset>) {
    patch({ assets: local.assets.map(a => a.id === id ? { ...a, ...updates } : a) });
  }

  function removeAsset(id: string) {
    patch({ assets: local.assets.filter(a => a.id !== id) });
  }

  // Sell Asset action (p.215): gain half the FacCred cost, rounded down.
  function sellAsset(asset: FactionAsset) {
    const gain = Math.floor((asset.cost ?? 0) / 2);
    patch({ assets: local.assets.filter(a => a.id !== asset.id), facCreds: facCreds + gain });
    factionLog(sectorId, faction.id, `Sold ${asset.name} (+${gain} FC).`);
  }

  // Repair Asset action (p.215): for 1 FacCred, heal points equal to the faction's
  // score in the asset's ruling attribute (single repair shown; escalates if repeated).
  function repairAsset(asset: FactionAsset) {
    const rating = asset.type === 'Force' ? local.force : asset.type === 'Cunning' ? local.cunning : local.wealth;
    const heal = Math.min(rating, asset.maxHp - asset.hp);
    if (heal <= 0 || facCreds < 1) return;
    patch({
      assets: local.assets.map(a => a.id === asset.id ? { ...a, hp: a.hp + heal } : a),
      facCreds: facCreds - 1,
    });
    factionLog(sectorId, faction.id, `Repaired ${asset.name} +${heal} HP (−1 FC).`);
  }

  // Use Asset Ability action (p.215). FacCred abilities resolve inline; move/reveal
  // abilities open a small targeting modal.
  function useAbility(asset: FactionAsset) {
    const kind = getAbilityKind(asset);
    if (kind === 'faccred') {
      const res = runAssetAbility(asset);
      if (!res) return;
      const assets = res.selfDestroyed ? local.assets.filter(a => a.id !== asset.id) : local.assets;
      patch({ assets, facCreds: Math.max(0, facCreds + res.facCredDelta) });
      factionLog(sectorId, faction.id, res.log);
    } else if (kind === 'move' || kind === 'reveal') {
      setAbilityFor({ asset, kind });
    }
  }

  // Expand Influence (p.214): buy a Base of Influence with N HP at 1 FC/HP, up to faction max HP.
  function buyBaseOfInfluence() {
    const hp = Math.min(maxHp, Math.max(1, Number(prompt(`Base of Influence — how many HP? (1 FC each, max ${maxHp})`, '1')) || 0));
    if (hp <= 0) return;
    const boi: FactionAsset = {
      id: crypto.randomUUID(), name: 'Base of Influence', type: 'Cunning', rating: 1,
      hp, maxHp: hp, attack: '—', counter: '—', notes: '', cost: hp, tl: 0,
      category: 'Special', isBaseOfInfluence: true, notReady: true,
      locationSystemId: local.homeworldSystemId ?? null,
    };
    patch({ assets: [...local.assets, boi], facCreds: Math.max(0, facCreds - hp) });
    factionLog(sectorId, faction.id, `Expand Influence: bought a ${hp} HP Base of Influence (−${hp} FC).`);
  }

  function addGoal(goal: FactionGoal) {
    patch({ goals: [...local.goals, goal] });
    setShowGoalPicker(false);
  }

  function toggleGoal(id: string) {
    const goal = local.goals.find(g => g.id === id);
    if (!goal) return;
    const updated = { ...goal, completed: !goal.completed };
    const newGoals = local.goals.map(g => g.id === id ? updated : g);
    let newXp = local.xp;
    if (updated.completed && !goal.completed) newXp += goal.xpReward;
    if (!updated.completed && goal.completed) newXp = Math.max(0, newXp - goal.xpReward);
    patch({ goals: newGoals, xp: newXp });
  }

  function removeGoal(id: string) {
    patch({ goals: local.goals.filter(g => g.id !== id) });
  }

  const ForceIcon  = STAT_ICON.Force;
  const CunningIcon = STAT_ICON.Cunning;
  const WealthIcon = STAT_ICON.Wealth;

  return (
    <div className="min-h-screen text-gray-100 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col min-h-screen bg-gray-950">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0 flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Factions</span>
            </button>
            <span className="text-gray-700 hidden sm:inline">|</span>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600"
              style={{ backgroundColor: local.color }}
            />
            <span className="text-amber-300 font-bold truncate">
              {local.name || '(unnamed faction)'}
            </span>
            <span className="text-gray-500 text-sm flex-shrink-0 hidden sm:inline">{sectorName}</span>
          </div>

        </div>

        {/* ── Retired banner ───────────────────────────────────────────────── */}
        {retired && (
          <div className="bg-gray-700/60 border-b border-gray-600 px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
            <Skull size={13} className="text-amber-500 flex-shrink-0" />
            <span className="text-gray-300 font-medium uppercase tracking-wide text-xs">Retired</span>
            <span className="text-gray-500">— this faction has been retired.</span>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="px-3 py-4 sm:px-4 sm:py-6 space-y-4 overflow-y-auto flex-1">

          {/* Identity + Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Identity */}
            <SheetSection title="Identity">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Name</label>
                  <input
                    className="input text-sm"
                    value={local.name}
                    onChange={e => patch({ name: e.target.value })}
                    placeholder="Faction name"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={local.color}
                      onChange={e => patch({ color: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-gray-600"
                    />
                    <span className="text-sm text-gray-400 font-mono">{local.color}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {local.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-gray-700 text-gray-300 border border-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-gray-500 hover:text-gray-200 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      className="input text-sm"
                      placeholder="Add tag…"
                      value={newTagInput}
                      onChange={e => handleTagInputChange(e.target.value)}
                      onFocus={() => setTagSuggestions(availableTagSuggestions(newTagInput))}
                      onBlur={() => setTimeout(() => setTagSuggestions([]), 150)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') addTag(newTagInput);
                        if (e.key === 'Escape') setTagSuggestions([]);
                      }}
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                        {tagSuggestions.map(s => (
                          <button
                            key={s}
                            onClick={() => addTag(s)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SheetSection>

            {/* Stats */}
            <SheetSection title="Stats">
              <div className="space-y-5">
                <div className="flex items-start justify-around bg-gray-800/50 rounded-xl p-4">
                  <StatSpinner
                    label="Force"
                    value={local.force}
                    colorClass="text-sky-400"
                    onChange={v => patchStat('force', v)}
                  />
                  <StatSpinner
                    label="Cunning"
                    value={local.cunning}
                    colorClass="text-violet-400"
                    onChange={v => patchStat('cunning', v)}
                  />
                  <StatSpinner
                    label="Wealth"
                    value={local.wealth}
                    colorClass="text-emerald-400"
                    onChange={v => patchStat('wealth', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
                      HP <span className="text-gray-600 normal-case font-normal">(max: {maxHp})</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={maxHp}
                        value={local.hp}
                        onChange={e => patch({ hp: Math.max(0, Math.min(maxHp, Number(e.target.value))) })}
                        className="input text-sm w-20"
                      />
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${maxHp > 0 ? Math.round((local.hp / maxHp) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">XP</label>
                    <input
                      type="number"
                      min={0}
                      value={local.xp}
                      onChange={e => patch({ xp: Math.max(0, Number(e.target.value)) })}
                      className="input text-sm w-20"
                    />
                  </div>
                </div>

                {/* Stat overview chips */}
                <div className="flex gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-sky-400">
                    <ForceIcon size={13} />
                    <span className="text-xs font-bold">{local.force}</span>
                    <span className="text-xs text-gray-600">Force</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-violet-400">
                    <CunningIcon size={13} />
                    <span className="text-xs font-bold">{local.cunning}</span>
                    <span className="text-xs text-gray-600">Cunning</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <WealthIcon size={13} />
                    <span className="text-xs font-bold">{local.wealth}</span>
                    <span className="text-xs text-gray-600">Wealth</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-red-400">
                    <Heart size={12} />
                    <span className="text-xs text-gray-400">{local.hp}/{maxHp}</span>
                  </div>
                </div>
              </div>
            </SheetSection>
          </div>

          {/* ── Faction Turn & Economy ─────────────────────────────────────── */}
          <SheetSection
            title={`Faction Turn ${turn > 0 ? `· Turn ${turn}` : ''}`}
            action={
              <button
                onClick={() => { factionProcessTurnStart(sectorId, faction.id); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-emerald-50 text-xs font-semibold transition-colors"
                title="Collect income, pay maintenance, ready assets, advance the turn"
              >
                <Play size={11} /> Start Turn
              </button>
            }
          >
            <div className="space-y-4">
              {/* Treasury + income/maintenance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-amber-400 mb-1"><Coins size={13} /><span className="text-xs uppercase tracking-wider">FacCreds</span></div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => factionAdjustFacCreds(sectorId, faction.id, -1)} className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold">−</button>
                    <input
                      type="number" min={0} value={facCreds}
                      onChange={e => patch({ facCreds: Math.max(0, Number(e.target.value)) })}
                      className="w-12 bg-transparent text-center text-lg font-bold text-amber-300 focus:outline-none"
                    />
                    <button onClick={() => factionAdjustFacCreds(sectorId, faction.id, 1)} className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold">+</button>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <span className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Income / turn</span>
                  <span className="text-lg font-bold text-emerald-400">+{income}</span>
                  <span className="text-[10px] text-gray-600 block">⌈W/2⌉+⌊(F+C)/4⌋</span>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <span className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Upkeep / turn</span>
                  <span className={`text-lg font-bold ${maintenance > income ? 'text-red-400' : 'text-orange-300'}`}>−{maintenance}</span>
                  <span className="text-[10px] text-gray-600 block">incl. over-cap</span>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <span className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Net / turn</span>
                  <span className={`text-lg font-bold ${income - maintenance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{income - maintenance >= 0 ? '+' : ''}{income - maintenance}</span>
                </div>
              </div>

              {/* Asset caps by rating */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(['Force', 'Cunning', 'Wealth'] as FactionAssetType[]).map(t => {
                  const used = assetsOfType(local, t);
                  const cap = assetCap(local, t);
                  return (
                    <span key={t} className={`px-2 py-0.5 rounded-full border ${used > cap ? 'border-red-700 bg-red-900/20 text-red-300' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
                      {t}: {used}/{cap} assets{used > cap ? ` (+${used - cap} FC upkeep)` : ''}
                    </span>
                  );
                })}
              </div>

              {/* XP rating raises */}
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2"><ChevronsUp size={12} /> Raise rating (spend XP — {local.xp} available)</span>
                <div className="flex flex-wrap gap-2">
                  {(['force', 'cunning', 'wealth'] as const).map(stat => {
                    const cost = xpToRaise(local[stat]);
                    const can = cost !== null && local.xp >= cost;
                    return (
                      <button
                        key={stat}
                        disabled={!can}
                        onClick={() => factionRaiseStat(sectorId, faction.id, stat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${can ? 'border-amber-700 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40' : 'border-gray-800 bg-gray-800/30 text-gray-600 cursor-not-allowed'}`}
                      >
                        {stat[0].toUpperCase()}{stat.slice(1)} → {local[stat] + 1} {cost === null ? '(max)' : `(${cost} XP)`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Homeworld + actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Home size={12} /> Homeworld</label>
                  <select
                    className="input text-sm"
                    value={local.homeworldSystemId ?? ''}
                    onChange={e => patch({ homeworldSystemId: e.target.value || null })}
                  >
                    <option value="">— none —</option>
                    {sectorSystems.map(sys => <option key={sys.id} value={sys.id}>{sys.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setShowAttack(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-800/70 hover:bg-rose-700 text-rose-50 text-xs font-semibold transition-colors"
                  >
                    <Swords size={13} /> Attack
                  </button>
                  <button
                    onClick={buyBaseOfInfluence}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-800/70 hover:bg-violet-700 text-violet-50 text-xs font-semibold transition-colors"
                    title="Expand Influence — buy a Base of Influence (1 FC / HP)"
                  >
                    <Sparkles size={13} /> Expand Influence
                  </button>
                </div>
              </div>
            </div>
          </SheetSection>

          {/* Assets */}
          <SheetSection
            title={`Assets (${local.assets.length})`}
            action={
              <button
                onClick={() => setShowAssetPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-amber-300 text-xs font-medium transition-colors"
              >
                <Plus size={11} /> Add Asset
              </button>
            }
          >
            {local.assets.length === 0 ? (
              <p className="text-sm text-gray-600 italic py-2">No assets yet.</p>
            ) : (
              <div className="space-y-2">
                {local.assets.map(asset => (
                  <div
                    key={asset.id}
                    className={`rounded-lg border px-4 py-3 ${assetTypeColor(asset.type)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${assetTypeBadge(asset.type)}`}>
                          {asset.type[0]}{asset.rating}
                        </span>
                        <span className="font-semibold text-sm truncate">{asset.name}</span>
                        {asset.isBaseOfInfluence && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-900/50 text-violet-300 border border-violet-800/50 flex-shrink-0">BoI</span>}
                        {asset.notReady && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 border border-yellow-800/50 flex-shrink-0" title="Bought/refitted — can't act until next turn">not ready</span>}
                        {asset.stealthed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600 flex-shrink-0 flex items-center gap-0.5"><EyeOff size={9} /> stealth</span>}
                        {(asset.unpaidTurns ?? 0) >= 1 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-800/50 flex-shrink-0" title="Maintenance unpaid — unusable">unpaid</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Heart size={10} className="text-red-400" />
                          <input
                            type="number"
                            min={0}
                            max={asset.maxHp}
                            value={asset.hp}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateAsset(asset.id, { hp: Math.max(0, Math.min(asset.maxHp, Number(e.target.value))) })}
                            className="w-10 bg-transparent border-b border-gray-600 text-center text-xs focus:outline-none focus:border-amber-500"
                          />
                          <span>/{asset.maxHp}</span>
                        </div>
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span>Atk: <span className="text-gray-300 font-mono">{asset.attack}</span></span>
                      <span>Ctr: <span className="text-gray-300 font-mono">{asset.counter}</span></span>
                      {asset.category && <span className="text-gray-500 uppercase tracking-wide">{asset.category}</span>}
                      {asset.cost != null && <span className="text-amber-400">{asset.cost} FC</span>}
                      {asset.tl != null && <span className="text-gray-500">TL{asset.tl}</span>}
                      {asset.maintenance ? <span className="text-orange-400">{asset.maintenance} FC/turn</span> : null}
                      {asset.note && <span className="text-gray-600">[{asset.note}]</span>}
                    </div>
                    {asset.special && (
                      <p className="text-xs text-gray-500 mt-1 italic">{asset.special}</p>
                    )}
                    {/* Play-loop controls: location, stealth, abilities, sell */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin size={11} />
                        <select
                          className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-gray-300 focus:outline-none focus:border-amber-500"
                          value={asset.locationSystemId ?? ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateAsset(asset.id, { locationSystemId: e.target.value || null })}
                        >
                          <option value="">unplaced</option>
                          {sectorSystems.map(sys => <option key={sys.id} value={sys.id}>{sys.name}</option>)}
                        </select>
                      </label>
                      <button
                        onClick={() => updateAsset(asset.id, { stealthed: !asset.stealthed })}
                        className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${asset.stealthed ? 'border-gray-500 bg-gray-700 text-gray-200' : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:text-gray-300'}`}
                      >
                        {asset.stealthed ? <EyeOff size={10} /> : <Eye size={10} />} {asset.stealthed ? 'Stealthed' : 'Stealth'}
                      </button>
                      {hasAutomatableAbility(asset) && (asset.unpaidTurns ?? 0) < 1 && !asset.notReady && (
                        <button
                          onClick={() => useAbility(asset)}
                          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-emerald-800/60 bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                          title="Use Asset Ability"
                        >
                          <Zap size={10} /> Use Ability
                        </button>
                      )}
                      {asset.hp < asset.maxHp && (
                        <button
                          onClick={() => repairAsset(asset)}
                          disabled={facCreds < 1}
                          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-sky-800/60 bg-sky-900/20 text-sky-300 hover:bg-sky-900/40 disabled:opacity-40 transition-colors"
                          title={`Repair +${asset.type === 'Force' ? local.force : asset.type === 'Cunning' ? local.cunning : local.wealth} HP for 1 FC`}
                        >
                          <Heart size={10} /> Repair (−1)
                        </button>
                      )}
                      <button
                        onClick={() => sellAsset(asset)}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-gray-700 bg-gray-800/50 text-gray-500 hover:text-amber-300 transition-colors ml-auto"
                        title={`Sell for ${Math.floor((asset.cost ?? 0) / 2)} FC`}
                      >
                        <Coins size={10} /> Sell (+{Math.floor((asset.cost ?? 0) / 2)})
                      </button>
                    </div>
                    <input
                      className="mt-2 w-full bg-transparent border-b border-gray-700 text-xs text-gray-400 placeholder-gray-700 focus:outline-none focus:border-amber-500"
                      placeholder="Notes…"
                      value={asset.notes}
                      onChange={e => updateAsset(asset.id, { notes: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </SheetSection>

          {/* Goals */}
          <SheetSection
            title={`Goals (${local.goals.filter(g => g.completed).length}/${local.goals.length})`}
            action={
              <button
                onClick={() => setShowGoalPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-amber-300 text-xs font-medium transition-colors"
              >
                <Plus size={11} /> Add Goal
              </button>
            }
          >
            {local.goals.length === 0 ? (
              <p className="text-sm text-gray-600 italic py-2">No goals yet.</p>
            ) : (
              <div className="space-y-2">
                {local.goals.map(goal => (
                  <div
                    key={goal.id}
                    className={`rounded-lg border px-4 py-3 transition-colors ${
                      goal.completed
                        ? 'border-emerald-800/50 bg-emerald-900/10'
                        : 'border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                          goal.completed
                            ? 'bg-emerald-600 border-emerald-500'
                            : 'border-gray-600 hover:border-amber-500'
                        }`}
                      >
                        {goal.completed && <Check size={11} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                            {goal.name}
                          </span>
                          <span className="text-xs text-amber-500 font-medium">+{goal.xpReward} XP</span>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeGoal(goal.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetSection>

          {/* Timeline */}
          <SheetSection
            title={`Timeline (${(local.timeline ?? []).length})`}
            action={null}
          >
            <div className="space-y-3">
              {/* Add event form */}
              <div className="space-y-1.5">
                <input
                  className="input text-xs"
                  placeholder='Date or era — "Session 14", "3200 CY", "Before the Scream"'
                  value={tlDate}
                  onChange={e => setTlDate(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && tlTitle.trim()) addTlEvent(); }}
                />
                <div className="flex gap-1.5">
                  <input
                    className="input text-xs flex-1"
                    placeholder="What happened?"
                    value={tlTitle}
                    onChange={e => setTlTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTlEvent(); }}
                  />
                  <button
                    onClick={addTlEvent}
                    disabled={!tlTitle.trim()}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-amber-300 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
              {/* Event list */}
              {(local.timeline ?? []).length === 0 ? (
                <p className="text-sm text-gray-600 italic py-1">No events yet.</p>
              ) : (
                <div>
                  {(local.timeline ?? []).map((event, i) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center pt-[5px]">
                        <div className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
                        {i < (local.timeline ?? []).length - 1 && (
                          <div className="w-px bg-gray-700 flex-1 mt-1.5 min-h-[14px]" />
                        )}
                      </div>
                      <div className={`flex-1 ${i < (local.timeline ?? []).length - 1 ? 'pb-3' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {event.date && (
                              <span className="text-[10px] font-mono text-amber-600/90 block leading-tight">{event.date}</span>
                            )}
                            <p className="text-sm text-gray-300 leading-snug mt-0.5">{event.title}</p>
                          </div>
                          <button
                            onClick={() => removeTlEvent(event.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetSection>

          {/* Tag Effects */}
          {(() => {
            const tagged = FACTION_TAGS_FULL.filter(t => local.tags.includes(t.name));
            if (tagged.length === 0) return null;
            return (
              <SheetSection title={`Tag Effects (${tagged.length})`}>
                <div className="space-y-2">
                  {tagged.map(t => (
                    <div key={t.name} className="rounded-lg border border-gray-700 bg-gray-800/30 px-3 py-2">
                      <span className="text-sm font-semibold text-amber-300">{t.name}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{t.effect}</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-600 italic pt-1">
                    Bonus/penalty dice from Warlike, Machiavellian, Plutocratic, Theocratic, Exchange Consulate,
                    Deep Rooted, Fanatical and Eugenics Cult are applied automatically in the Attack resolver.
                  </p>
                </div>
              </SheetSection>
            );
          })()}

          {/* Turn Log */}
          {(local.turnLog ?? []).length > 0 && (
            <SheetSection
              title={`Turn Log (${(local.turnLog ?? []).length})`}
              action={
                <button
                  onClick={() => patch({ turnLog: [] })}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              }
            >
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {(local.turnLog ?? []).map(entry => (
                  <div key={entry.id} className="flex gap-2 text-xs">
                    <span className="text-amber-600/80 font-mono flex-shrink-0">T{entry.turn}</span>
                    <span className="text-gray-400">{entry.text}</span>
                  </div>
                ))}
              </div>
            </SheetSection>
          )}

          {/* Notes */}
          <SheetSection title="Notes">
            <textarea
              className="input text-sm resize-none h-32"
              placeholder="Faction background, current agenda, GM notes…"
              value={local.notes}
              onChange={e => patch({ notes: e.target.value })}
            />
          </SheetSection>

          {/* Summary footer */}
          <div className="flex items-center gap-4 text-xs text-gray-600 pb-2">
            <div className="flex items-center gap-1.5">
              <Swords size={11} />
              <span>{local.assets.length} assets</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target size={11} />
              <span>{local.goals.filter(g => g.completed).length}/{local.goals.length} goals completed</span>
            </div>
            {local.xp > 0 && (
              <span className="text-amber-600">{local.xp} XP</span>
            )}
          </div>
        </div>
      </div>

      {showAssetPicker && (
        <AssetPickerModal
          factionForce={local.force}
          factionCunning={local.cunning}
          factionWealth={local.wealth}
          factionTags={local.tags}
          facCreds={facCreds}
          onPick={addAsset}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {showAttack && (
        <AttackResolver
          sectorId={sectorId}
          attacker={liveFaction}
          rivals={rivals}
          onClose={() => setShowAttack(false)}
        />
      )}

      {abilityFor && (
        <AbilityModal
          sectorId={sectorId}
          faction={liveFaction}
          asset={abilityFor.asset}
          kind={abilityFor.kind}
          rivals={rivals}
          onClose={() => setAbilityFor(null)}
        />
      )}

      {showGoalPicker && (
        <GoalPickerModal
          onPick={addGoal}
          onClose={() => setShowGoalPicker(false)}
        />
      )}
    </div>
  );
}
