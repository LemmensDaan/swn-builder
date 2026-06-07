export const MODULE_CONSEQUENCES: Record<string, { type: string; consequence: string }> = {
  // Weapons
  'weapon-damage': {
    type: 'Weapon System',
    consequence: 'Cannot fire this weapon. Must be repaired before combat effectiveness is restored.',
  },
  // Defenses
  'defense-damage': {
    type: 'Defense System',
    consequence: 'Defense system fails. AC penalty applies until repaired.',
  },
  // Fittings
  'spike-drive-damage': {
    type: 'Spike Drive',
    consequence: 'Cannot perform spike drill travel. Stranded until repaired.',
  },
  'maneuver-thruster-damage': {
    type: 'Maneuver Thrusters',
    consequence: 'Reduced maneuverability in combat. Increased difficulty for evasion.',
  },
  'power-plant-damage': {
    type: 'Power Plant',
    consequence: 'Reduced power output. Some systems may go offline if available power insufficient.',
  },
  'life-support-damage': {
    type: 'Life Support',
    consequence: 'Crew must suit up or risk damage. Long-term exposure becomes lethal.',
  },
  'cargo-system-damage': {
    type: 'Cargo Hold',
    consequence: 'Cargo hold breached. Risk of d10×10% cargo loss per round if unrepaired.',
  },
  'medical-bay-damage': {
    type: 'Medical Bay',
    consequence: 'Cannot perform medical procedures. Injuries cannot be treated.',
  },
  'fuel-scoop-damage': {
    type: 'Fuel Scoop',
    consequence: 'Cannot refuel from planetary atmospheres. Must purchase fuel at stations.',
  },
  'fuel-bunker-damage': {
    type: 'Fuel Bunker',
    consequence: 'Fuel capacity reduced. May affect maximum range between refueling.',
  },
  'atmospheric-config-damage': {
    type: 'Atmospheric Configuration',
    consequence: 'Cannot land on planets. Must use cargo lighter or shuttles for surface access.',
  },
};

export function getModuleConsequence(moduleType: string, moduleName: string): string {
  // Try specific matching first
  const key = `${moduleType}-damage`;
  if (MODULE_CONSEQUENCES[key]) {
    return MODULE_CONSEQUENCES[key].consequence;
  }

  // Generic fallback
  return `${moduleName} is damaged and non-functional until repaired.`;
}
