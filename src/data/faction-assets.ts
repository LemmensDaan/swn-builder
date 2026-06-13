import type { FactionAssetType } from '../types/sector';

export interface ReferenceAsset {
  name: string;
  type: FactionAssetType;
  rating: number;
  maxHp: number;
  attack: string;
  counter: string;
  description: string;
}

export const REFERENCE_ASSETS: ReferenceAsset[] = [
  // Force
  { name: 'Militia Unit',         type: 'Force',   rating: 1, maxHp: 3,  attack: '1d6',    counter: '1d6',    description: 'Irregularly equipped local militia' },
  { name: 'Free Company',         type: 'Force',   rating: 1, maxHp: 4,  attack: '1d6+2',  counter: '1d6',    description: 'Professional mercenary company' },
  { name: 'Soldiers',             type: 'Force',   rating: 2, maxHp: 6,  attack: '2d6',    counter: '1d6',    description: 'Trained military ground troops' },
  { name: 'Fighters',             type: 'Force',   rating: 2, maxHp: 6,  attack: '2d6',    counter: '1d6',    description: 'Armed fighters (Spaceship asset)' },
  { name: 'Hardened Personnel',   type: 'Force',   rating: 3, maxHp: 8,  attack: '2d6+2',  counter: '2d6',    description: 'Elite combat-hardened troops' },
  { name: 'Beachhead Landers',    type: 'Force',   rating: 3, maxHp: 8,  attack: '2d6+2',  counter: '1d6',    description: 'Assault landing craft (Spaceship asset)' },
  { name: 'Guerrilla Populace',   type: 'Force',   rating: 4, maxHp: 12, attack: '3d6',    counter: '2d6',    description: 'Armed civilian resistance movement' },
  { name: 'Strike Fleet',         type: 'Force',   rating: 4, maxHp: 12, attack: '3d6+4',  counter: '3d6',    description: 'Military strike spacecraft (Spaceship asset)' },
  { name: 'Planetary Defenses',   type: 'Force',   rating: 5, maxHp: 12, attack: '3d6+4',  counter: '2d6',    description: 'Fixed orbital/planetary weapons (Spaceship asset)' },
  { name: 'Capital Fleet',        type: 'Force',   rating: 6, maxHp: 16, attack: '4d6+4',  counter: '4d6',    description: 'Capital warships (Spaceship asset)' },
  // Cunning
  { name: 'Informers',            type: 'Cunning', rating: 1, maxHp: 3,  attack: '1d6',    counter: '1d6',    description: 'Network of street-level informants' },
  { name: 'Smuggling Fleet',      type: 'Cunning', rating: 1, maxHp: 4,  attack: '1d6',    counter: '1d6',    description: 'Covert transport vessels (Spaceship asset)' },
  { name: 'Saboteurs',            type: 'Cunning', rating: 2, maxHp: 5,  attack: '1d6+2',  counter: '1d6+2',  description: 'Trained demolition and sabotage operatives' },
  { name: 'Blackmail',            type: 'Cunning', rating: 2, maxHp: 4,  attack: '2d6',    counter: '—',      description: 'Blackmail leverage over key figures (passive)' },
  { name: 'Seductress',           type: 'Cunning', rating: 3, maxHp: 6,  attack: '2d6+2',  counter: '2d6',    description: 'Social manipulators and honeytrap operatives' },
  { name: 'Vory',                 type: 'Cunning', rating: 4, maxHp: 8,  attack: '2d6+4',  counter: '2d6',    description: 'Organized criminal network' },
  { name: 'Covert Shipping',      type: 'Cunning', rating: 4, maxHp: 8,  attack: '3d6',    counter: '2d6',    description: 'Hidden logistics and supply lines (Spaceship asset)' },
  { name: 'Assassins',            type: 'Cunning', rating: 5, maxHp: 8,  attack: '3d6+2',  counter: '2d6+2',  description: 'Professional killers for hire' },
  // Wealth
  { name: 'Franchise',            type: 'Wealth',  rating: 1, maxHp: 2,  attack: '1d6',    counter: '1d6',    description: 'Commercial franchise operation' },
  { name: 'Harvesters',           type: 'Wealth',  rating: 1, maxHp: 4,  attack: '1d6',    counter: '1d6',    description: 'Resource extraction workforce' },
  { name: 'Mercenaries',          type: 'Wealth',  rating: 2, maxHp: 6,  attack: '2d6',    counter: '1d6',    description: 'Hired professional soldiers' },
  { name: 'Merchants',            type: 'Wealth',  rating: 2, maxHp: 4,  attack: '1d6+2',  counter: '1d6+2',  description: 'Trading network and merchant guild' },
  { name: 'Preachers',            type: 'Wealth',  rating: 3, maxHp: 6,  attack: '2d6+2',  counter: '2d6',    description: 'Religious missionaries with popular influence' },
  { name: 'Speculators',          type: 'Wealth',  rating: 3, maxHp: 6,  attack: '2d6+2',  counter: '2d6',    description: 'Financial speculators and market manipulators' },
  { name: 'Usurers',              type: 'Wealth',  rating: 4, maxHp: 8,  attack: '2d6+4',  counter: '2d6',    description: 'Debt networks and moneylenders' },
  { name: 'Monopoly',             type: 'Wealth',  rating: 4, maxHp: 10, attack: '3d6',    counter: '3d6',    description: 'Control of critical trade goods or services' },
  { name: 'Pretech Researchers',  type: 'Wealth',  rating: 5, maxHp: 10, attack: '3d6+4',  counter: '3d6',    description: 'Advanced pretech research and development' },
];

export const FACTION_TAGS = [
  'Colonists', 'Imperialists', 'Mercenaries', 'Psionics', 'Religious',
  'Technologists', 'Criminals', 'Hegemony', 'Nomads', 'Unbraked AI',
  'Perimeter Agency', 'Eugenics Cult', 'Pirates', 'Corporate', 'Military',
  'Academic', 'Political', 'Underground', 'Alien', 'Ancient Tech',
];

export const FACTION_GOALS = [
  { name: 'Expand Influence',   description: 'Establish a new Base of Influence.', xpReward: 2 },
  { name: 'Smash the Foe',      description: "Destroy a rival faction's asset.", xpReward: 2 },
  { name: 'Blood the Sword',    description: 'Damage a faction that has at least as many Force assets as you.', xpReward: 3 },
  { name: 'Peaceable Kingdom',  description: 'Spend a full turn without attacking any faction.', xpReward: 2 },
  { name: 'Wealth of Worlds',   description: 'Possess total Wealth assets worth at least twice your Wealth score.', xpReward: 3 },
  { name: 'Infiltrate the Foe', description: "Place a Cunning asset in a rival's territory.", xpReward: 2 },
  { name: 'Destroy the Foe',    description: 'Eliminate a rival faction entirely.', xpReward: 5 },
  { name: 'Seize the Pretech',  description: 'Obtain control of a working pretech facility.', xpReward: 4 },
  { name: 'Subvert the Foe',    description: "Convert a rival's asset to your control.", xpReward: 3 },
];
