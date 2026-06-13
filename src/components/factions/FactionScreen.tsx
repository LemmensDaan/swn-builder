import { useState } from 'react';
import { Plus, Shield, Eye, DollarSign, Heart, Star, Target, BookOpen, Swords } from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import type { Faction, FactionAssetType } from '../../types/sector';

// ─── helpers ────────────────────────────────────────────────────────────────

function derivedMaxHp(force: number, cunning: number, wealth: number): number {
  return force + cunning + wealth + 3;
}

const STAT_ICON: Record<FactionAssetType, typeof Shield> = {
  Force:   Shield,
  Cunning: Eye,
  Wealth:  DollarSign,
};

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

// ─── sector faction group ──────────────────────────────────────────────────────

function SectorFactionGroup({
  sector,
  showHeader,
  onEdit,
  onAdd,
}: {
  sector: { id: string; name: string; factions: Faction[] };
  showHeader: boolean;
  onEdit: (factionId: string, sectorId: string) => void;
  onAdd: (sectorId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-300">
            {sector.name}
            {sector.factions.length > 0 && (
              <span className="ml-2 text-sm text-gray-500 font-normal">({sector.factions.length})</span>
            )}
          </h2>
          <button
            onClick={() => onAdd(sector.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-amber-400 text-xs font-medium transition-colors border border-gray-700 hover:border-amber-700"
          >
            <Plus size={12} />
            Add Faction
          </button>
        </div>
      )}

      {sector.factions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-800 rounded-xl">
          <Star size={28} className="text-gray-700 mb-2" />
          <p className="text-sm text-gray-600 mb-3">No factions in {sector.name}</p>
          {!showHeader && (
            <button
              onClick={() => onAdd(sector.id)}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              Create Faction
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sector.factions.map(faction => (
            <FactionCard
              key={faction.id}
              faction={faction}
              onClick={() => onEdit(faction.id, sector.id)}
            />
          ))}
          {!showHeader && (
            <button
              onClick={() => onAdd(sector.id)}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-amber-700 hover:bg-amber-900/10 transition-colors text-gray-600 hover:text-amber-400"
            >
              <span className="text-3xl">+</span>
              <span className="text-sm font-medium">New Faction</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────

export default function FactionScreen({ onOpen }: { onOpen: (factionId: string, sectorId: string) => void }) {
  const { sectors, addFaction } = useSectorStore();
  const [filterSectorId, setFilterSectorId] = useState<string | null>(null);
  const [newFactionColor, setNewFactionColor] = useState('#e11d48');

  const displayedSectors = filterSectorId
    ? sectors.filter(s => s.id === filterSectorId)
    : sectors;

  function handleAdd(sectorId: string) {
    const faction = addFaction(sectorId, '', newFactionColor);
    const colors = ['#e11d48', '#2563eb', '#d97706', '#16a34a', '#7c3aed', '#db2777', '#0891b2'];
    const currentIdx = colors.indexOf(newFactionColor);
    setNewFactionColor(colors[(currentIdx + 1) % colors.length]);
    onOpen(faction.id, sectorId);
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

  const multiSector = sectors.length > 1;

  return (
    <div className="space-y-6">
      {multiSector && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 font-medium">Sector:</label>
          <select
            value={filterSectorId ?? ''}
            onChange={e => setFilterSectorId(e.target.value || null)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">All sectors</option>
            {sectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-8">
        {displayedSectors.map(sector => (
          <SectorFactionGroup
            key={sector.id}
            sector={sector}
            showHeader={multiSector}
            onEdit={onOpen}
            onAdd={handleAdd}
          />
        ))}
      </div>
    </div>
  );
}
