import { useState } from 'react';
import { Copy, HeartPulse, Skull, Trash2 } from 'lucide-react';

type ItemType = 'character' | 'ship';

interface Props {
  itemType: ItemType;
  itemName: string;
  retired: boolean;
  onDelete: () => void;
  onRetire: () => void;
  onUnretire: () => void;
  onCopy?: () => void;
}

export default function ItemActions({
  itemType,
  itemName,
  retired,
  onDelete,
  onRetire,
  onUnretire,
  onCopy,
}: Props) {
  const [confirmAction, setConfirmAction] = useState<'delete' | 'retire' | null>(null);

  const displayName = itemName || `this ${itemType}`;
  const retireLabel = itemType === 'character' ? 'Graveyard' : 'Retired';

  return (
    <>
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        {retired ? (
          <button
            onClick={onUnretire}
            className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-emerald-900/50 text-gray-400 hover:text-emerald-300 transition-colors flex items-center"
            title={`Unretire ${itemType}`}
          >
            <HeartPulse size={14} />
          </button>
        ) : (
          <button
            onClick={() => setConfirmAction('retire')}
            className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-amber-300 transition-colors flex items-center"
            title={`Retire ${itemType}`}
          >
            <Skull size={14} />
          </button>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-sky-300 transition-colors flex items-center"
            title={`Duplicate ${itemType}`}
          >
            <Copy size={14} />
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setConfirmAction('delete')}
          className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-red-900/60 text-red-500 hover:text-red-400 transition-colors flex items-center"
          title={`Delete ${itemType}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {confirmAction && (
        <div
          className="absolute inset-0 bg-gray-950/95 rounded-xl flex flex-col items-center justify-center gap-4 p-5 z-10"
          onClick={e => e.stopPropagation()}
        >
          {confirmAction === 'delete' ? (
            <>
              <p className="text-gray-200 font-semibold text-center">
                Delete <span className="text-amber-300">{displayName}</span>?
              </p>
              <p className="text-gray-500 text-xs text-center">This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium"
                >
                  Keep
                </button>
                <button
                  onClick={onDelete}
                  className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <>
              <Skull size={28} className="text-amber-400" />
              <p className="text-gray-200 font-semibold text-center">
                Retire <span className="text-amber-300">{displayName}</span>?
              </p>
              <p className="text-gray-500 text-xs text-center">
                Mark as dead or retired. {itemType === 'character' ? "They'll rest in the Graveyard" : `It'll rest in ${retireLabel}`}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium"
                >
                  Keep
                </button>
                <button
                  onClick={onRetire}
                  className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold flex items-center gap-2"
                >
                  <Skull size={14} /> Retire
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
