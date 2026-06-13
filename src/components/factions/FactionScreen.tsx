import { useState } from 'react';
import {
  Plus, X, ChevronDown, ChevronUp, Shield, Eye, DollarSign,
  Heart, Star, Target, Trash2, Check, BookOpen, Swords,
} from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import { REFERENCE_ASSETS, FACTION_TAGS, FACTION_GOALS } from '../../data/faction-assets';
import type { Faction, FactionAsset, FactionGoal, FactionAssetType } from '../../types/sector';

// ─── helpers ────────────────────────────────────────────────────────────────

function derivedMaxHp(force: number, cunning: number, wealth: number): number {
  return force + cunning + wealth + 3;
}

const STAT_ICON: Record<FactionAssetType, typeof Shield> = {
  Force:   Shield,
  Cunning: Eye,
  Wealth:  DollarSign,
};

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
  factionForce, factionCunning, factionWealth,
  onPick, onClose,
}: {
  factionForce: number;
  factionCunning: number;
  factionWealth: number;
  onPick: (asset: FactionAsset) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<FactionAssetType | 'all'>('all');

  const statLimit: Record<FactionAssetType, number> = {
    Force:   factionForce,
    Cunning: factionCunning,
    Wealth:  factionWealth,
  };

  const filtered = REFERENCE_ASSETS.filter(a =>
    filter === 'all' ? true : a.type === filter
  );

  function pick(ref: typeof REFERENCE_ASSETS[number]) {
    const asset: FactionAsset = {
      id: crypto.randomUUID(),
      name: ref.name,
      type: ref.type,
      rating: ref.rating,
      hp: ref.maxHp,
      maxHp: ref.maxHp,
      attack: ref.attack,
      counter: ref.counter,
      notes: '',
    };
    onPick(asset);
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
                    <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>
                      HP {ref.maxHp}
                    </span>
                    <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>
                      Atk {ref.attack}
                    </span>
                    <span className={unlocked ? 'text-gray-400' : 'text-gray-700'}>
                      Ctr {ref.counter}
                    </span>
                  </div>
                </div>
                <p className={`text-xs mt-1 ${unlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                  {ref.description}
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

// ─── faction edit modal ───────────────────────────────────────────────────────

function FactionModal({
  faction,
  sectorId,
  onClose,
}: {
  faction: Faction;
  sectorId: string;
  onClose: () => void;
}) {
  const { updateFaction, removeFaction } = useSectorStore();
  const [local, setLocal] = useState<Faction>({ ...faction });
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('identity');

  const maxHp = derivedMaxHp(local.force, local.cunning, local.wealth);

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

  function handleTagInputChange(val: string) {
    setNewTagInput(val);
    if (val.trim()) {
      setTagSuggestions(
        FACTION_TAGS.filter(t =>
          t.toLowerCase().includes(val.toLowerCase()) && !local.tags.includes(t)
        )
      );
    } else {
      setTagSuggestions([]);
    }
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

  function addAsset(asset: FactionAsset) {
    patch({ assets: [...local.assets, asset] });
    setShowAssetPicker(false);
  }

  function updateAsset(id: string, updates: Partial<FactionAsset>) {
    patch({ assets: local.assets.map(a => a.id === id ? { ...a, ...updates } : a) });
  }

  function removeAsset(id: string) {
    patch({ assets: local.assets.filter(a => a.id !== id) });
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

  function handleDelete() {
    removeFaction(sectorId, faction.id);
    onClose();
  }

  function toggleSection(s: string) {
    setExpandedSection(prev => prev === s ? null : s);
  }

  const sectionHeader = (label: string, key: string, badge?: string) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between py-3 text-left group"
    >
      <span className="text-sm font-semibold text-gray-300 group-hover:text-gray-100 transition-colors">{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{badge}</span>
        )}
        {expandedSection === key
          ? <ChevronUp size={14} className="text-gray-500" />
          : <ChevronDown size={14} className="text-gray-500" />
        }
      </div>
    </button>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-gray-600"
              style={{ backgroundColor: local.color }}
            />
            <h2 className="text-gray-100 font-bold text-lg flex-1 truncate">
              {local.name || '(unnamed faction)'}
            </h2>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Delete faction?</span>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 pb-6">

            {/* ── Identity ─────────────────────────────────────────────── */}
            <div className="border-b border-gray-800">
              {sectionHeader('Identity', 'identity')}
              {expandedSection === 'identity' && (
                <div className="pb-4 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
                      Name
                    </label>
                    <input
                      className="input text-sm"
                      value={local.name}
                      onChange={e => patch({ name: e.target.value })}
                      placeholder="Faction name"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-2">
                      Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={local.color}
                        onChange={e => patch({ color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-gray-600"
                      />
                      <span className="text-sm text-gray-400 font-mono">{local.color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-2">
                      Tags
                    </label>
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
                        onKeyDown={e => {
                          if (e.key === 'Enter') { addTag(newTagInput); }
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
              )}
            </div>

            {/* ── Stats ────────────────────────────────────────────────── */}
            <div className="border-b border-gray-800">
              {sectionHeader('Stats', 'stats')}
              {expandedSection === 'stats' && (
                <div className="pb-4 space-y-5">
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
                      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
                        HP{' '}
                        <span className="text-gray-600 normal-case">(max: {maxHp})</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxHp}
                          value={local.hp}
                          onChange={e => patch({ hp: Math.max(0, Math.min(maxHp, Number(e.target.value))) })}
                          className="input text-sm w-24"
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
                      <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-1">
                        XP
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={local.xp}
                        onChange={e => patch({ xp: Math.max(0, Number(e.target.value)) })}
                        className="input text-sm w-24"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Assets ───────────────────────────────────────────────── */}
            <div className="border-b border-gray-800">
              {sectionHeader('Assets', 'assets', String(local.assets.length))}
              {expandedSection === 'assets' && (
                <div className="pb-4 space-y-2">
                  {local.assets.length === 0 && (
                    <p className="text-sm text-gray-600 italic py-2">No assets. Add one below.</p>
                  )}
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
                      <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                        <span>Atk: <span className="text-gray-300 font-mono">{asset.attack}</span></span>
                        <span>Ctr: <span className="text-gray-300 font-mono">{asset.counter}</span></span>
                      </div>
                      <input
                        className="mt-2 w-full bg-transparent border-b border-gray-700 text-xs text-gray-400 placeholder-gray-700 focus:outline-none focus:border-amber-500"
                        placeholder="Notes…"
                        value={asset.notes}
                        onChange={e => updateAsset(asset.id, { notes: e.target.value })}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setShowAssetPicker(true)}
                    className="w-full border border-dashed border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:text-amber-400 hover:border-amber-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Add Asset
                  </button>
                </div>
              )}
            </div>

            {/* ── Goals ────────────────────────────────────────────────── */}
            <div className="border-b border-gray-800">
              {sectionHeader('Goals', 'goals', `${local.goals.filter(g => g.completed).length}/${local.goals.length}`)}
              {expandedSection === 'goals' && (
                <div className="pb-4 space-y-2">
                  {local.goals.length === 0 && (
                    <p className="text-sm text-gray-600 italic py-2">No goals. Add one below.</p>
                  )}
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
                  <button
                    onClick={() => setShowGoalPicker(true)}
                    className="w-full border border-dashed border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:text-amber-400 hover:border-amber-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Add Goal
                  </button>
                </div>
              )}
            </div>

            {/* ── Notes ────────────────────────────────────────────────── */}
            <div>
              {sectionHeader('Notes', 'notes')}
              {expandedSection === 'notes' && (
                <div className="pb-4">
                  <textarea
                    className="input text-sm resize-none h-32"
                    placeholder="Faction background, current agenda, GM notes…"
                    value={local.notes}
                    onChange={e => patch({ notes: e.target.value })}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showAssetPicker && (
        <AssetPickerModal
          factionForce={local.force}
          factionCunning={local.cunning}
          factionWealth={local.wealth}
          onPick={addAsset}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {showGoalPicker && (
        <GoalPickerModal
          onPick={addGoal}
          onClose={() => setShowGoalPicker(false)}
        />
      )}
    </>
  );
}

// ─── faction card ─────────────────────────────────────────────────────────────

function FactionCard({ faction, onClick }: { faction: Faction; onClick: () => void }) {
  const maxHp = derivedMaxHp(faction.force, faction.cunning, faction.wealth);
  const completedGoals = faction.goals.filter(g => g.completed).length;

  const ForceIcon = STAT_ICON.Force;
  const CunningIcon = STAT_ICON.Cunning;
  const WealthIcon = STAT_ICON.Wealth;

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl cursor-pointer transition-all duration-200 hover:border-amber-600/60 hover:bg-gray-800/50 hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5 p-5 flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-gray-600"
          style={{ backgroundColor: faction.color }}
        />
        <span className="font-bold text-gray-100 text-base leading-tight truncate flex-1">
          {faction.name || '(unnamed)'}
        </span>
        {faction.xp > 0 && (
          <span className="text-xs text-amber-400 font-medium">{faction.xp} XP</span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1 text-sky-400">
          <ForceIcon size={12} />
          <span className="text-xs font-bold">{faction.force}</span>
        </div>
        <div className="flex items-center gap-1 text-violet-400">
          <CunningIcon size={12} />
          <span className="text-xs font-bold">{faction.cunning}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <WealthIcon size={12} />
          <span className="text-xs font-bold">{faction.wealth}</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-red-400">
          <Heart size={11} />
          <span className="text-xs text-gray-400">{faction.hp}/{maxHp}</span>
        </div>
      </div>

      {/* HP bar */}
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-1 bg-red-500 rounded-full transition-all"
          style={{ width: `${maxHp > 0 ? Math.round((faction.hp / maxHp) * 100) : 0}%` }}
        />
      </div>

      {/* Tags */}
      {faction.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {faction.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-xs bg-gray-700/60 text-gray-400 border border-gray-600/50 px-1.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {faction.tags.length > 3 && (
            <span className="text-xs text-gray-600">+{faction.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto pt-1 border-t border-gray-700/50">
        <div className="flex items-center gap-1">
          <Swords size={11} />
          <span>{faction.assets.length} assets</span>
        </div>
        {faction.goals.length > 0 && (
          <div className="flex items-center gap-1">
            <Target size={11} />
            <span>{completedGoals}/{faction.goals.length} goals</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function FactionScreen() {
  const { sectors, addFaction } = useSectorStore();
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [editingFactionId, setEditingFactionId] = useState<string | null>(null);
  const [newFactionColor, setNewFactionColor] = useState('#e11d48');

  const effectiveSectorId = selectedSectorId ?? (sectors.length === 1 ? sectors[0].id : null);
  const sector = sectors.find(s => s.id === effectiveSectorId) ?? null;
  const editingFaction = sector?.factions.find(f => f.id === editingFactionId) ?? null;

  function handleNewFaction() {
    if (!effectiveSectorId) return;
    const faction = addFaction(effectiveSectorId, '', newFactionColor);
    setEditingFactionId(faction.id);
    // Cycle color for next faction
    const colors = ['#e11d48', '#2563eb', '#d97706', '#16a34a', '#7c3aed', '#db2777', '#0891b2'];
    const currentIdx = colors.indexOf(newFactionColor);
    setNewFactionColor(colors[(currentIdx + 1) % colors.length]);
  }

  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-6xl mb-4">
          <BookOpen className="inline-block text-gray-600" size={56} />
        </div>
        <h2 className="text-xl font-semibold text-gray-300 mb-2">No sectors yet</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Create a sector in the Sector tab first, then return here to manage its factions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sector selector */}
      {sectors.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 font-medium">Sector:</label>
          <select
            value={effectiveSectorId ?? ''}
            onChange={e => setSelectedSectorId(e.target.value || null)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">— select sector —</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {!effectiveSectorId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-gray-500">Select a sector above to manage its factions.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">
              {sector?.name ?? ''} Factions
              {sector && sector.factions.length > 0 && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({sector.factions.length})
                </span>
              )}
            </h2>
          </div>

          {sector && sector.factions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Star size={40} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No factions yet</h3>
              <p className="text-gray-600 mb-6 max-w-sm text-sm">
                Build the political landscape of {sector.name} by adding factions with Force, Cunning, and Wealth.
              </p>
              <button
                onClick={handleNewFaction}
                className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Create Faction
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sector?.factions.map(faction => (
                <FactionCard
                  key={faction.id}
                  faction={faction}
                  onClick={() => setEditingFactionId(faction.id)}
                />
              ))}
              <button
                onClick={handleNewFaction}
                className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-amber-700 hover:bg-amber-900/10 transition-colors text-gray-600 hover:text-amber-400"
              >
                <span className="text-3xl">+</span>
                <span className="text-sm font-medium">New Faction</span>
              </button>
            </div>
          )}
        </>
      )}

      {editingFaction && effectiveSectorId && (
        <FactionModal
          key={editingFaction.id}
          faction={editingFaction}
          sectorId={effectiveSectorId}
          onClose={() => setEditingFactionId(null)}
        />
      )}
    </div>
  );
}
