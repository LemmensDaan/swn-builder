import type { ReactNode } from 'react';

interface Props {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  finishDisabled?: boolean;
  nextLabel?: string;
  nextDisabled?: boolean;
  // Free navigation
  maxVisited: number;
  onStepClick: (s: number) => void;
  stepValidity: boolean[]; // index 0 = step 1
}

const STEP_NAMES = [
  'Concept', 'Attributes', 'Background', 'Skills', 'Class', 'Foci', 'Psychics', 'Equipment', 'Review',
];

export default function WizardLayout({
  step, totalSteps, title, subtitle, children,
  onBack, onNext, onFinish, finishDisabled, nextLabel, nextDisabled,
  maxVisited, onStepClick, stepValidity,
}: Props) {
  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-lg">SWN</span>
          <span className="text-gray-400 text-sm">Character Creator</span>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-400">Step {step} of {totalSteps}</span>
      </div>

      {/* Step tabs — clickable for any visited step */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max py-1">
          {STEP_NAMES.slice(0, totalSteps).map((name, i) => {
            const stepNum = i + 1;
            const isCurrent = stepNum === step;
            const visited = stepNum <= maxVisited;
            const valid = stepValidity[i];

            let tabClass: string;
            let icon = '';

            if (isCurrent) {
              tabClass = 'bg-amber-600 text-white';
            } else if (!visited) {
              tabClass = 'text-gray-600 cursor-not-allowed';
            } else if (valid) {
              tabClass = 'text-green-400 hover:bg-gray-800 cursor-pointer';
              icon = '✓ ';
            } else {
              tabClass = 'text-red-400 hover:bg-gray-800 cursor-pointer';
              icon = '⚠ ';
            }

            return (
              <button
                key={name}
                disabled={!visited || isCurrent}
                onClick={() => visited && !isCurrent && onStepClick(stepNum)}
                title={visited && !valid && !isCurrent ? `Step ${stepNum} has issues` : undefined}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${tabClass}`}
              >
                {icon}{name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-amber-300 mb-1">{title}</h1>
          {subtitle && <p className="text-gray-400 mb-6">{subtitle}</p>}
          {children}
        </div>
      </div>

      {/* Footer nav */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-3 flex justify-between">
        <button
          onClick={onBack}
          disabled={!onBack}
          className="px-5 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          ← Back
        </button>
        {onFinish ? (
          <button
            onClick={onFinish}
            disabled={finishDisabled}
            className="px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            Finish — View Sheet
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={nextDisabled || !onNext}
            className="px-6 py-2 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
          >
            {nextLabel ?? 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}
