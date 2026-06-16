import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TimelineEvent, Faction } from '../../../types/sector';
import TimelineEditor from './TimelineEditor';
import WorldTagPicker from './WorldTagPicker';

interface Props {
  id: string;
  title: string;
  borderColor: string;
  factionId: string | null;
  factions: Faction[];
  tags: string[];
  notes: string;
  events: TimelineEvent[];
  isExpanded: boolean;
  onExpandChange: (id: string | null) => void;
  onFactionChange: (factionId: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onNotesChange: (notes: string) => void;
  onTimelineChange: (events: TimelineEvent[]) => void;
}

export default function CollapsableStoryCard({
  id,
  title,
  borderColor,
  factionId,
  factions,
  tags,
  notes,
  events,
  isExpanded,
  onExpandChange,
  onFactionChange,
  onTagsChange,
  onNotesChange,
  onTimelineChange,
}: Props) {
  const [addingHistory, setAddingHistory] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      setAddingHistory(false);
    }
  }, [isExpanded]);

  const hasFaction = factionId !== null && factionId !== '';
  const hasTags = Array.isArray(tags) && tags.length > 0;
  const hasNotes = typeof notes === 'string' && notes.trim().length > 0;
  const hasHistory = Array.isArray(events) && events.length > 0;
  const hasAnyContent = hasFaction || hasTags || hasNotes || hasHistory;

  return (
    <div
      className="rounded-lg border border-gray-700/50 bg-gray-800/30 overflow-hidden transition-colors hover:bg-gray-800/50 w-full"
      style={{
        borderLeft: `3px ${hasAnyContent ? 'solid' : 'dashed'} ${borderColor}`,
      }}
    >
      <button
        onClick={() => onExpandChange(isExpanded ? null : id)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-300">{title}</p>
          {!isExpanded && hasAnyContent && (
            <div className="flex gap-2 mt-1 text-[10px] text-gray-600">
              {hasFaction && factionId && <span>⬤ faction</span>}
              {hasTags && <span>● tags</span>}
              {hasNotes && <span>● notes</span>}
              {hasHistory && <span>● history</span>}
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700/50 px-4 py-3 space-y-3">
          {/* Faction */}
          {factions.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Faction</p>
              <div className="flex items-center gap-2">
                {factionId && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-600"
                    style={{ background: factions.find(f => f.id === factionId)?.color ?? '#888' }}
                  />
                )}
                <select
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-2 py-1.5 text-xs text-gray-200 outline-none cursor-pointer hover:border-gray-600 focus:border-gray-500 transition-colors"
                  value={factionId ?? ''}
                  onChange={e => onFactionChange(e.target.value || null)}
                >
                  <option value="">— None —</option>
                  {factions.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Tags</p>
            <WorldTagPicker
              tags={tags ?? []}
              onChange={onTagsChange}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">Notes</p>
            <textarea
              rows={2}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-600 outline-none resize-none focus:border-gray-500 transition-colors"
              value={notes ?? ''}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Notes…"
            />
          </div>

          {/* Timeline */}
          <div className="border-t border-gray-700/30 pt-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 font-semibold">History</p>
            {hasHistory && !addingHistory ? (
              <div className="space-y-2">
                <TimelineEditor
                  events={(events ?? []).filter(e => e !== null && e !== undefined)}
                  onChange={() => {}}
                  compact={true}
                />
                <button
                  onClick={() => setAddingHistory(true)}
                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 border border-dashed border-gray-700/50 rounded transition-colors"
                >
                  + Edit history
                </button>
              </div>
            ) : addingHistory ? (
              <TimelineEditor
                events={(events ?? []).filter(e => e !== null && e !== undefined)}
                onChange={timeline => {
                  onTimelineChange(timeline.filter(e => e !== null && e !== undefined));
                }}
                compact={false}
              />
            ) : (
              <button
                onClick={() => setAddingHistory(true)}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 border border-dashed border-gray-700/50 rounded transition-colors"
              >
                + Add history
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
