import { useState } from 'react';
import { X, Swords, Dices } from 'lucide-react';
import { useSectorStore } from '../../store/useSectorStore';
import {
  parseAttackLine, resolveAttack, tagAttackBonusDice, tagDefenseBonusDice,
  onHitFacCredSteal, scavengerGain,
} from '../../data/faction-turn';
import type { Faction } from '../../types/sector';

interface Props {
  sectorId: string;
  attacker: Faction;
  rivals: Faction[];
  onClose: () => void;
}

/** Faction Attack action resolver (p.214): 1d10+attr vs 1d10+attr, with tag bonus dice. */
export default function AttackResolver({ sectorId, attacker, rivals, onClose }: Props) {
  const { updateFaction, updateFactionAsset, factionLog, factionAdjustFacCreds } = useSectorStore();

  // Only ready, non-stealthed assets with an Attack line can initiate.
  const attackable = attacker.assets.filter(a => {
    const p = parseAttackLine(a.attack);
    return (p.atkAttr !== null) && !a.notReady && (a.unpaidTurns ?? 0) < 1;
  });

  const [attackerAssetId, setAttackerAssetId] = useState<string>(attackable[0]?.id ?? '');
  const [rivalId, setRivalId] = useState<string>(rivals[0]?.id ?? '');
  const rival = rivals.find(r => r.id === rivalId);

  // Defenders: a rival's non-stealthed assets (Base of Influence is always a valid target).
  const defenders = (rival?.assets ?? []).filter(a => !a.stealthed);
  const [defenderAssetId, setDefenderAssetId] = useState<string>('');
  const [bypassToBoI, setBypassToBoI] = useState(false);
  const [seize, setSeize] = useState(false);
  const [result, setResult] = useState<string[]>([]);

  const attackerAsset = attackable.find(a => a.id === attackerAssetId);
  const defenderAsset = defenders.find(a => a.id === defenderAssetId);
  const parsed = attackerAsset ? parseAttackLine(attackerAsset.attack) : null;
  const boi = rival?.assets.find(a => a.isBaseOfInfluence);

  function roll() {
    if (!attackerAsset || !rival || !defenderAsset || !parsed) return;
    const onHomeworld = defenderAsset.locationSystemId != null &&
      defenderAsset.locationSystemId === rival.homeworldSystemId;
    const atkBonusDice = tagAttackBonusDice(attacker, parsed.atkAttr, { defenderAssetTl: defenderAsset.tl, seize });
    const defBonusDice = tagDefenseBonusDice(rival, parsed.atkAttr, { onHomeworld, defenderAssetTl: defenderAsset.tl });

    const outcome = resolveAttack(attacker, attackerAsset, rival, defenderAsset, { atkBonusDice, defBonusDice });
    const lines = [outcome.log];
    let attackerDestroyedOne = false;   // attacker destroyed an enemy asset
    let attackerLostOne = false;        // attacker lost an asset to counterattack

    // On a successful hit, certain assets steal FacCreds from the defender (Franchise/Blockade Fleet).
    if (outcome.result !== 'miss') {
      const steal = Math.min(onHitFacCredSteal(attackerAsset), rival.facCreds ?? 0);
      if (steal > 0) {
        factionAdjustFacCreds(sectorId, rival.id, -steal);
        factionAdjustFacCreds(sectorId, attacker.id, steal);
        lines.push(`${attackerAsset.name} siphons ${steal} FacCred(s) from ${rival.name}.`);
      }
    }

    // Apply damage to defender (or bypass to Base of Influence + faction HP).
    if (outcome.damageToDefender > 0) {
      if (bypassToBoI && boi) {
        const newBoiHp = Math.max(0, boi.hp - outcome.damageToDefender);
        const newFactionHp = Math.max(0, rival.hp - outcome.damageToDefender);
        updateFactionAsset(sectorId, rival.id, boi.id, { hp: newBoiHp });
        updateFaction(sectorId, rival.id, { hp: newFactionHp });
        lines.push(`Damage bypassed to Base of Influence (${newBoiHp} HP) and faction (${newFactionHp} HP).`);
        if (newBoiHp === 0) { attackerDestroyedOne = true; }
      } else {
        const newHp = Math.max(0, defenderAsset.hp - outcome.damageToDefender);
        updateFactionAsset(sectorId, rival.id, defenderAsset.id, { hp: newHp });
        lines.push(newHp === 0 ? `${defenderAsset.name} destroyed!` : `${defenderAsset.name} at ${newHp}/${defenderAsset.maxHp} HP.`);
        if (newHp === 0) attackerDestroyedOne = true;
      }
    }
    // Counterattack to the attacking asset.
    if (outcome.damageToAttacker > 0) {
      const newHp = Math.max(0, attackerAsset.hp - outcome.damageToAttacker);
      updateFactionAsset(sectorId, attacker.id, attackerAsset.id, { hp: newHp });
      lines.push(newHp === 0 ? `${attackerAsset.name} destroyed by counterattack!` : `${attackerAsset.name} at ${newHp}/${attackerAsset.maxHp} HP.`);
      if (newHp === 0) attackerLostOne = true;
    }

    // Scavengers tag: +1 FacCred whenever you destroy an asset or lose one (p.225).
    const atkScav = scavengerGain(attacker) * ((attackerDestroyedOne ? 1 : 0) + (attackerLostOne ? 1 : 0));
    if (atkScav > 0) { factionAdjustFacCreds(sectorId, attacker.id, atkScav); lines.push(`Scavengers: ${attacker.name} +${atkScav} FacCred.`); }
    const rivScav = scavengerGain(rival) * ((attackerDestroyedOne ? 1 : 0) + (attackerLostOne ? 1 : 0));
    if (rivScav > 0) { factionAdjustFacCreds(sectorId, rival.id, rivScav); lines.push(`Scavengers: ${rival.name} +${rivScav} FacCred.`); }

    if (atkBonusDice || defBonusDice) {
      lines.push(`(tag dice — attacker +${atkBonusDice}d10, defender +${defBonusDice}d10)`);
    }

    factionLog(sectorId, attacker.id, `Attack: ${outcome.log}`);
    setResult(lines);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-gray-100 font-semibold text-lg flex items-center gap-2"><Swords size={18} className="text-rose-400" /> Attack Action</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {attackable.length === 0 ? (
            <p className="text-sm text-amber-400/80">No ready assets with an Attack line. Newly bought assets can't attack until next turn.</p>
          ) : rivals.length === 0 ? (
            <p className="text-sm text-amber-400/80">No rival factions in this sector to attack.</p>
          ) : (
            <>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Attacking asset</label>
                <select className="input text-sm" value={attackerAssetId} onChange={e => { setAttackerAssetId(e.target.value); setResult([]); }}>
                  {attackable.map(a => <option key={a.id} value={a.id}>{a.name} — {a.attack}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Target faction</label>
                <select className="input text-sm" value={rivalId} onChange={e => { setRivalId(e.target.value); setDefenderAssetId(''); setResult([]); }}>
                  {rivals.map(r => <option key={r.id} value={r.id}>{r.name || '(unnamed)'}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Defending asset</label>
                {defenders.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No targetable (non-stealthed) assets.</p>
                ) : (
                  <select className="input text-sm" value={defenderAssetId} onChange={e => { setDefenderAssetId(e.target.value); setResult([]); }}>
                    <option value="">— choose —</option>
                    {defenders.map(a => <option key={a.id} value={a.id}>{a.name} ({a.hp}/{a.maxHp} HP){a.counter !== '—' ? ` — counter ${a.counter}` : ''}</option>)}
                  </select>
                )}
              </div>

              {boi && defenderAsset && !defenderAsset.isBaseOfInfluence && (
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input type="checkbox" checked={bypassToBoI} onChange={e => setBypassToBoI(e.target.checked)} />
                  Defender bypasses damage to Base of Influence (also hits faction HP)
                </label>
              )}

              {attacker.tags.includes('Imperialists') && (
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input type="checkbox" checked={seize} onChange={e => setSeize(e.target.checked)} />
                  Part of a Seize Planet action (Imperialists: +1d10)
                </label>
              )}

              <button
                onClick={roll}
                disabled={!attackerAsset || !defenderAsset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                <Dices size={16} /> Roll Attack
              </button>

              {result.length > 0 && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 space-y-1">
                  {result.map((line, i) => (
                    <p key={i} className={`text-sm font-mono ${i === 0 ? 'text-gray-200' : 'text-gray-400'}`}>{line}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
