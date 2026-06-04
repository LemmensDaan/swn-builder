import type { ReactNode } from 'react';
import { BookOpen, HelpCircle } from 'lucide-react';

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
  maxVisited: number;
  onStepClick: (s: number) => void;
  stepValidity: boolean[];
  onOpenRules: () => void;
  onOpenHelp: () => void;
  onExit: () => void;
  onSave: () => void;
  canSave: boolean;
  isEditing: boolean;
}

const STEP_NAMES = [
  'Concept', 'Attributes', 'Background', 'Skills', 'Class', 'Foci', 'Psychics', 'Equipment', 'Review',
];

export default function WizardLayout({
  step, totalSteps, title, subtitle, children,
  onBack, onNext, onFinish, finishDisabled, nextLabel, nextDisabled,
  maxVisited, onStepClick, stepValidity, onOpenRules, onOpenHelp,
  onExit, onSave, canSave, isEditing,
}: Props) {
  const pct = Math.round((step / totalSteps) * 100);

  return (
    // Outer wrapper: transparent so background image shows on the sides
    <div className="min-h-screen text-gray-100 flex justify-center">

      {/* Solid wizard column — image visible in gutters left and right */}
      <div className="w-full max-w-5xl flex flex-col min-h-screen bg-gray-950 overflow-x-hidden">

        {/* Header — solid */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-4 flex-shrink-0">
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
          <button
            onClick={onOpenHelp}
            title="Rules reference & FAQ"
            className="w-8 h-8 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={onOpenRules}
            title="Open SWN Revised Deluxe Edition rulebook"
            className="p-1.5 rounded text-gray-500 hover:text-amber-300 hover:bg-gray-700 transition-colors"
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            title={canSave ? 'Save and view sheet' : 'Resolve validation errors first (see Review step)'}
            className="px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            {isEditing ? 'Save' : 'Save & View'}
          </button>
          <button
            onClick={onExit}
            title="Exit the wizard"
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-red-900/60 text-gray-300 hover:text-red-300 text-xs font-medium transition-colors"
          >
            Exit
          </button>
        </div>

        {/* Step tabs — solid */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 overflow-x-auto flex-shrink-0">
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

        {/* Content — solid dark, overflow-x hidden to prevent horizontal scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-950">
          <div className="max-w-4xl mx-auto px-4 py-8 min-w-0">
            <h1 className="text-2xl font-bold text-amber-300 mb-1">{title}</h1>
            {subtitle && <p className="text-gray-400 mb-6">{subtitle}</p>}
            {children}
          </div>
        </div>

        {/* Footer — solid */}
        <div className="bg-gray-900 border-t border-gray-700 px-4 py-3 flex justify-between flex-shrink-0">
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
    </div>
  );
}
