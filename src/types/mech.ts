import { MECH_HULLS } from '../data/vehicles';

/** A single installed component on a saved mech, referenced by its data id. */
export interface MechSlot {
  uid: string;                                   // unique instance id
  kind: 'fitting' | 'defense' | 'weapon';
  defId: string;                                 // id into MECH_FITTINGS / MECH_DEFENSES / MECH_WEAPONS
}

/** A saved, named mech build (SWN Revised "Designing Mechs", pp.308–313). */
export interface Mech {
  id: string;
  name: string;
  hullId: string;
  slots: MechSlot[];
  notes: string;
  retired?: boolean;
}

export function emptyMech(): Mech {
  return {
    id: crypto.randomUUID(),
    name: '',
    hullId: MECH_HULLS[0].id,
    slots: [],
    notes: '',
  };
}
