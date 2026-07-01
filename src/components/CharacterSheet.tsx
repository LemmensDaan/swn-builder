import { useState, useRef, useEffect, useCallback } from 'react';
import { Banknote, BookOpen, HelpCircle, LockKeyhole, Orbit, Package, FileText } from 'lucide-react';
import type { Character, CyberwareEntry } from '../types/character';
import { attrMod } from '../types/character';
import type { Ship as ShipType } from '../types/ship';
import { HULL_TYPES } from '../data/ships';
import { ARMOR_TABLE, RANGED_WEAPONS, HEAVY_WEAPONS, MELEE_WEAPONS, GENERAL_EQUIPMENT } from '../data/equipment';
import { SKILLS } from '../data/skills';
import { FOCI } from '../data/foci';
import { CYBERWARE } from '../data/cyberware';
import { xpForLevel } from '../data/leveling';
import { effectiveSkills, psychicSkillLevels, deriveAC, deriveEffort, computeEncumbrance } from '../data/derivation';
import LevelUp from './LevelUp';
import AuditOverview from './wizard/AuditOverview';
import Step8Equipment from './wizard/steps/Step8Equipment';
import { useLockBodyScroll } from './HelpPage';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function gearCost(name: string): number {
  return (
    ARMOR_TABLE.find(a => a.name === name)?.cost ??
    RANGED_WEAPONS.find(w => w.name === name)?.cost ??
    HEAVY_WEAPONS.find(w => w.name === name)?.cost ??
    MELEE_WEAPONS.find(w => w.name === name)?.cost ??
    GENERAL_EQUIPMENT.find(g => g.name === name)?.cost ??
    0
  );
}

function computeGearSpent(char: Character): number {
  let total = 0;
  for (const a of char.armor) total += gearCost(a.name);
  for (const w of char.weapons) total += gearCost(w.name);
  for (const e of char.equipment) total += gearCost(e);
  return total;
}

interface Props {
  char: Character;
  ships: ShipType[];
  onEdit: () => void;
  onBack: () => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
  onUpdate: (char: Character) => void;
  onNavigateToShip?: (id: string) => void;
}

const ATTR_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

// Encumbrance status colours + the movement penalty ladder (p.65).
const ENC_STATUS: Record<string, { text: string; cls: string }> = {
  none: { text: 'Unencumbered', cls: 'text-green-400' },
  light: { text: 'Lightly Encumbered', cls: 'text-amber-400' },
  heavy: { text: 'Heavily Encumbered', cls: 'text-orange-400' },
  overloaded: { text: 'Overloaded', cls: 'text-red-400' },
};
const ENC_LEVELS: { level: string; text: string; penalty: string; cls: string }[] = [
  { level: 'none', text: 'Unencumbered', penalty: 'Move 10m', cls: 'text-green-400' },
  { level: 'light', text: 'Lightly Encumbered', penalty: 'Move 7m', cls: 'text-amber-400' },
  { level: 'heavy', text: 'Heavily Encumbered', penalty: 'Move 5m', cls: 'text-orange-400' },
  { level: 'overloaded', text: 'Overloaded', penalty: 'Cannot move', cls: 'text-red-400' },
];

export default function CharacterSheet({ char, ships, onEdit, onBack, onOpenRules, onOpenHelp, onUpdate, onNavigateToShip }: Props) {
  const attrs = char.attributes;
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const totalAC = deriveAC(char).ac;
  const effortMax = deriveEffort(char);
  const skills = effectiveSkills(char);
  const psychic = psychicSkillLevels(char);
  const enc = computeEncumbrance(char);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [showGear, setShowGear] = useState(false);
  const [showCyberware, setShowCyberware] = useState(false);
  const [earnings, setEarnings] = useState('');
  const [showPdf, setShowPdf] = useState(false);
  const [showShipPicker, setShowShipPicker] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Cyberware: permanent System Strain reduction from installed implants (p.82–85)
  const installedCyberware = (char.cyberware ?? []).filter(c => c.installed);
  const cyberwareStrainCost = installedCyberware.reduce((sum, c) => {
    const def = CYBERWARE.find(cw => cw.name === c.name);
    return sum + (def?.strain ?? 0);
  }, 0);
  // Effective max strain = base max - permanent cyberware strain reduction
  const effectiveMaxStrain = Math.max(0, char.systemStrain.max - cyberwareStrainCost);

  const nextLevelXp = xpForLevel(char.level + 1);
  const canLevelUp = char.xp >= nextLevelXp && char.level < 20;

  // ── Stow / equip / not-carried toggles ──────────────────────────────────────
  const equipReadied = new Set(char.equipmentReadied ?? []);
  const equipNotCarried = new Set(char.equipmentNotCarried ?? []);

  function toggleArmorReadied(i: number) {
    onUpdate({ ...char, armor: char.armor.map((a, idx) => idx === i ? { ...a, readied: a.readied === false } : a) });
  }
  function toggleArmorNotCarried(i: number) {
    onUpdate({ ...char, armor: char.armor.map((a, idx) => idx === i ? { ...a, notCarried: !a.notCarried } : a) });
  }
  function toggleWeaponReadied(i: number) {
    onUpdate({ ...char, weapons: char.weapons.map((w, idx) => idx === i ? { ...w, readied: w.readied === false } : w) });
  }
  function toggleWeaponNotCarried(i: number) {
    onUpdate({ ...char, weapons: char.weapons.map((w, idx) => idx === i ? { ...w, notCarried: !w.notCarried } : w) });
  }
  function toggleEquipReadied(name: string) {
    const next = equipReadied.has(name)
      ? (char.equipmentReadied ?? []).filter(n => n !== name)
      : [...(char.equipmentReadied ?? []), name];
    onUpdate({ ...char, equipmentReadied: next });
  }
  function toggleEquipNotCarried(name: string) {
    if (equipNotCarried.has(name)) {
      onUpdate({ ...char, equipmentNotCarried: (char.equipmentNotCarried ?? []).filter(n => n !== name) });
    } else {
      // Leaving behind also clears readied state
      onUpdate({
        ...char,
        equipmentNotCarried: [...(char.equipmentNotCarried ?? []), name],
        equipmentReadied: (char.equipmentReadied ?? []).filter(n => n !== name),
      });
    }
  }
  function addCredits(n: number) {
    onUpdate({ ...char, credits: Math.max(0, char.credits + n) });
  }

  function handlePdfUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      alert('PDF too large — max 2 MB. Try a compressed copy.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const data = e.target?.result as string;
      onUpdate({ ...char, pdfAttachment: { name: file.name, data } });
    };
    reader.readAsDataURL(file);
  }

  function removePdf() {
    onUpdate({ ...char, pdfAttachment: undefined });
    setShowPdf(false);
  }

  const assignedShipIds = char.assignedShipIds ?? [];
  const assignedShips = ships.filter(s => assignedShipIds.includes(s.id));

  function toggleShipAssignment(shipId: string) {
    const ids = char.assignedShipIds ?? [];
    const next = ids.includes(shipId) ? ids.filter(id => id !== shipId) : [...ids, shipId];
    onUpdate({ ...char, assignedShipIds: next });
  }

  return (
    <div className="min-h-screen text-gray-100 flex justify-center">
      <div className="w-full max-w-6xl flex flex-col min-h-screen bg-gray-950 overflow-x-hidden">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm flex-shrink-0">
            <span className="hidden sm:inline">← Characters</span>
            <span className="sm:hidden">←</span>
          </button>
          <span className="text-gray-700 hidden sm:inline">|</span>
          <span className="text-amber-300 font-bold truncate">{char.name}</span>
          <span className="text-gray-500 text-xs sm:text-sm flex-shrink-0 hidden sm:inline">{char.class} · Level {char.level}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={onOpenHelp}
            title="Rules reference & FAQ"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={onOpenRules}
            title="Open SWN Revised Deluxe Edition rulebook"
            className="p-1 sm:p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors"
          >
            <BookOpen size={16} />
          </button>
          {/* Simple / Detailed view toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            <button
              onClick={() => setDetailed(false)}
              className={`px-2 py-1.5 sm:px-2.5 font-medium transition-colors ${!detailed ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              Simple
            </button>
            <button
              onClick={() => setDetailed(true)}
              className={`px-2 py-1.5 sm:px-2.5 font-medium transition-colors ${detailed ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >
              Detail
            </button>
          </div>
          {canLevelUp && (
            <button
              onClick={() => setShowLevelUp(true)}
              className="px-2 py-1.5 sm:px-3 rounded bg-green-700 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold animate-pulse"
            >
              ↑ <span className="hidden sm:inline">Level </span>Up
            </button>
          )}
          <button
            onClick={() => setConfirmEdit(true)}
            title="Edit core character details (locked — may change derived stats)"
            className="px-2 py-1.5 sm:px-3 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs sm:text-sm font-medium flex items-center gap-1"
          >
            <LockKeyhole size={13} /> Edit
          </button>
        </div>
      </div>

      {char.retired && (
        <div className="bg-gray-700/60 border-b border-gray-600 px-4 py-2 flex items-center gap-2 text-sm text-gray-400">
          <span className="text-gray-300 font-medium uppercase tracking-wide text-xs">Retired</span>
          <span className="text-gray-500">— this character has been retired from active play.</span>
        </div>
      )}

      {detailed ? (
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 max-w-5xl mx-auto w-full">
          <AuditOverview char={char} />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto max-w-6xl mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6 w-full">
        {/* Header row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBlock label="Background" value={char.background || '—'} />
          <InfoBlock label="Homeworld" value={char.homeworld || '—'} />
          <InfoBlock label="Species" value={char.species || '—'} />
          <div className="glass rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">XP</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onUpdate({ ...char, xp: Math.max(0, char.xp - 1) })} disabled={char.xp <= 0}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-sm flex items-center justify-center">−</button>
              <span className="font-bold tabular-nums text-sm text-gray-200 w-10 text-center">{char.xp}</span>
              <button onClick={() => onUpdate({ ...char, xp: char.xp + 1 })}
                className="w-6 h-6 rounded bg-gray-700 hover:bg-green-900/50 text-gray-300 text-sm flex items-center justify-center">+</button>
              <span className="text-gray-600 text-xs ml-1">/ {nextLevelXp}</span>
            </div>
            {canLevelUp && (
              <p className="text-xs text-amber-400 mt-1 font-medium">Ready to level up!</p>
            )}
          </div>
        </div>

        {char.goal && (
          <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400 italic border-l-4 border-amber-700">
            <span className="text-gray-300 not-italic font-medium">Goal: </span>{char.goal}
          </div>
        )}

        {/* Shared content for attrs and skills */}
        {(() => {
          const attrCells = ATTR_ORDER.map(a => {
            const score = attrs[a];
            const mod = attrMod(score);
            return (
              <div key={a} className="glass rounded-lg p-0.5 sm:p-2 text-center">
                <div className="text-[7px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{a}</div>
                <div className="text-sm sm:text-xl font-bold">{score}</div>
                <div className={`text-[7px] sm:text-xs font-bold mt-0.5 ${mod > 0 ? 'text-green-400' : mod < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {mod >= 0 ? '+' : ''}{mod}
                </div>
              </div>
            );
          });
          const skillsList = (
            <div className="space-y-0.5">
              {([...SKILLS] as string[]).sort().map(skillName => {
                const level: number = (skills as Record<string, number>)[skillName] ?? -1;
                const owned = level >= 0;
                return (
                  <div key={skillName} className="flex items-center gap-1 min-w-0">
                    <span className={`text-xs truncate ${owned ? 'text-gray-300' : 'text-gray-700'}`}>
                      {skillName}{owned ? `-${level}` : ''}
                    </span>
                    <span className="inline-flex gap-0.5 flex-shrink-0 ml-auto">
                      {Array.from({ length: 4 }, (_, i) => (
                        <span key={i} className={`w-2 h-2 rounded-sm border ${
                          i < Math.min(4, Math.max(0, level + 1))
                            ? 'bg-amber-400 border-amber-500'
                            : owned ? 'border-gray-600 bg-transparent' : 'border-gray-800 bg-transparent'
                        }`} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          );
          return (
            <>
              {/* Mobile: Skills (left) + Attributes (right) */}
              <div className="lg:hidden grid grid-cols-2 gap-2 items-start overflow-hidden">
                <SheetSection title="Skills" fill>
                  <div className="text-xs space-y-0">
                    {skillsList}
                  </div>
                </SheetSection>
                <SheetSection title="Attributes">
                  <div className="grid grid-cols-1 gap-1 mb-4">{attrCells}</div>
                </SheetSection>
              </div>

              {/* Desktop: Attributes full width */}
              <div className="hidden lg:block">
                <SheetSection title="Attributes">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">{attrCells}</div>
                </SheetSection>
              </div>
            </>
          );
        })()}

        {/* Skills (left) + Combat / Psychic / Foci (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">

          {/* ── Left: all skills — desktop only (mobile shows in 2-col block above) ── */}
          <div className="hidden lg:block">
            <SheetSection title="Skills" fill>
              <div className="space-y-0.5">
                {([...SKILLS] as string[]).sort().map(skillName => {
                  const level: number = (skills as Record<string, number>)[skillName] ?? -1;
                  const owned = level >= 0;
                  return (
                    <div key={skillName} className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${owned ? 'text-gray-300' : 'text-gray-700'}`}>
                        {skillName}{owned ? `-${level}` : ''}
                      </span>
                      <span className="inline-flex gap-0.5 flex-shrink-0">
                        {Array.from({ length: 4 }, (_, i) => (
                          <span key={i} className={`w-2 h-2 rounded-sm border ${
                            i < Math.min(4, Math.max(0, level + 1))
                              ? 'bg-amber-400 border-amber-500'
                              : owned ? 'border-gray-600 bg-transparent' : 'border-gray-800 bg-transparent'
                          }`} />
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SheetSection>
          </div>

          {/* ── Right: Combat + Psychic (top row) then Foci (bottom) ── */}
          <div className="flex flex-col gap-6">
            {/* Top row: Combat always left; Psychic alongside if applicable */}
            <div className={`grid gap-6 ${isPsychic && Object.keys(psychic).length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <SheetSection title="Combat" action={
                <button
                  onClick={() => onUpdate({
                    ...char,
                    effort: { ...char.effort, committed: 0 },
                    systemStrain: { ...char.systemStrain, current: Math.max(0, char.systemStrain.current - 1) },
                    weapons: char.weapons.map(w => w.ammo ? { ...w, ammo: { ...w.ammo, current: w.ammo.max, readied: 0, stowed: w.ammo.max * 3 } } : w),
                  })}
                  title="Night's Rest — refresh Effort, recover 1 System Strain, reload weapons, resupply ammo"
                  className="px-2.5 py-1 rounded bg-indigo-700/50 hover:bg-indigo-700 text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Orbit size={16} className="text-yellow-400" /> Night's Rest
                </button>
              }>
                {/* Row 1: HP | AC | Move */}
                <div className="grid grid-cols-3 gap-2">
                  {/* HP — interactive */}
                  <div className="glass rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">HP</div>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onUpdate({ ...char, hitPoints: { ...char.hitPoints, current: Math.max(0, char.hitPoints.current - 1) } })} disabled={char.hitPoints.current <= 0}
                        className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center" title="Damage">−</button>
                      <span className={`font-bold tabular-nums text-sm w-14 text-center ${char.hitPoints.current === 0 ? 'text-red-400' : 'text-gray-100'}`}>
                        {char.hitPoints.current}/{char.hitPoints.max}
                      </span>
                      <button onClick={() => onUpdate({ ...char, hitPoints: { ...char.hitPoints, current: Math.min(char.hitPoints.max, char.hitPoints.current + 1) } })} disabled={char.hitPoints.current >= char.hitPoints.max}
                        className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center" title="Heal">+</button>
                    </div>
                  </div>
                  {/* AC — static */}
                  <div className="glass rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">AC</div>
                    <div className="text-xl font-bold text-gray-100">{totalAC}</div>
                  </div>
                  {/* Move — static + encumbrance tooltip */}
                  <div className="relative group glass rounded-lg p-2 text-center cursor-default select-none">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Move</div>
                    <div className={`text-xl font-bold ${enc.level === 'none' ? 'text-gray-100' : ENC_STATUS[enc.level].cls}`}>{enc.move}m</div>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 border border-gray-700 rounded shadow-xl p-2 w-52 space-y-1 pointer-events-none">
                      {ENC_LEVELS.map(l => (
                        <div key={l.level} className={`flex items-center justify-between text-xs rounded px-2 py-0.5 ${enc.level === l.level ? 'bg-gray-700/80 ' + l.cls : 'text-gray-600'}`}>
                          <span>{l.text}</span><span className="font-mono">{l.penalty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: ATK | System Strain | Effort (psychic) */}
                <div className={`grid gap-2 mt-2 ${isPsychic ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* ATK — static */}
                  <div className="glass rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">ATK</div>
                    <div className="text-xl font-bold text-gray-100">+{char.baseAttackBonus}</div>
                  </div>
                  {/* System Strain — interactive, danger when full.
                      Cyberware permanently reduces max strain (p.82). */}
                  <div className="glass rounded-lg p-2 text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                      Strain{cyberwareStrainCost > 0 && <span className="text-violet-400 ml-1">({cyberwareStrainCost} cyber)</span>}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onUpdate({ ...char, systemStrain: { ...char.systemStrain, current: Math.max(0, char.systemStrain.current - 1) } })} disabled={char.systemStrain.current <= 0}
                        className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">−</button>
                      <span className={`font-bold tabular-nums text-sm w-12 text-center ${char.systemStrain.current >= effectiveMaxStrain ? 'text-red-400' : 'text-gray-100'}`}>
                        {char.systemStrain.current}/{effectiveMaxStrain}
                      </span>
                      <button onClick={() => onUpdate({ ...char, systemStrain: { ...char.systemStrain, current: Math.min(effectiveMaxStrain, char.systemStrain.current + 1) } })} disabled={char.systemStrain.current >= effectiveMaxStrain}
                        className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center">+</button>
                    </div>
                  </div>
                  {/* Effort — interactive, danger when fully committed */}
                  {isPsychic && (
                    <div className="glass rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Effort</div>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => onUpdate({ ...char, effort: { ...char.effort, committed: Math.max(0, char.effort.committed - 1) } })} disabled={char.effort.committed <= 0}
                          className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center" title="Release">−</button>
                        <span className={`font-bold tabular-nums text-sm w-12 text-center ${char.effort.committed >= effortMax ? 'text-red-400' : 'text-gray-100'}`}>
                          {char.effort.committed}/{effortMax}
                        </span>
                        <button onClick={() => onUpdate({ ...char, effort: { ...char.effort, committed: Math.min(effortMax, char.effort.committed + 1) } })} disabled={char.effort.committed >= effortMax}
                          className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 disabled:opacity-20 text-gray-300 text-xs flex items-center justify-center" title="Commit">+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Saving throws */}
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="grid grid-cols-3 gap-2">
                    {(['Physical', 'Evasion', 'Mental'] as const).map(s => (
                      <div key={s} className="glass rounded-lg p-2 text-center">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">{s}</div>
                        <div className="text-sm font-bold text-gray-100">{char.saves[s.toLowerCase() as keyof typeof char.saves]}+</div>
                      </div>
                    ))}
                  </div>
                </div>
              </SheetSection>

              {/* Psychic disciplines + techniques alongside Combat */}
              {isPsychic && Object.keys(psychic).length > 0 && (
                <SheetSection title="Psychic">
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5 mb-3">
                    {Object.entries(psychic).map(([d, lvl]) => (
                      <div key={d} className="bg-indigo-900/30 border border-indigo-800/40 rounded-lg p-2 text-center">
                        <div className="text-[10px] text-indigo-300 leading-tight mb-1">{d}</div>
                        <div className="flex justify-center gap-0.5 mb-1">
                          {Array.from({ length: 4 }, (_, i) => (
                            <span key={i} className={`w-2 h-2 rounded-sm border ${
                              i < Math.min(4, Math.max(0, lvl + 1))
                                ? 'bg-indigo-400 border-indigo-500'
                                : 'border-indigo-900 bg-transparent'
                            }`} />
                          ))}
                        </div>
                        <div className="text-xs font-bold text-indigo-400">{lvl}</div>
                      </div>
                    ))}
                  </div>
                  {Object.keys(psychic).some(d => char.psychicTechniques.some(t => t.discipline === d && t.techniqueName)) && (
                    <div className="space-y-1.5 border-t border-gray-700 pt-2">
                      {Object.keys(psychic).map(d => {
                        const techs = char.psychicTechniques.filter(t => t.discipline === d && t.techniqueName);
                        if (techs.length === 0) return null;
                        return (
                          <div key={d}>
                            <p className="text-xs text-indigo-400 font-medium mb-0.5">{d}</p>
                            {techs.map(t => (
                              <div key={t.techniqueName} className="text-xs text-gray-400 pl-2">• {t.techniqueName}</div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SheetSection>
              )}
            </div>

            {/* Bottom: Foci */}
            <SheetSection title="Foci">
              {char.foci.length === 0 ? (
                <p className="text-gray-600 text-sm italic">No foci chosen.</p>
              ) : (
                <div className="space-y-2">
                  {char.foci.map(f => {
                    const def = FOCI.find(x => x.name === f.name);
                    const levelDesc = def?.levels[f.level - 1]?.description;
                    return (
                      <div key={f.name} className="bg-gray-900/60 rounded px-3 py-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-sm text-gray-200">{f.name}</span>
                          <span className="text-xs text-amber-400 flex-shrink-0 ml-2">Lvl {f.level}</span>
                        </div>
                        {f.name === 'Wild Psychic Talent' ? (
                          <>
                            {f.specialistSkill && <div className="text-xs text-gray-500 mb-0.5">Discipline: {f.specialistSkill}</div>}
                            {char.psychicTechniques.filter(t => !!t.techniqueName).map((t, ti) => (
                              <div key={ti} className="text-xs text-indigo-300 leading-snug">
                                ↳ {t.techniqueName}{t.discipline !== f.specialistSkill ? ` (${t.discipline})` : ''}
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            {f.specialistSkill && <div className="text-xs text-gray-500 mb-0.5">Skill: {f.specialistSkill}</div>}
                            {levelDesc && <p className="text-xs text-gray-400 leading-snug">{levelDesc}</p>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SheetSection>
          </div>
        </div>

        {/* Weapons */}
        {char.weapons.length > 0 && (
          <SheetSection title="Weapons">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Weapon</th>
                    <th className="text-right py-2 pr-4">Damage</th>
                    <th className="text-right py-2 pr-4">Hit Bonus</th>
                    <th className="text-right py-2 pr-4">Range</th>
                    <th className="text-center py-2 pr-4">Ammo</th>
                    <th className="py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {char.weapons.map((w, wi) => {
                    const setAmmo = (cur: number) => {
                      if (!w.ammo) return;
                      const next = char.weapons.map((x, i) =>
                        i === wi && x.ammo ? { ...x, ammo: { ...x.ammo, current: Math.max(0, Math.min(x.ammo.max, cur)) } } : x);
                      onUpdate({ ...char, weapons: next });
                    };
                    const reload = () => {
                      if (!w.ammo) return;
                      const availableAmmo = w.ammo.readied + w.ammo.stowed;
                      if (availableAmmo === 0) return;
                      const ammoToLoad = Math.min(w.ammo.max, availableAmmo);
                      let newReadied = w.ammo.readied;
                      let newStowed = w.ammo.stowed;
                      let toLoad = ammoToLoad;
                      if (newReadied >= toLoad) {
                        newReadied -= toLoad;
                      } else {
                        toLoad -= newReadied;
                        newStowed -= toLoad;
                        newReadied = 0;
                      }
                      const next = char.weapons.map((x, i) =>
                        i === wi && x.ammo ? { ...x, ammo: { ...x.ammo, current: ammoToLoad, readied: newReadied, stowed: newStowed } } : x);
                      onUpdate({ ...char, weapons: next });
                    };
                    const hasAmmo = w.ammo && (w.ammo.readied > 0 || w.ammo.stowed > 0);
                    return (
                      <tr key={`${w.name}-${wi}`} className={`border-b border-gray-800 ${w.notCarried ? 'opacity-40' : w.readied === false ? 'opacity-60' : ''}`}>
                        <td className="py-2 pr-4 font-medium text-gray-200">
                          <div className="flex items-center gap-2">
                            <span className={w.notCarried ? 'line-through text-gray-500' : ''}>{w.name}</span>
                            {!w.notCarried && <ReadyToggle readied={w.readied !== false} onToggle={() => toggleWeaponReadied(wi)} />}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-red-400">{w.damage}</td>
                        <td className="py-2 pr-4 text-right text-green-400">
                          {w.attackBonus >= 0 ? '+' : ''}{char.baseAttackBonus + w.attackBonus}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-500 text-xs">{w.range ?? 'Melee'}</td>
                        <td className="py-2 pr-4">
                          {!w.notCarried && w.ammo ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => setAmmo(w.ammo!.current - 1)} disabled={w.ammo.current <= 0}
                                  className="w-6 h-6 rounded bg-gray-700 hover:bg-red-900/50 disabled:opacity-20 text-gray-300 text-xs" title="Fire (−1)">−</button>
                                <span className={`font-mono text-sm w-12 text-center ${w.ammo.current === 0 ? 'text-red-400' : 'text-gray-200'}`}>
                                  {w.ammo.current}/{w.ammo.max}
                                </span>
                                <button onClick={reload} disabled={!hasAmmo}
                                  className={`px-1.5 h-6 rounded text-gray-300 text-xs transition-colors ${hasAmmo ? 'bg-gray-700 hover:bg-amber-900/50' : 'bg-gray-800 opacity-40'}`}
                                  title={hasAmmo ? 'Reload' : 'No ammo available'}>⟳</button>
                              </div>
                              <div className="text-xs flex items-center gap-1">
                                {w.ammo.readied > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-blue-400">r:{w.ammo.readied}</span>
                                    <button onClick={() => {
                                      const next = char.weapons.map((x, i) =>
                                        i === wi && x.ammo ? { ...x, ammo: { ...x.ammo, readied: Math.max(0, x.ammo.readied - 1), stowed: x.ammo.stowed + 1 } } : x);
                                      onUpdate({ ...char, weapons: next });
                                    }}
                                      className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs" title="Stow 1">→</button>
                                  </div>
                                )}
                                {w.ammo.stowed > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    <button onClick={() => {
                                      const next = char.weapons.map((x, i) =>
                                        i === wi && x.ammo ? { ...x, ammo: { ...x.ammo, stowed: Math.max(0, x.ammo.stowed - 1), readied: x.ammo.readied + 1 } } : x);
                                      onUpdate({ ...char, weapons: next });
                                    }}
                                      className="w-4 h-4 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs" title="Ready 1">←</button>
                                    <span className="text-amber-600">s:{w.ammo.stowed}</span>
                                  </div>
                                )}
                                {w.ammo.readied === 0 && w.ammo.stowed === 0 && (
                                  <span className="text-red-500">no ammo</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-gray-600">—</div>
                          )}
                        </td>
                        <td className="py-2">
                          <NotCarriedBtn active={!!w.notCarried} onToggle={() => toggleWeaponNotCarried(wi)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SheetSection>
        )}

        {/* Equipment (full-width): armor rows, then general items, then credits bar */}
        <SheetSection title="Equipment">
          {/* Credits row */}
          {(() => {
            const remaining = char.credits - computeGearSpent(char);
            const addEarnings = () => {
              const n = Math.round(Number(earnings));
              if (Number.isFinite(n) && n !== 0) addCredits(n);
              setEarnings('');
            };
            const subtractEarnings = () => {
              const n = Math.round(Number(earnings));
              if (Number.isFinite(n) && n !== 0) addCredits(-n);
              setEarnings('');
            };
            return (
              <div className="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-gray-700">
                <Banknote size={18} className={remaining < 0 ? 'text-red-400' : 'text-amber-400'} />
                <span className={`font-bold text-lg ${remaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {remaining.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm">credits</span>
                {remaining < 0 && <span className="text-red-500 text-xs">(over budget)</span>}
                {char.debts > 0 && <span className="text-red-400 text-sm">Debts: {char.debts.toLocaleString()} cr</span>}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Add earnings:</span>
                  <button
                    onClick={subtractEarnings}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-red-900/60 text-gray-300 text-xs flex items-center justify-center"
                    title="Subtract"
                  >−</button>
                  <input
                    type="number"
                    value={earnings}
                    onChange={e => setEarnings(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addEarnings(); }}
                    placeholder="0"
                    className="w-20 bg-gray-900/60 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 placeholder-gray-600 text-center focus:outline-none focus:border-amber-500 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <button
                    onClick={addEarnings}
                    className="w-5 h-5 rounded bg-gray-700/80 hover:bg-green-900/60 text-gray-300 text-xs flex items-center justify-center"
                    title="Add"
                  >+</button>
                  <button onClick={() => setShowGear(true)}
                    className="text-xs px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-200 hover:text-amber-300 font-medium ml-1">
                    Manage Gear →
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {/* Armor rows */}
            {char.armor.map((a, ai) => (
              <div key={`${a.name}-${ai}`} className={`flex items-center gap-2 py-1.5 border-b border-gray-800/60 ${a.notCarried ? 'opacity-40' : a.readied === false ? 'opacity-60' : ''}`}>
                <span className="text-gray-500 text-xs">🛡</span>
                <span className={`text-sm flex-1 ${a.notCarried ? 'text-gray-500 line-through' : a.readied === false ? 'text-gray-500' : 'text-gray-200'}`}>{a.name}</span>
                <span className="text-green-400 text-xs font-bold">AC {a.ac}</span>
                {!a.notCarried && <ReadyToggle readied={a.readied !== false} onToggle={() => toggleArmorReadied(ai)} />}
                <NotCarriedBtn active={!!a.notCarried} onToggle={() => toggleArmorNotCarried(ai)} />
              </div>
            ))}

            {/* General equipment items */}
            {char.equipment.length === 0 && char.armor.length === 0 ? (
              <p className="text-gray-600 text-sm italic col-span-2 py-2">No gear. Use "Manage Gear" to add some.</p>
            ) : (
              [...new Set(char.equipment)].map((e) => {
                const qty = char.equipment.filter((x: string) => x === e).length;
                const isNotCarried = equipNotCarried.has(e);
                const isReadied = !isNotCarried && equipReadied.has(e);
                return (
                  <div key={e} className={`flex items-center gap-2 py-1.5 border-b border-gray-800/60 ${isNotCarried ? 'opacity-40' : ''}`}>
                    <span className="text-gray-600 text-xs">•</span>
                    <span className={`text-sm flex-1 ${isNotCarried ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
                      {qty > 1 ? `${e} ×${qty}` : e}
                    </span>
                    {!isNotCarried && <ReadyToggle readied={isReadied} onToggle={() => toggleEquipReadied(e)} />}
                    <NotCarriedBtn active={isNotCarried} onToggle={() => toggleEquipNotCarried(e)} />
                  </div>
                );
              })
            )}
          </div>

          {/* Encumbrance summary (p.65) — 1 line at bottom of equipment */}
          <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Encumbrance</span>
            <span className="text-xs text-gray-400">Readied <span className="font-bold text-gray-200">{enc.readied}/{enc.readiedMax}</span></span>
            <span className="text-xs text-gray-400">Stowed <span className="font-bold text-gray-200">{enc.stowed}/{enc.stowedMax}</span></span>
            <span className={`text-xs font-semibold ml-auto ${ENC_STATUS[enc.level].cls}`}>{ENC_STATUS[enc.level].text}</span>
          </div>
        </SheetSection>

        {/* Cyberware — installs, removes, shows permanent strain cost (p.82–85) */}
        <SheetSection
          title={`Cyberware${installedCyberware.length > 0 ? ` (${cyberwareStrainCost} Strain)` : ''}`}
          action={
            <button
              onClick={() => setShowCyberware(true)}
              className="px-2.5 py-1 rounded bg-gray-700 hover:bg-violet-900/40 text-gray-300 hover:text-violet-300 text-xs font-medium transition-colors"
            >
              + Manage
            </button>
          }
        >
          {installedCyberware.length === 0 ? (
            <p className="text-gray-600 text-sm italic">No implants installed. Use "Manage" to add cyberware.</p>
          ) : (
            <div className="space-y-1.5">
              {installedCyberware.map(c => {
                const def = CYBERWARE.find(cw => cw.name === c.name);
                return (
                  <div key={c.id} className="flex items-start gap-2 bg-gray-900/50 rounded px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-violet-300">{c.name}</span>
                        <span className="text-xs bg-violet-900/40 text-violet-400 px-1.5 py-0.5 rounded flex-shrink-0">
                          Strain -{def?.strain ?? '?'}
                        </span>
                        {def?.techLevel && (
                          <span className="text-xs text-gray-600">TL{def.techLevel}</span>
                        )}
                      </div>
                      {def?.effect && (
                        <p className="text-xs text-gray-500 mt-0.5">{def.effect}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onUpdate({
                        ...char,
                        cyberware: (char.cyberware ?? []).filter(x => x.id !== c.id),
                      })}
                      className="text-gray-600 hover:text-red-400 text-xs transition-colors flex-shrink-0 mt-0.5"
                      title="Remove implant"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-gray-600 pt-1">
                Permanent strain reduction: <span className="text-violet-400 font-medium">{cyberwareStrainCost}</span> of {char.systemStrain.max} (CON) max Strain used by cyberware.
              </p>
            </div>
          )}
        </SheetSection>

        {/* Level history */}
        {char.levelHistory.length > 0 && (
          <SheetSection title="Advancement History">
            <div className="space-y-2">
              {char.levelHistory.map(record => (
                <div key={record.level} className="glass rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-amber-400 font-bold">Level {record.level}</span>
                    <span className="text-green-400">+{record.hpGained} HP</span>
                    <span className="text-gray-500">({record.spTotal} SP gained)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-gray-400">
                    {record.skillSpends.map(s => (
                      <span key={s.skill} className="bg-gray-700/60 px-2 py-0.5 rounded">
                        {s.skill} {s.from === -1 ? '(new)' : `-${s.from}`}→-{s.to}
                      </span>
                    ))}
                    {record.attrBoosts.map(b => (
                      <span key={b.attr} className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded">
                        {b.attr} {b.from}→{b.to}
                      </span>
                    ))}
                    {record.focusPicked && (
                      <span className="bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded">
                        {record.focusPicked.name} Lvl {record.focusPicked.level}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SheetSection>
        )}

        {/* Ship Assignment */}
        <SheetSection title="Ships" action={
          ships.length > 0 ? (
            <button
              onClick={() => setShowShipPicker(true)}
              className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors"
            >
              + Assign
            </button>
          ) : undefined
        }>
          {assignedShips.length === 0 ? (
            <div className="flex items-center gap-3">
              <p className="text-gray-600 text-sm italic flex-1">Not assigned to any ship.</p>
              {ships.filter(s => !s.retired).length > 0 && (
                <button
                  onClick={() => setShowShipPicker(true)}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors"
                >
                  Assign Ship
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {assignedShips.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {s.retired && <span className="text-[10px] uppercase tracking-wide bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Retired</span>}
                      <span className="text-gray-200 font-medium text-sm">{s.name || 'Unnamed Ship'}</span>
                      <span className="text-gray-500 text-xs">{HULL_TYPES.find(h => h.id === s.hullId)?.name ?? s.hullId}</span>
                    </div>
                    {s.location && <p className="text-xs text-gray-500 mt-0.5">{s.location}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {onNavigateToShip && (
                      <button onClick={() => onNavigateToShip(s.id)}
                        className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors">
                        View →
                      </button>
                    )}
                    <button onClick={() => toggleShipAssignment(s.id)}
                      className="px-2 py-1 rounded bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400 text-xs transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowShipPicker(true)}
                className="mt-1 text-xs text-gray-500 hover:text-amber-300 transition-colors">
                + Assign to another ship
              </button>
            </div>
          )}
        </SheetSection>

        {/* Reference PDF */}
        <SheetSection title="Reference PDF" action={
          <div className="flex items-center gap-1.5">
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <FileText size={13} />
              {char.pdfAttachment ? 'Replace' : 'Upload PDF'}
            </button>
            {char.pdfAttachment && (
              <button
                onClick={removePdf}
                className="px-2 py-1 rounded bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400 text-xs transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        }>
          {char.pdfAttachment ? (
            <div className="flex items-center gap-3">
              <FileText size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-sm text-gray-300 truncate flex-1">{char.pdfAttachment.name}</span>
              <button
                onClick={() => setShowPdf(true)}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-amber-900/40 text-gray-300 hover:text-amber-300 text-xs font-medium transition-colors flex-shrink-0"
              >
                Open →
              </button>
            </div>
          ) : (
            <p className="text-gray-600 text-sm italic">No PDF attached. Upload a reference document (character sheet, rules, notes).</p>
          )}
        </SheetSection>

        {/* Notes — editable, saved immediately */}
        <SheetSection title="Notes">
          <input
            value={char.notes}
            onChange={e => onUpdate({ ...char, notes: e.target.value })}
            placeholder="Track goals, contacts, debts owed, plot threads…"
            className="w-full h-28 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-y"
          />
        </SheetSection>
      </div>
      )}
      </div>
      {showLevelUp && (
        <LevelUp
          char={char}
          onConfirm={updated => { onUpdate(updated); setShowLevelUp(false); }}
          onCancel={() => setShowLevelUp(false)}
        />
      )}

      {/* Unlock confirmation for full (structural) editing */}
      {confirmEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-gray-100 font-semibold text-lg flex items-center gap-2"><LockKeyhole size={18} className="text-amber-400" /> Unlock full editor?</h3>
            <p className="text-gray-400 text-sm">
              The full editor lets you change <strong className="text-gray-300">attributes, background, class, skills, foci, and psychics</strong>.
              Changing these recalculates derived stats and can conflict with choices made while leveling up.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmEdit(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
                Cancel
              </button>
              <button onClick={() => { setConfirmEdit(false); onEdit(); }}
                className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold">
                Unlock &amp; Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gear editor — reuses the wizard's equipment step, edits live */}
      {showGear && (
        <GearEditor char={char} onUpdate={onUpdate} onClose={() => setShowGear(false)} />
      )}

      {/* Cyberware manager modal */}
      {showCyberware && (
        <CyberwareManager
          char={char}
          onUpdate={onUpdate}
          onClose={() => setShowCyberware(false)}
          effectiveMaxStrain={effectiveMaxStrain}
        />
      )}

      {/* PDF viewer modal */}
      {showPdf && char.pdfAttachment?.data && (
        <CharacterPDFViewer
          name={char.pdfAttachment.name}
          data={char.pdfAttachment.data}
          onClose={() => setShowPdf(false)}
        />
      )}

      {/* Ship picker modal */}
      {showShipPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex-shrink-0">
              <h3 className="text-gray-100 font-semibold text-lg mb-1">Assign to Ships</h3>
              <p className="text-gray-500 text-xs">Click a ship to toggle assignment. Changes apply immediately.</p>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {ships.filter(s => !s.retired).length === 0 ? (
                <p className="text-gray-500 text-sm italic">No active ships available.</p>
              ) : (
                ships.filter(s => !s.retired).map(s => {
                  const hull = HULL_TYPES.find(h => h.id === s.hullId);
                  const assigned = assignedShipIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleShipAssignment(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        assigned
                          ? 'border-amber-600 bg-amber-900/20 text-amber-300'
                          : 'border-gray-700 bg-gray-800/60 text-gray-200 hover:border-amber-700 hover:bg-gray-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{s.name || 'Unnamed Ship'}</span>
                        {assigned && <span className="text-[10px] uppercase tracking-wide text-amber-400 font-bold">Assigned</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{hull?.name ?? s.hullId} · {hull?.class ?? ''}{s.location ? ` · ${s.location}` : ''}</div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end flex-shrink-0 pt-2 border-t border-gray-700">
              <button
                onClick={() => setShowShipPicker(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GearEditor({ char, onUpdate, onClose }: { char: Character; onUpdate: (c: Character) => void; onClose: () => void }) {
  useLockBodyScroll();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <span className="text-amber-300 font-semibold">Manage Gear — {char.name}</span>
        <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
          ✓ Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* postCreation hides the package/roll-credits starting-method tab */}
          <Step8Equipment char={char} onChange={patch => onUpdate({ ...char, ...patch })} postCreation />
        </div>
      </div>
    </div>
  );
}

function CyberwareManager({
  char, onUpdate, onClose, effectiveMaxStrain,
}: {
  char: Character;
  onUpdate: (c: Character) => void;
  onClose: () => void;
  effectiveMaxStrain: number;
}) {
  useLockBodyScroll();
  const installed = new Set((char.cyberware ?? []).filter(c => c.installed).map(c => c.name));

  function toggleImplant(name: string) {
    const def = CYBERWARE.find(cw => cw.name === name);
    const cost = def?.cost ?? 0;
    const existing = (char.cyberware ?? []).find(c => c.name === name);
    if (existing) {
      // Remove it entirely and refund its cost (keeps the budget consistent while configuring).
      onUpdate({ ...char, cyberware: (char.cyberware ?? []).filter(c => c.name !== name), credits: char.credits + cost });
    } else {
      // Install it — costs credits; blocked if unaffordable.
      if (cost > char.credits) return;
      const entry: CyberwareEntry = { id: crypto.randomUUID(), name, installed: true };
      onUpdate({ ...char, cyberware: [...(char.cyberware ?? []), entry], credits: Math.max(0, char.credits - cost) });
    }
  }

  const totalInstalled = (char.cyberware ?? []).filter(c => c.installed).reduce((sum, c) => {
    const def = CYBERWARE.find(cw => cw.name === c.name);
    return sum + (def?.strain ?? 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-violet-300 font-semibold">Cyberware — {char.name}</span>
          <span className="text-xs text-gray-500 ml-3">
            Strain capacity: <span className={totalInstalled > 0 ? 'text-violet-400 font-medium' : 'text-gray-400'}>{totalInstalled}</span>/{char.systemStrain.max} (CON) · Effective max strain: <span className="text-amber-300">{effectiveMaxStrain}</span> · Credits: <span className={char.credits > 0 ? 'text-emerald-300' : 'text-red-400'}>{char.credits.toLocaleString()}</span>
          </span>
        </div>
        <button onClick={onClose} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">
          Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-xs text-gray-500 mb-4">
            Each implant permanently reduces your max System Strain by its Strain cost (p.82). Click an item to install or remove it.
            Your base max Strain equals your Constitution score ({char.systemStrain.max}).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CYBERWARE.map(cw => {
              const isInstalled = installed.has(cw.name);
              const projectedTotal = isInstalled
                ? totalInstalled
                : totalInstalled + cw.strain;
              const wouldExceed = !isInstalled && projectedTotal > char.systemStrain.max;
              const cantAfford = !isInstalled && cw.cost > char.credits;
              return (
                <button
                  key={cw.name}
                  onClick={() => toggleImplant(cw.name)}
                  disabled={wouldExceed || cantAfford}
                  className={`text-left p-4 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isInstalled
                      ? 'border-violet-500 bg-violet-900/20'
                      : 'border-gray-700 bg-gray-800 hover:border-violet-600/50 hover:bg-violet-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`font-semibold text-sm ${isInstalled ? 'text-violet-300' : 'text-gray-200'}`}>
                      {cw.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isInstalled ? 'bg-violet-900/60 text-violet-300' : 'bg-gray-700 text-gray-400'}`}>
                        -{cw.strain} Strain
                      </span>
                      <span className="text-xs text-gray-600">TL{cw.techLevel}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{cw.effect}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{cw.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-600">{cw.cost.toLocaleString()} credits</span>
                    {cw.activationStrain && (
                      <span className="text-xs text-amber-600">+{cw.activationStrain} Strain per use</span>
                    )}
                    {isInstalled && (
                      <span className="text-xs text-violet-400 font-medium">Installed</span>
                    )}
                    {wouldExceed && (
                      <span className="text-xs text-red-500">Exceeds CON limit</span>
                    )}
                    {cantAfford && !wouldExceed && (
                      <span className="text-xs text-red-500">Can't afford</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetSection({ title, children, action, fill }: { title: string; children: React.ReactNode; action?: React.ReactNode; fill?: boolean }) {
  return (
    <div className={`glass rounded-xl p-4 ${fill ? 'h-full flex flex-col' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-gray-200 font-medium truncate">{value}</div>
    </div>
  );
}

/** 2-state toggle for weapons and armor: Readied ↔ Stowed. */
function ReadyToggle({ readied, onToggle }: { readied: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title="Toggle Readied / Stowed (affects encumbrance)"
      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border transition-colors ${
        readied
          ? 'border-amber-700/60 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50'
          : 'border-gray-600 bg-gray-700/60 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {readied ? 'Readied' : 'Stowed'}
    </button>
  );
}

/** Small rocket icon button — toggles "left at ship/base" (not carried, zero enc). */
function NotCarriedBtn({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={active ? 'Left at ship/base — click to bring along' : 'Leave at ship/base (removes from encumbrance)'}
      className={`p-0.5 rounded transition-colors ${
        active
          ? 'text-amber-400 bg-amber-900/30 hover:bg-amber-900/50'
          : 'text-gray-600 hover:text-gray-400'
      }`}
    >
      <Package size={13} />
    </button>
  );
}

function CharacterPDFViewer({ name, data, onClose }: { name: string; data: string; onClose: () => void }) {
  useLockBodyScroll();
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [jumpInput, setJumpInput] = useState('1');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!numPages) return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const page = Number((visible.target as HTMLElement).dataset.page);
          if (page) { setCurrentPage(page); setJumpInput(String(page)); }
        }
      },
      { root: scrollRef.current, threshold: 0.3 }
    );
    pageRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, scale]);

  const jumpTo = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(numPages, page));
    const el = pageRefs.current.get(clamped);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [numPages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText size={16} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-300 font-semibold text-sm truncate">{name}</span>
        </div>
        {numPages > 0 && (
          <form onSubmit={e => { e.preventDefault(); jumpTo(Number(jumpInput)); }} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-gray-500 text-xs">p.</span>
            <input
              type="number" min={1} max={numPages} value={jumpInput}
              onChange={e => setJumpInput(e.target.value)}
              className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-gray-100 text-sm"
            />
            <button type="submit" className="text-xs text-gray-500 hover:text-amber-300 transition-colors">Go</button>
            <span className="text-gray-600 text-xs">/ {numPages}</span>
          </form>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm flex items-center justify-center">−</button>
          <span className="text-gray-500 text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))}
            className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm flex items-center justify-center">+</button>
        </div>
        <button onClick={onClose}
          className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium flex-shrink-0">
          ✕ Close
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-800">
        <Document
          file={data}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          className="flex flex-col items-center py-4 gap-3"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
            <div key={p} data-page={p} ref={el => { if (el) pageRefs.current.set(p, el); else pageRefs.current.delete(p); }}>
              <Page pageNumber={p} scale={scale} renderTextLayer renderAnnotationLayer className="shadow-xl" />
            </div>
          ))}
        </Document>
        {numPages === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Loading PDF…</div>
        )}
      </div>
      {numPages > 0 && (
        <div className="bg-gray-900/80 border-t border-gray-800 py-1 flex justify-center">
          <span className="text-xs text-gray-600">Page {currentPage} of {numPages}</span>
        </div>
      )}
    </div>
  );
}

