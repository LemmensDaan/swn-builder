import { useState } from 'react';
import type { Character } from '../../types/character';
import { emptyCharacter, calcSaves, calcAttackBonus, calcEffort, attrMod, recomputeSkills } from '../../types/character';
import WizardLayout from './WizardLayout';
import Step1Concept from './steps/Step1Concept';
import Step2Attributes from './steps/Step2Attributes';
import Step3Background from './steps/Step3Background';
import Step4Skills from './steps/Step4Skills';
import Step5Class from './steps/Step5Class';
import Step6Foci from './steps/Step6Foci';
import Step7Psychics from './steps/Step7Psychics';
import Step8Equipment from './steps/Step8Equipment';
import Step9Review from './steps/Step9Review';

interface Props {
  initial?: Character;
  onSave: (char: Character) => void;
  onCancel: () => void;
  onOpenRules: () => void;
}

const TOTAL_STEPS = 9;

const STEP_META = [
  { title: 'Character Concept',  subtitle: 'Give your hero a name, homeworld, and a goal to pursue.' },
  { title: 'Attributes',         subtitle: 'Determine your six core attributes.' },
  { title: 'Background',         subtitle: 'Choose the career or life your hero came from before adventuring.' },
  { title: 'Skills',             subtitle: 'Select skills from your background and choose a bonus skill.' },
  { title: 'Class',              subtitle: 'Choose the class that best reflects how your hero deals with problems.' },
  { title: 'Foci',               subtitle: 'Pick special knacks and aptitudes that define your hero beyond their class.' },
  { title: 'Psychic Powers',     subtitle: 'If your class grants psychic abilities, choose your disciplines and techniques.' },
  { title: 'Equipment',          subtitle: 'Choose a starting gear package or roll credits to buy your own equipment.' },
  { title: 'Review',             subtitle: 'Review your complete character before saving.' },
];

export interface ValidationError {
  step: number;
  stepName: string;
  message: string;
}

export default function CharacterWizard({ initial, onSave, onCancel, onOpenRules }: Props) {
  const isEditing = !!initial;

  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(isEditing ? TOTAL_STEPS : 1);
  const [char, setChar] = useState<Character>(() => initial ?? emptyCharacter());
  const [skillsComplete, setSkillsComplete] = useState(
    () => isEditing ? Object.keys(initial!.skills).length >= 2 : false
  );
  const [confirmCancel, setConfirmCancel] = useState(false);

  function patch(updates: Partial<Character>) {
    setChar(prev => {
      const next = { ...prev, ...updates };
      next.saves = calcSaves(next.attributes, next.level);
      next.baseAttackBonus = calcAttackBonus(next.class, next.adventurerPartials, next.level);
      if (next.class === 'Psychic' || next.adventurerPartials?.includes('Partial Psychic')) {
        next.effort.max = calcEffort(next.skills, next.attributes);
      }
      next.systemStrain.max = next.attributes.CON;
      return next;
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  function stepValid(s: number, c = char, sc = skillsComplete): boolean {
    switch (s) {
      case 1: return c.name.trim().length > 0;
      case 2: return true; // attributes always have values in range
      case 3: return c.background.length > 0;
      case 4: return sc;
      case 5: return c.class !== 'Adventurer' || (c.adventurerPartials?.length ?? 0) === 2;
      case 6: return c.foci.length >= 1;
      case 7: {
        const isPsychic = c.class === 'Psychic' || c.adventurerPartials?.includes('Partial Psychic');
        return !isPsychic || c.psychicDisciplines.length >= 1;
      }
      case 8: return true;
      default: return true;
    }
  }

  function getValidationErrors(c = char, sc = skillsComplete): ValidationError[] {
    const errors: ValidationError[] = [];
    const MESSAGES: Record<number, (c: Character) => string | null> = {
      1: c  => !c.name.trim() ? 'Character name is required.' : null,
      3: c  => !c.background ? 'No background selected.' : null,
      4: _c => !sc ? 'Skills selection is incomplete — finish picking skills and choose a bonus skill.' : null,
      5: c  => c.class === 'Adventurer' && (c.adventurerPartials?.length ?? 0) !== 2
               ? 'Adventurer class requires exactly 2 partial classes.' : null,
      6: c  => c.foci.length < 1 ? 'No focus selected — all classes must choose at least one focus.' : null,
      7: c  => {
        const isPsychic = c.class === 'Psychic' || c.adventurerPartials?.includes('Partial Psychic');
        return (isPsychic && c.psychicDisciplines.length < 1)
          ? 'Psychic class requires at least one psychic discipline.' : null;
      },
    };

    for (const [sStr, msgFn] of Object.entries(MESSAGES)) {
      const s = Number(sStr);
      const msg = msgFn(c);
      if (msg) {
        errors.push({ step: s, stepName: STEP_META[s - 1].title, message: msg });
      }
    }
    return errors;
  }

  const allErrors = getValidationErrors();
  const canFinish = allErrors.length === 0;
  const stepValidity = Array.from({ length: TOTAL_STEPS }, (_, i) => stepValid(i + 1));

  // ── Navigation ────────────────────────────────────────────────────────────────

  function goToStep(s: number) {
    setStep(s);
    setMaxVisited(prev => Math.max(prev, s));
  }

  function handleNext() {
    const next = step + 1;
    setStep(next);
    setMaxVisited(prev => Math.max(prev, next));
  }

  function finalize() {
    if (!canFinish) return;
    const finalChar = { ...char };

    // Roll HP for new characters
    if (!isEditing || finalChar.hitPoints.max <= 1) {
      const conMod = attrMod(finalChar.attributes.CON);
      const isWarrior = finalChar.class === 'Warrior' || finalChar.adventurerPartials?.includes('Partial Warrior');
      const roll = Math.ceil(Math.random() * 6);
      finalChar.hitPoints.max = Math.max(1, roll + conMod + (isWarrior ? 2 : 0));
      finalChar.hitPoints.current = finalChar.hitPoints.max;
    }

    // Snapshot creation skills so level-history recompute works later
    finalChar.creationSkills = { ...finalChar.skills };

    // If re-saving a leveled character: recompute skills = new base + history
    if (finalChar.levelHistory.length > 0) {
      finalChar.skills = recomputeSkills(finalChar);
    }

    onSave(finalChar);
  }

  const meta = STEP_META[step - 1];

  return (
    <>
    <WizardLayout
      onOpenRules={onOpenRules}
      step={step}
      totalSteps={TOTAL_STEPS}
      title={meta.title}
      subtitle={meta.subtitle}
      maxVisited={maxVisited}
      onStepClick={goToStep}
      stepValidity={stepValidity}
      onBack={step > 1 ? () => goToStep(step - 1) : () => setConfirmCancel(true)}
      onNext={step < TOTAL_STEPS ? handleNext : undefined}
      onFinish={step === TOTAL_STEPS ? finalize : undefined}
      finishDisabled={!canFinish}
      nextDisabled={false}
    >
      {/* Warning when editing a leveled character */}
      {isEditing && char.levelHistory.length > 0 && (
        <div className="mb-6 bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 text-sm text-amber-300">
          <span className="font-semibold">⚠ Leveled character ({char.level})</span>
          <span className="text-amber-400/70 ml-2">
            This character has {char.levelHistory.length} level-up{char.levelHistory.length > 1 ? 's' : ''} recorded.
            Changing class, background, or attributes will update base stats but preserve all advancement history.
          </span>
        </div>
      )}
      {step === 1 && <Step1Concept char={char} onChange={patch} />}
      {step === 2 && <Step2Attributes char={char} onChange={patch} isEditing={isEditing} />}
      {step === 3 && <Step3Background char={char} onChange={patch} />}
      {step === 4 && (
        <Step4Skills char={char} onChange={patch} onComplete={setSkillsComplete} />
      )}
      {step === 5 && <Step5Class char={char} onChange={patch} />}
      {step === 6 && <Step6Foci char={char} onChange={patch} />}
      {step === 7 && <Step7Psychics char={char} onChange={patch} />}
      {step === 8 && <Step8Equipment char={char} onChange={patch} />}
      {step === 9 && (
        <Step9Review
          char={char}
          validationErrors={allErrors}
          onGoToStep={goToStep}
        />
      )}
    </WizardLayout>

    {/* Cancel confirmation */}
    {confirmCancel && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
          <h3 className="text-gray-100 font-semibold text-lg">
            {isEditing ? 'Discard changes?' : 'Cancel character creation?'}
          </h3>
          <p className="text-gray-400 text-sm">
            {isEditing
              ? 'Any unsaved changes to this character will be lost.'
              : 'Your progress will not be saved.'}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmCancel(false)}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium"
            >
              Keep editing
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-semibold"
            >
              Exit Wizard
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
