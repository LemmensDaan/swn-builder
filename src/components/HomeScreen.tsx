import type { Character } from '../types/character';

interface Props {
  characters: Character[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenRules: () => void;
}

export default function HomeScreen({ characters, onNew, onOpen, onDelete, onOpenRules }: Props) {
  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400">Stars Without Number</h1>
            <p className="text-xs text-gray-500">Revised Deluxe Edition — Character & Ship Builder</p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={onOpenRules}
              title="Open SWN Revised Deluxe Edition rulebook"
              className="p-2 rounded text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors"
            >
              <BookIcon />
            </button>
            <button
              onClick={onNew}
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors"
            >
              + New Character
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Nav tabs placeholder for future sections */}
        <div className="flex gap-4 mb-8 border-b border-gray-800 pb-1">
          <Tab label="Characters" active />
          <Tab label="Ships" active={false} disabled />
          <Tab label="Factions" active={false} disabled />
        </div>

        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">No characters yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm">
              Create your first interstellar adventurer for the year 3200. Freebooters, mercenaries, and psychic adepts await.
            </p>
            <button
              onClick={onNew}
              className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
            >
              Create Character
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map(char => (
              <CharacterCard
                key={char.id}
                char={char}
                onOpen={() => onOpen(char.id)}
                onDelete={() => onDelete(char.id)}
              />
            ))}
            <button
              onClick={onNew}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-amber-700 hover:bg-amber-900/10 transition-colors text-gray-600 hover:text-amber-400"
            >
              <span className="text-3xl">+</span>
              <span className="text-sm font-medium">New Character</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCard({ char, onOpen, onDelete }: { char: Character; onOpen: () => void; onDelete: () => void }) {
  const isPsychic = char.class === 'Psychic' || char.adventurerPartials?.includes('Partial Psychic');
  const classLabel = char.class === 'Adventurer' && char.adventurerPartials
    ? `Adventurer (${char.adventurerPartials.map(p => p.replace('Partial ', '')).join('/')})`
    : char.class;

  return (
    <div className="glass-card rounded-xl p-5 hover:border-amber-700/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-100 text-lg leading-tight">{char.name || '(unnamed)'}</h3>
          <p className="text-sm text-amber-400">{classLabel}</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-200">{char.level}</div>
          <div className="text-xs text-gray-600">LVL</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-center">
        <Pill label="HP" value={`${char.hitPoints.max}`} color="red" />
        <Pill label="AC" value={`${char.armor.reduce((m, a) => Math.max(m, a.ac), 10)}`} color="green" />
        {isPsychic
          ? <Pill label="Effort" value={`${char.effort.max}`} color="indigo" />
          : <Pill label="ATK" value={`+${char.baseAttackBonus}`} color="amber" />
        }
      </div>

      <div className="text-xs text-gray-500 mb-1">
        {char.background ? `${char.background} · ` : ''}{char.homeworld || 'Unknown Homeworld'}
      </div>

      {Object.keys(char.skills).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {Object.entries(char.skills).slice(0, 5).map(([skill, lvl]) => (
            <span key={skill} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {skill.slice(0, 3)}-{lvl}
            </span>
          ))}
          {Object.keys(char.skills).length > 5 && (
            <span className="text-xs text-gray-600">+{Object.keys(char.skills).length - 5} more</span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onOpen}
          className="flex-1 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
        >
          View Sheet
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="px-3 py-2 rounded bg-gray-700 hover:bg-red-900/60 text-gray-400 hover:text-red-400 text-sm transition-colors"
          title="Delete character"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Tab({ label, active, disabled }: { label: string; active: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-amber-500 text-amber-300'
          : disabled
          ? 'border-transparent text-gray-700 cursor-not-allowed'
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {disabled && <span className="ml-1 text-xs text-gray-700">(soon)</span>}
    </button>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-900/30 text-red-300',
    green: 'bg-green-900/30 text-green-300',
    amber: 'bg-amber-900/30 text-amber-300',
    indigo: 'bg-indigo-900/30 text-indigo-300',
  };
  return (
    <div className={`rounded px-2 py-1.5 ${colors[color] ?? 'bg-gray-700 text-gray-300'}`}>
      <div className="font-bold text-sm">{value}</div>
      <div className="text-gray-500 text-xs">{label}</div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
