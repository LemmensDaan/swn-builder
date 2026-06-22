import { useState } from 'react';
import type { Ship } from '../../types/ship';
import { emptyShip } from '../../types/ship';
import { HULL_TYPES, deriveShip } from '../../data/ships';
import WizardLayout from './WizardLayout';
import ShipStep1Hull from './steps/ShipStep1Hull';
import ShipStep2Drive from './steps/ShipStep2Drive';
import ShipStep3Weapons from './steps/ShipStep3Weapons';
import ShipStep4Fittings from './steps/ShipStep4Fittings';
import ShipStep5Mods from './steps/ShipStep5Mods';
import ShipStep6Review from './steps/ShipStep5Review';

interface Props {
  initial?: Ship;
  onSave: (ship: Ship) => void;
  onCancel: () => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
}

const TOTAL_STEPS = 6;
const STEP_NAMES = ['Hull', 'Drive', 'Weapons', 'Fittings', 'Mods', 'Review'];
const STEP_META = [
  { title: 'Ship Hull',            subtitle: 'Name your vessel and choose a hull type.' },
  { title: 'Spike Drive',          subtitle: 'Select the drive rating for interstellar travel.' },
  { title: 'Weapons',              subtitle: 'Arm your ship with weapons within hardpoint and power limits.' },
  { title: 'Defenses & Fittings',  subtitle: 'Install defenses and special fittings.' },
  { title: 'Modifications',        subtitle: 'Install after-market mods or design them into the hull.' },
  { title: 'Review',               subtitle: 'Review your complete ship before saving.' },
];

export default function ShipWizard({ initial, onSave, onCancel, onOpenRules, onOpenHelp }: Props) {
  const isEditing = !!initial;

  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(isEditing ? TOTAL_STEPS : 1);
  const [ship, setShip] = useState<Ship>(() => {
    const base = initial ?? emptyShip();
    // Ensure mods field exists for older saved ships
    return { ...base, mods: base.mods ?? [] };
  });
  const [confirmCancel, setConfirmCancel] = useState(false);

  function patch(updates: Partial<Ship>) {
    setShip(prev => ({ ...prev, ...updates }));
  }

  function stepValid(s: number): boolean {
    switch (s) {
      case 1: return ship.name.trim().length > 0;
      default: return true;
    }
  }

  const stepValidity = Array.from({ length: TOTAL_STEPS }, (_, i) => stepValid(i + 1));
  const canFinish = stepValidity[0];

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
    onSave(ship);
  }

  const meta = STEP_META[step - 1];
  const currentHull = HULL_TYPES.find(h => h.id === ship.hullId)!;

  return (
    <>
      <WizardLayout
        onOpenRules={onOpenRules}
        onOpenHelp={onOpenHelp}
        onExit={() => setConfirmCancel(true)}
        onSave={finalize}
        canSave={canFinish}
        isEditing={isEditing}
        step={step}
        totalSteps={TOTAL_STEPS}
        title={meta.title}
        subtitle={meta.subtitle}
        maxVisited={maxVisited}
        onStepClick={goToStep}
        stepValidity={stepValidity}
        stepNames={STEP_NAMES}
        onBack={step > 1 ? () => goToStep(step - 1) : () => setConfirmCancel(true)}
        onNext={step < TOTAL_STEPS ? handleNext : undefined}
        onFinish={step === TOTAL_STEPS ? finalize : undefined}
        finishDisabled={!canFinish}
        nextDisabled={false}
      >
        {step === 1 && <ShipStep1Hull ship={ship} onChange={patch} />}
        {step === 2 && <ShipStep2Drive ship={ship} hull={currentHull} onChange={patch} />}
        {step === 3 && <ShipStep3Weapons ship={ship} derived={deriveShip(ship)} onChange={patch} />}
        {step === 4 && <ShipStep4Fittings ship={ship} derived={deriveShip(ship)} onChange={patch} />}
        {step === 5 && <ShipStep5Mods ship={ship} derived={deriveShip(ship)} onChange={patch} />}
        {step === 6 && <ShipStep6Review ship={ship} derived={deriveShip(ship)} onGoToStep={goToStep} />}
      </WizardLayout>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-gray-100 font-semibold text-lg">
              {isEditing ? 'Discard changes?' : 'Cancel ship creation?'}
            </h3>
            <p className="text-gray-400 text-sm">
              {isEditing
                ? 'Any unsaved changes to this ship will be lost.'
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
