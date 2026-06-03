/**
 * Audit overview for the Review step.
 * Shows every character choice in a structured, provenance-aware breakdown
 * similar to the SWN Freebooter reference tool.
 */
import type { Character, AttributeName } from '../../types/character';
import { attrMod, calcSaves, calcAttackBonus } from '../../types/character';
import { BACKGROUNDS } from '../../data/backgrounds';
import { FOCI } from '../../data/foci';
import { PSYCHIC_DISCIPLINES } from '../../data/psychics';
import { effectiveSkills, psychicSkillLevels, deriveEffort, deriveAC, dieHardBonus, focusBonusSkill, computeEncumbrance } from '../../data/derivation';
import { ARMOR_TABLE, RANGED_WEAPONS, MELEE_WEAPONS, GENERAL_EQUIPMENT } from '../../data/equipment';
import { SKILL_INFO } from '../../data/skillInfo';

interface Props {
  char: Character;
}

// ── Attribute helpers ─────────────────────────────────────────────────────────

const ATTR_FULL: Record<AttributeName, string> = {
  STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution',
  INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma',
};

const ATTR_ORDER: AttributeName[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

const ATTR_NOTE: Record<AttributeName, string> = {
  STR: 'Melee damage, encumbrance',
  DEX: 'AC bonus, ranged attacks, Evasion save',
  CON: 'HP per level, System Strain max, Physical save',
  INT: 'Evasion save',
  WIS: 'Mental save, psychic Effort',
  CHA: 'Mental save',
};

// ── Skill provenance inference ────────────────────────────────────────────────

function inferSkillSource(
  skillName: string,
  level: number,
  char: Character,
): { primary: string; secondary?: string } {
  const bg = BACKGROUNDS.find(b => b.name === char.background);
  const sources: string[] = [];

  if (bg) {
    // Free skill
    if ((bg.freeSkill as string) === skillName || ((bg.freeSkill as string) === 'Any Combat' && ['Stab','Shoot','Punch'].includes(skillName))) {
      sources.push(`Free skill from ${bg.name} background`);
    }
    // Quick skills / learning table
    if (bg.quickSkills.includes(skillName as any) || bg.learning.includes(skillName as any)) {
      if (!sources.length) sources.push(`${bg.name} background table`);
    }
  }

  // Focus bonus skills (resolves Specialist / combat-choice picks)
  for (const sel of char.foci) {
    if (focusBonusSkill(sel) === skillName) {
      sources.push(`${sel.name} focus (bonus skill)`);
    }
  }

  if (!sources.length) {
    sources.push('Bonus skill or background table pick');
  }

  const primary = sources[0];
  const secondary = level === 1 && sources.length > 1 ? 'Gained more than once → raised to level-1' : undefined;
  return { primary, secondary };
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
        <div className="flex-1 h-px bg-gray-700" />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// A single audit row
function Row({
  label, value, note, missing, indent,
}: {
  label: string;
  value: string;
  note?: string;
  missing?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-2 text-sm py-0.5 ${indent ? 'pl-4' : ''}`}>
      <span className="text-gray-500 flex-shrink-0 min-w-[120px]">{label}</span>
      <span className={missing ? 'text-red-400 italic' : 'text-gray-100 font-medium'}>
        {value}
      </span>
      {note && <span className="text-gray-500 text-xs">{note}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuditOverview({ char }: Props) {
  const saves = calcSaves(char.attributes, char.level);
  const attackBonus = calcAttackBonus(char.class, char.adventurerPartials, char.level);
  const effort = deriveEffort(char);
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const isWarrior = char.class === 'Warrior' || char.adventurerPartials?.includes('Partial Warrior');
  const isExpert = char.class === 'Expert' || char.adventurerPartials?.includes('Partial Expert');
  const hasWildPsychic = char.foci.some(f => f.name === 'Wild Psychic Talent');

  const classLabel = char.class === 'Adventurer' && char.adventurerPartials
    ? `Adventurer (${char.adventurerPartials.map(p => p.replace('Partial ', '')).join(' / ')})`
    : char.class;

  // Final skills incl. foci bonus skills and psychic disciplines
  const regularSkills = effectiveSkills(char);
  const psychicSkills = psychicSkillLevels(char);

  const ac = deriveAC(char);
  const totalAC = ac.ac;
  const dhBonus = dieHardBonus(char);
  const enc = computeEncumbrance(char);

  const gearCost = (name: string): number =>
    ARMOR_TABLE.find(a => a.name === name)?.cost
    ?? RANGED_WEAPONS.find(w => w.name === name)?.cost
    ?? MELEE_WEAPONS.find(w => w.name === name)?.cost
    ?? GENERAL_EQUIPMENT.find(g => g.name === name)?.cost
    ?? 0;
  const spent = [...char.armor.map(a => a.name), ...char.weapons.map(w => w.name), ...char.equipment]
    .reduce((s, n) => s + gearCost(n), 0);
  const remainingCr = char.credits - spent;

  // Focus total picks expected
  const totalFociPicks = 1 + (isExpert ? 1 : 0) + (isWarrior ? 1 : 0);

  return (
    <div className="glass rounded-xl p-6 space-y-6 font-mono text-sm">
      <p className="text-xs text-gray-600 uppercase tracking-widest">Character Audit</p>

      {/* ── Identity ───────────────────────────────────────────────── */}
      <Section title="Identity">
        <Row label="Name"       value={char.name || 'Not selected'} missing={!char.name} />
        <Row label="Species"    value={char.species || 'Human'} />
        <Row label="Class"      value={classLabel || 'Not selected'} missing={!char.class} />
        <Row label="Level"      value={String(char.level)} />
        <Row label="Background" value={char.background || 'Not selected'} missing={!char.background} />
        <Row label="Homeworld"  value={char.homeworld || 'n/a'} />
        <Row label="Goal"       value={char.goal || 'n/a'} />
      </Section>

      {/* ── Attributes ─────────────────────────────────────────────── */}
      <Section title="Attributes">
        {ATTR_ORDER.map(a => {
          const score = char.attributes[a];
          const mod = attrMod(score);
          const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
          return (
            <Row
              key={a}
              label={ATTR_FULL[a]}
              value={`${score} (${modStr})`}
              note={ATTR_NOTE[a]}
            />
          );
        })}
        <div className="pt-1 text-xs text-gray-600 pl-0">
          Saves — Physical: {saves.physical}+  ·  Evasion: {saves.evasion}+  ·  Mental: {saves.mental}+
          <span className="ml-2 text-gray-700">(roll d20 equal-or-higher to succeed)</span>
        </div>
      </Section>

      {/* ── Skills ─────────────────────────────────────────────────── */}
      <Section title="Skills">
        {Object.keys(regularSkills).length === 0 ? (
          <p className="text-red-400 italic text-sm">No skills selected.</p>
        ) : (
          Object.entries(regularSkills)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([skill, level]) => {
              const src = inferSkillSource(skill, level as number, char);
              return (
                <div key={skill} className="py-0.5">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-gray-500 min-w-[120px] flex-shrink-0 cursor-help"
                      title={SKILL_INFO[skill] ? `${skill}: ${SKILL_INFO[skill]}` : skill}
                    >{skill}-{level}</span>
                    <span className="text-gray-300">{src.primary}</span>
                  </div>
                  {src.secondary && (
                    <div className="pl-[132px] text-xs text-gray-600">{src.secondary}</div>
                  )}
                </div>
              );
            })
        )}
      </Section>

      {/* ── Class details ──────────────────────────────────────────── */}
      <Section title="Class Abilities">
        <Row label="Base Attack" value={`+${attackBonus}`}
          note={char.class === 'Warrior' ? 'Equal to level' : isWarrior ? '+½ level + +1 at 1st/5th' : '+½ level, rounded down'} />
        <Row label="HP (max)"
          value={`${char.hitPoints.max}`}
          note={`max(1, 1d6 + CON) ${isWarrior ? '+2 Warrior ' : ''}${dhBonus ? `+${dhBonus} Die Hard` : ''}`.trim()} />
        {char.class === 'Expert' && (
          <Row label="Expert knack" value="Once per scene: reroll any failed skill check" />
        )}
        {char.class === 'Warrior' && (
          <Row label="Warrior luck" value="Once per scene: negate a hit OR turn a miss into a hit" />
        )}
        {(isPsychic || hasWildPsychic) && (
          <Row label="Psionic Effort" value={`${effort}`}
            note={hasWildPsychic && !isPsychic
              ? 'Wild Psychic Talent'
              : `1 + highest psychic skill + best of WIS/CON${char.foci.some(f => f.name === 'Psychic Training') ? ' + 1 (Psychic Training)' : ''}`} />
        )}
        {char.class === 'Adventurer' && char.adventurerPartials?.includes('Partial Expert') && (
          <Row indent label="Partial Expert" value="Bonus non-psychic skill point per level" />
        )}
        {char.class === 'Adventurer' && char.adventurerPartials?.includes('Partial Psychic') && (
          <Row indent label="Partial Psychic" value="One discipline only; restricted psychic" />
        )}
        {char.class === 'Adventurer' && char.adventurerPartials?.includes('Partial Warrior') && (
          <Row indent label="Partial Warrior" value="+1 attack at 1st and 5th level; +2 HP/level" />
        )}
      </Section>

      {/* ── Foci ───────────────────────────────────────────────────── */}
      <Section title={`Foci (${char.foci.length} / ${totalFociPicks} picks used)`}>
        {char.foci.length === 0 ? (
          <p className="text-red-400 italic text-sm">No foci selected — at least 1 required.</p>
        ) : (
          char.foci.map(sel => {
            const def = FOCI.find(f => f.name === sel.name);
            return (
              <div key={sel.name} className="py-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 min-w-[120px] flex-shrink-0">
                    {sel.name} Lvl {sel.level}
                  </span>
                  <span className={def?.isCombat ? 'text-red-300' : 'text-blue-300'}>
                    {def?.isCombat ? 'Combat focus' : 'Non-combat focus'}
                  </span>
                </div>
                {def && (
                  <div className="pl-[132px] text-xs text-gray-500 leading-snug mt-0.5">
                    {def.levels[0].description.slice(0, 120)}{def.levels[0].description.length > 120 ? '…' : ''}
                  </div>
                )}
                {sel.specialistSkill && (
                  <div className="pl-[132px] text-xs text-amber-600">
                    Specialist skill: {sel.specialistSkill}
                  </div>
                )}
              </div>
            );
          })
        )}
        {char.foci.length < totalFociPicks && (
          <p className="text-amber-400 text-xs italic pl-0 pt-1">
            {totalFociPicks - char.foci.length} pick{totalFociPicks - char.foci.length !== 1 ? 's' : ''} remaining.
          </p>
        )}
      </Section>

      {/* ── Psychic disciplines ────────────────────────────────────── */}
      {isPsychic && (
        <Section title="Psychic Disciplines">
          {Object.keys(psychicSkills).length === 0 ? (
            <p className="text-red-400 italic text-sm">No discipline selected.</p>
          ) : (
            Object.keys(psychicSkills).map(discName => {
              const skillLevel = psychicSkills[discName];
              const def = PSYCHIC_DISCIPLINES.find(d => d.skill === discName);
              const techniques = char.psychicTechniques.filter(t => t.discipline === discName);
              return (
                <div key={discName} className="py-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-500 min-w-[120px] flex-shrink-0">{discName}-{skillLevel}</span>
                    <span className="text-indigo-300">{def?.coreTechnique.name} (core, auto)</span>
                  </div>
                  <div className="pl-[132px] text-xs text-gray-600 mt-0.5">
                    {def?.coreTechnique.levels[skillLevel]}
                  </div>
                  {techniques.map(t => (
                    <div key={t.techniqueName} className="pl-[132px] text-xs text-gray-400 mt-0.5">
                      + {t.techniqueName}
                    </div>
                  ))}
                  {techniques.length === 0 && skillLevel === 0 && (
                    <div className="pl-[132px] text-xs text-gray-600">No extra techniques chosen.</div>
                  )}
                </div>
              );
            })
          )}
        </Section>
      )}

      {/* ── Armor ──────────────────────────────────────────────────── */}
      <Section title="Armor">
        <Row label="Total AC" value={`${totalAC}`}
          note={`${ac.label} (${ac.base}) + DEX mod (${attrMod(char.attributes.DEX) >= 0 ? '+' : ''}${attrMod(char.attributes.DEX)})`} />
        {char.armor.length === 0 && ac.label !== 'Ironhide'
          ? <div className="py-0.5 text-gray-600 text-sm pl-0">Unarmored (AC 10)</div>
          : char.armor.map(a => (
            <Row key={a.name} label={a.name} value={`AC ${a.ac}`} />
          ))
        }
        {ac.label === 'Ironhide' && (
          <Row label="Ironhide focus" value={`AC ${ac.base}`} note="innate 15 + ½ level" />
        )}
      </Section>

      {/* ── Weapons ────────────────────────────────────────────────── */}
      <Section title="Weapons">
        {char.weapons.length === 0
          ? <Row label="Unarmed" value="1d2" note="no Shock, always adds Punch skill to damage" />
          : char.weapons.map(w => (
            <Row key={w.name} label={w.name} value={w.damage}
              note={w.range ? `range ${w.range}` : w.shock ? `shock: ${w.shock}` : 'melee'} />
          ))
        }
      </Section>

      {/* ── Encumbrance ────────────────────────────────────────────── */}
      <Section title="Encumbrance">
        <Row label="Readied" value={`${enc.readied} / ${enc.readiedMax}`} note="worn / in hand / holstered, incl. armor (max STR ÷ 2)" />
        <Row label="Stowed" value={`${enc.stowed} / ${enc.stowedMax}`} note="packed away (max STR)" />
        <Row label="Status"
          value={enc.level === 'none' ? 'Unencumbered (move 10m)' :
                 enc.level === 'light' ? 'Lightly Encumbered (move 7m)' :
                 enc.level === 'heavy' ? 'Heavily Encumbered (move 5m)' : 'Overloaded (cannot move)'} />
      </Section>

      {/* ── Equipment & credits ────────────────────────────────────── */}
      <Section title="Equipment & Credits">
        <Row label="Budget" value={`${char.credits.toLocaleString()} cr`} />
        {spent > 0 && <Row label="Spent on gear" value={`−${spent.toLocaleString()} cr`} />}
        <Row label="Remaining" value={`${remainingCr.toLocaleString()} cr`} note={remainingCr < 0 ? 'over budget' : undefined} />
        {char.debts > 0 && <Row label="Debts" value={`${char.debts.toLocaleString()} cr`} />}
        {[...new Set(char.equipment)].map(e => {
          const qty = char.equipment.filter(x => x === e).length;
          return <Row key={e} label="" value={qty > 1 ? `${e} ×${qty}` : e} />;
        })}
      </Section>

      <p className="text-xs text-gray-700 pt-2">
        All values from SWN Revised Deluxe Edition (Kevin Crawford, Sine Nomine Publishing).
      </p>
    </div>
  );
}
