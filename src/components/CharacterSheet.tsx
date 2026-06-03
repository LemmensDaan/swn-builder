import type { Character } from '../types/character';
import { attrMod } from '../types/character';
import { ARMOR_TABLE, RANGED_WEAPONS, MELEE_WEAPONS } from '../data/equipment';

function gearCost(name: string): number {
  return (
    ARMOR_TABLE.find(a => a.name === name)?.cost ??
    RANGED_WEAPONS.find(w => w.name === name)?.cost ??
    MELEE_WEAPONS.find(w => w.name === name)?.cost ??
    0
  );
}

function computeGearSpent(char: Character): number {
  let total = 0;
  for (const a of char.armor) total += gearCost(a.name);
  for (const w of char.weapons) total += gearCost(w.name);
  return total;
}

interface Props {
  char: Character;
  onEdit: () => void;
  onBack: () => void;
}

const ATTR_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

export default function CharacterSheet({ char, onEdit, onBack }: Props) {
  const attrs = char.attributes;
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const highestAC = char.armor.reduce((max, a) => Math.max(max, a.ac), 10);
  const totalAC = highestAC + attrMod(attrs.DEX);

  const xpTable = [0, 3, 6, 12, 18, 27, 39, 54, 72, 93];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-200 text-sm">← Characters</button>
          <span className="text-gray-700">|</span>
          <span className="text-amber-300 font-bold">{char.name}</span>
          <span className="text-gray-500 text-sm">{char.class} · Level {char.level}</span>
        </div>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium"
        >
          Edit
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoBlock label="Background" value={char.background || '—'} />
          <InfoBlock label="Homeworld" value={char.homeworld || '—'} />
          <InfoBlock label="Species" value={char.species} />
          <InfoBlock label="XP" value={`${char.xp} / ${xpTable[Math.min(char.level, xpTable.length - 1)]} (next lvl)`} />
        </div>

        {char.goal && (
          <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400 italic border-l-4 border-amber-700">
            <span className="text-gray-300 not-italic font-medium">Goal: </span>{char.goal}
          </div>
        )}

        {/* Attributes */}
        <SheetSection title="Attributes">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ATTR_ORDER.map(a => {
              const score = attrs[a];
              const mod = attrMod(score);
              return (
                <div key={a} className="bg-gray-900 rounded-xl p-3 text-center border border-gray-700">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{a}</div>
                  <div className="text-2xl font-bold">{score}</div>
                  <div className={`text-sm font-bold mt-1 ${mod > 0 ? 'text-green-400' : mod < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {mod >= 0 ? '+' : ''}{mod}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetSection>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Combat */}
          <SheetSection title="Combat">
            <div className="space-y-2.5">
              <StatRow label="HP" value={`${char.hitPoints.current} / ${char.hitPoints.max}`} big />
              <StatRow label="Armor Class" value={`${totalAC}`} big />
              <StatRow label="Base Attack Bonus" value={`+${char.baseAttackBonus}`} />
              <StatRow label="System Strain" value={`${char.systemStrain.current} / ${char.systemStrain.max}`} />
              {isPsychic && <StatRow label="Psionic Effort" value={`${char.effort.committed} / ${char.effort.max}`} />}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Saving Throws</p>
              <div className="space-y-1.5">
                <StatRow label="Physical" value={`${char.saves.physical}+`} small />
                <StatRow label="Evasion" value={`${char.saves.evasion}+`} small />
                <StatRow label="Mental" value={`${char.saves.mental}+`} small />
              </div>
            </div>
          </SheetSection>

          {/* Skills */}
          <SheetSection title="Skills">
            {Object.keys(char.skills).length === 0 ? (
              <p className="text-gray-600 text-sm italic">No skills recorded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(char.skills)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([skill, level]) => (
                    <div key={skill} className="flex items-center justify-between bg-gray-900/60 rounded px-2 py-1">
                      <span className="text-sm text-gray-300">{skill}</span>
                      <span className="text-amber-400 font-bold text-sm">-{level}</span>
                    </div>
                  ))}
              </div>
            )}
          </SheetSection>

          {/* Foci & Psychics */}
          <div className="space-y-4">
            <SheetSection title="Foci">
              {char.foci.length === 0 ? (
                <p className="text-gray-600 text-sm italic">No foci chosen.</p>
              ) : (
                <div className="space-y-2">
                  {char.foci.map(f => (
                    <div key={f.name} className="bg-gray-900/60 rounded px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-200">{f.name}</span>
                        <span className="text-xs text-amber-400">Lvl {f.level}</span>
                      </div>
                      {f.specialistSkill && <div className="text-xs text-gray-500">Skill: {f.specialistSkill}</div>}
                    </div>
                  ))}
                </div>
              )}
            </SheetSection>

            {isPsychic && char.psychicDisciplines.length > 0 && (
              <SheetSection title="Psychic Disciplines">
                <div className="space-y-2">
                  {[...new Set(char.psychicDisciplines)].map(d => {
                    const count = char.psychicDisciplines.filter(x => x === d).length;
                    const techs = char.psychicTechniques.filter(t => t.discipline === d);
                    return (
                      <div key={d} className="bg-indigo-900/20 rounded px-3 py-2 border border-indigo-900/40">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-indigo-300">{d}</span>
                          <span className="text-xs text-indigo-500">Level {count - 1}</span>
                        </div>
                        {techs.map(t => (
                          <div key={t.techniqueName} className="text-xs text-gray-400 mt-0.5">• {t.techniqueName}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </SheetSection>
            )}
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
                    <th className="text-left py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {char.weapons.map(w => (
                    <tr key={w.name} className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-medium text-gray-200">{w.name}</td>
                      <td className="py-2 pr-4 text-right font-mono text-red-400">{w.damage}</td>
                      <td className="py-2 pr-4 text-right text-green-400">
                        {w.attackBonus >= 0 ? '+' : ''}{char.baseAttackBonus + w.attackBonus}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-500 text-xs">{w.range ?? 'Melee'}</td>
                      <td className="py-2 text-xs text-gray-500">{w.shock ?? w.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SheetSection>
        )}

        {/* Armor & Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {char.armor.length > 0 && (
            <SheetSection title="Armor">
              <div className="space-y-2">
                {char.armor.map(a => (
                  <div key={a.name} className="flex items-center justify-between bg-gray-900/60 rounded px-3 py-2">
                    <span className="text-gray-200">{a.name}</span>
                    <span className="text-green-400 font-bold">AC {a.ac}</span>
                  </div>
                ))}
              </div>
            </SheetSection>
          )}

          {(char.equipment.length > 0 || char.credits > 0) && (
            <SheetSection title="Equipment & Credits">
              {char.credits >= 0 && (() => {
                const spent = computeGearSpent(char);
                const remaining = char.credits;
                const budget = char.credits + spent;
                const hasSpent = spent > 0;
                return (
                  <div className="mb-3 pb-2 border-b border-gray-700 space-y-1">
                    {hasSpent ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Budget</span>
                          <span className="font-mono text-gray-400">{budget.toLocaleString()} cr</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Spent on gear</span>
                          <span className="font-mono text-orange-400">−{spent.toLocaleString()} cr</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-semibold">
                          <span className="text-gray-400">Remaining</span>
                          <span className={`font-mono text-lg ${remaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                            {remaining.toLocaleString()} cr
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold text-lg">{remaining.toLocaleString()}</span>
                        <span className="text-gray-500 text-sm">credits</span>
                      </div>
                    )}
                    {char.debts > 0 && <span className="text-red-400 text-sm">Debts: {char.debts.toLocaleString()} cr</span>}
                  </div>
                );
              })()}
              <ul className="space-y-1">
                {char.equipment.map((e, i) => (
                  <li key={i} className="text-sm text-gray-400 flex gap-2">
                    <span className="text-gray-600">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </SheetSection>
          )}
        </div>

        {/* Notes */}
        <SheetSection title="Notes">
          <p className="text-gray-500 text-sm italic">
            {char.notes || 'No notes. Edit the character to add notes.'}
          </p>
        </SheetSection>
      </div>
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
      <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-gray-200 font-medium truncate">{value}</div>
    </div>
  );
}

function StatRow({ label, value, big, small }: { label: string; value: string; big?: boolean; small?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`text-gray-400 ${small ? 'text-xs' : 'text-sm'}`}>{label}</span>
      <span className={`font-bold ${big ? 'text-xl text-gray-100' : small ? 'text-sm text-gray-300' : 'text-gray-100'}`}>
        {value}
      </span>
    </div>
  );
}
