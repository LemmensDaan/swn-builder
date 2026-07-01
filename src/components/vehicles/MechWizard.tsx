import { useState } from 'react';
import WizardLayout from '../wizard/WizardLayout';
import {
  HullSelector, ComponentPicker, BuildSummary, classAllowed, makeId, type Slot,
} from './MechBuilder';
import {
  MECH_HULLS, MECH_FITTINGS, MECH_DEFENSES, MECH_WEAPONS,
  type MechFittingDef, type MechDefenseDef, type MechWeaponDef,
} from '../../data/vehicles';
import type { Mech, MechSlot } from '../../types/mech';
import { emptyMech } from '../../types/mech';

const TOTAL_STEPS = 3;
const STEP_NAMES = ['Hull', 'Loadout', 'Review'];
const STEP_META = [
  { title: 'Mech Hull', subtitle: 'Name your mech and choose a chassis.' },
  { title: 'Loadout', subtitle: 'Add fittings, defenses and weapons within the hull budget.' },
  { title: 'Review', subtitle: 'Check the budgets and statblock, then save.' },
];

/** Resolve a saved mech's slot ids back into rich component definitions. */
function hydrateSlots(mech: Mech): Slot[] {
  const out: Slot[] = [];
  for (const s of mech.slots) {
    if (s.kind === 'fitting') {
      const def = MECH_FITTINGS.find(f => f.id === s.defId);
      if (def) out.push({ kind: 'fitting', id: s.uid, def });
    } else if (s.kind === 'defense') {
      const def = MECH_DEFENSES.find(d => d.id === s.defId);
      if (def) out.push({ kind: 'defense', id: s.uid, def });
    } else {
      const def = MECH_WEAPONS.find(w => w.id === s.defId);
      if (def) out.push({ kind: 'weapon', id: s.uid, def });
    }
  }
  return out;
}

function serializeSlots(slots: Slot[]): MechSlot[] {
  return slots.map(s => ({ uid: s.id, kind: s.kind, defId: s.def.id }));
}

interface Props {
  initial?: Mech;
  onSave: (mech: Mech) => void;
  onCancel: () => void;
  onOpenRules?: () => void;
  onOpenHelp?: () => void;
}

export default function MechWizard({ initial, onSave, onCancel, onOpenRules, onOpenHelp }: Props) {
  const isEditing = !!initial;
  const base = initial ?? emptyMech();

  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(isEditing ? TOTAL_STEPS : 1);
  const [name, setName] = useState(base.name);
  const [notes, setNotes] = useState(base.notes);
  const [hullId, setHullId] = useState(base.hullId);
  const [slots, setSlots] = useState<Slot[]>(() => hydrateSlots(base));
  const [confirmCancel, setConfirmCancel] = useState(false);

  const hull = MECH_HULLS.find(h => h.id === hullId) ?? MECH_HULLS[0];
  const canSave = name.trim().length > 0;
  const stepValidity = [canSave, true, true];

  function goToStep(s: number) { setStep(s); setMaxVisited(p => Math.max(p, s)); }
  function handleNext() { const n = step + 1; setStep(n); setMaxVisited(p => Math.max(p, n)); }

  function changeHull(next: typeof hull) {
    if (next.id !== hullId) {
      setSlots(prev => prev.filter(s => classAllowed(s.def.minClass, next.class)));
    }
    setHullId(next.id);
  }

  const addFitting = (def: MechFittingDef) => setSlots(p => [...p, { kind: 'fitting', id: makeId(), def }]);
  const addDefense = (def: MechDefenseDef) => setSlots(p => [...p, { kind: 'defense', id: makeId(), def }]);
  const addWeapon  = (def: MechWeaponDef)  => setSlots(p => [...p, { kind: 'weapon',  id: makeId(), def }]);
  const removeSlot = (id: string) => setSlots(p => p.filter(s => s.id !== id));

  function finalize() {
    if (!canSave) return;
    onSave({ id: base.id, name: name.trim(), hullId, slots: serializeSlots(slots), notes, retired: initial?.retired });
  }

  const meta = STEP_META[step - 1];

  return (
    <>
      <WizardLayout
        wizardLabel="Mech Builder"
        onOpenRules={onOpenRules ?? (() => {})}
        onOpenHelp={onOpenHelp ?? (() => {})}
        onExit={() => setConfirmCancel(true)}
        onSave={finalize}
        canSave={canSave}
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
        finishDisabled={!canSave}
        nextDisabled={false}
      >
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Mech name</label>
              <input
                className="input text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Achilles, Iron Vanguard…"
              />
            </div>
            <HullSelector selected={hull} onChange={changeHull} />
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComponentPicker hull={hull} onAddFitting={addFitting} onAddDefense={addDefense} onAddWeapon={addWeapon} />
            <BuildSummary hull={hull} slots={slots} onRemove={removeSlot} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <BuildSummary hull={hull} slots={slots} onRemove={removeSlot} />
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Notes</label>
              <textarea
                className="input text-sm resize-none h-24"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Pilot, livery, deployment notes…"
              />
            </div>
            {!canSave && <p className="text-xs text-red-400">Give the mech a name (step 1) before saving.</p>}
          </div>
        )}
      </WizardLayout>

      {confirmCancel && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-gray-100 font-semibold text-lg">{isEditing ? 'Discard changes?' : 'Cancel mech build?'}</h3>
            <p className="text-gray-400 text-sm">{isEditing ? 'Unsaved changes will be lost.' : 'Your progress will not be saved.'}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmCancel(false)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">Keep editing</button>
              <button onClick={onCancel} className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-semibold">Exit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
