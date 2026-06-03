import type { Character } from '../../../types/character';

interface Props {
  char: Character;
  onChange: (patch: Partial<Character>) => void;
}

export default function Step1Concept({ char, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Character Name" required>
          <input
            className="input"
            value={char.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="e.g. Kael Vasher"
          />
        </Field>
        <Field label="Homeworld">
          <input
            className="input"
            value={char.homeworld}
            onChange={e => onChange({ homeworld: e.target.value })}
            placeholder="e.g. Perdurabo"
          />
        </Field>
        <Field label="Species">
          <input
            className="input"
            value={char.species}
            onChange={e => onChange({ species: e.target.value })}
            placeholder="Human"
          />
        </Field>
      </div>

      <Field label="Starting Goal">
        <textarea
          className="input h-24 resize-none"
          value={char.goal}
          onChange={e => onChange({ goal: e.target.value })}
          placeholder="Every character needs a goal — something they're trying to accomplish. 'Become wealthy beyond my fondest dreams of avarice.' 'Find who destroyed my homeworld and make them pay.'"
        />
      </Field>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400 space-y-2">
        <p className="text-amber-300 font-semibold">Setting the Scene</p>
        <p>
          It is the year 3200. Centuries after the <em>Silence</em> — a catastrophe that destroyed interstellar civilization — scattered worlds are slowly reaching back out to each other. You are an adventurer among these stars: a freebooter, mercenary, explorer, or simply someone who refuses to stay put.
        </p>
        <p>
          Your character should be motivated to <strong>act</strong>, and to act as part of a group. Whatever their goal, it should give them an immediate reason to go out and do something.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      {children}
    </div>
  );
}
