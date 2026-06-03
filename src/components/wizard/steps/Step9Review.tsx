import type { Character } from '../../../types/character';
import type { ValidationError } from '../CharacterWizard';
import AuditOverview from '../AuditOverview';

interface Props {
  char: Character;
  validationErrors?: ValidationError[];
  onGoToStep?: (step: number) => void;
}

export default function Step9Review({ char, validationErrors = [], onGoToStep }: Props) {
  return (
    <div className="space-y-6">
      {/* Validation errors */}
      {validationErrors.length > 0 ? (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg">⚠</span>
            <p className="text-red-300 font-semibold">
              {validationErrors.length} issue{validationErrors.length !== 1 ? 's' : ''} must be resolved before finishing
            </p>
          </div>
          <ul className="space-y-2">
            {validationErrors.map(err => (
              <li key={err.step} className="flex items-start gap-3 text-sm">
                <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                <div>
                  <button
                    onClick={() => onGoToStep?.(err.step)}
                    className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 mr-2"
                  >
                    Step {err.step}: {err.stepName}
                  </button>
                  <span className="text-red-300">{err.message}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">Click a step name above to jump directly to it.</p>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 text-sm text-green-300">
          ✓ All steps complete. Click <strong>Finish — View Sheet</strong> to roll HP and save.
        </div>
      )}

      {/* Full audit overview */}
      <AuditOverview char={char} />
    </div>
  );
}
