import { useState } from 'react';
import { X, Zap, MapPin, EyeOff } from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import { moveAbilityCost, type AbilityKind } from '../../data/faction-turn';
import type { Faction, FactionAsset } from '../../types/sector';

interface Props {
  sectorId: string;
  faction: Faction;
  asset: FactionAsset;
  kind: AbilityKind;          // 'move' | 'reveal'
  rivals: Faction[];
  onClose: () => void;
}

/** Use Asset Ability (p.215) for abilities that need a target: transport & reveal. */
export default function AbilityModal({ sectorId, faction, asset, kind, rivals, onClose }: Props) {
  const { systems, updateFactionAsset, updateFaction, factionAdjustFacCreds, factionLog } = useSectorStore();
  const sectorSystems = Object.values(systems).filter(s => s.sectorId === sectorId);
  const systemName = (id: string | null | undefined) =>
    id ? (sectorSystems.find(s => s.id === id)?.name ?? '(unknown)') : 'unplaced';

  // ── Move ────────────────────────────────────────────────────────────────────
  const [moveAssetId, setMoveAssetId] = useState(asset.id);
  const [destId, setDestId] = useState(sectorSystems[0]?.id ?? '');
  const [cost, setCost] = useState(moveAbilityCost(asset));

  function doMove() {
    const moved = faction.assets.find(a => a.id === moveAssetId);
    if (!moved || !destId) return;
    updateFactionAsset(sectorId, faction.id, moved.id, { locationSystemId: destId });
    factionAdjustFacCreds(sectorId, faction.id, -cost);
    factionLog(sectorId, faction.id, `${asset.name} moved ${moved.name} to ${systemName(destId)} (−${cost} FC).`);
    onClose();
  }

  // ── Reveal ────────────────────────────────────────────────────────────────────
  const [rivalId, setRivalId] = useState(rivals[0]?.id ?? '');
  const [sameWorldOnly, setSameWorldOnly] = useState(asset.locationSystemId != null);
  const rival = rivals.find(r => r.id === rivalId);

  function doReveal() {
    if (!rival) return;
    const targets = rival.assets.filter(a =>
      a.stealthed && (!sameWorldOnly || a.locationSystemId === asset.locationSystemId));
    if (targets.length === 0) {
      factionLog(sectorId, faction.id, `${asset.name}: no stealthed ${rival.name} assets to reveal.`);
      onClose();
      return;
    }
    updateFaction(sectorId, rival.id, {
      assets: rival.assets.map(a => targets.some(t => t.id === a.id) ? { ...a, stealthed: false } : a),
    });
    factionLog(sectorId, faction.id, `${asset.name} revealed ${targets.length} stealthed ${rival.name} asset(s).`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-lg flex items-center gap-2">
            <Zap size={17} className="text-emerald-400" /> {asset.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 italic">{asset.special}</p>

          {kind === 'move' ? (
            <>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1"><Zap size={12} /> Asset to move</label>
                <select className="input text-sm" value={moveAssetId} onChange={e => setMoveAssetId(e.target.value)}>
                  {faction.assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {systemName(a.locationSystemId)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1"><MapPin size={12} /> Destination world</label>
                <select className="input text-sm" value={destId} onChange={e => setDestId(e.target.value)}>
                  {sectorSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider">FC cost</label>
                <input type="number" min={0} value={cost} onChange={e => setCost(Math.max(0, Number(e.target.value)))} className="input text-sm w-20" />
              </div>
              <button onClick={doMove} disabled={!destId} className="w-full px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                Move asset
              </button>
            </>
          ) : (
            <>
              {rivals.length === 0 ? (
                <p className="text-sm text-amber-400/80">No rival factions to reveal.</p>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1"><EyeOff size={12} /> Reveal stealthed assets of</label>
                    <select className="input text-sm" value={rivalId} onChange={e => setRivalId(e.target.value)}>
                      {rivals.map(r => <option key={r.id} value={r.id}>{r.name || '(unnamed)'}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input type="checkbox" checked={sameWorldOnly} onChange={e => setSameWorldOnly(e.target.checked)} />
                    Only on this asset's world ({systemName(asset.locationSystemId)})
                  </label>
                  <button onClick={doReveal} className="w-full px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                    Reveal
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
