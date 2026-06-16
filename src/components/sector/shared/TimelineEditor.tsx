import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { TimelineEvent } from '../../../types/sector';

interface Props {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
  compact?: boolean;   // compact read-only view for the 3D info panel
}

export default function TimelineEditor({ events, onChange, compact = false }: Props) {
  const [dateInput, setDateInput] = useState('');
  const [titleInput, setTitleInput] = useState('');

  function addEvent() {
    const trimmed = titleInput.trim();
    if (!trimmed) return;
    const event: TimelineEvent = {
      id: crypto.randomUUID(),
      date: dateInput.trim(),
      title: trimmed,
    };
    onChange([event, ...events]);
    setDateInput('');
    setTitleInput('');
  }

  function removeEvent(id: string) {
    onChange(events.filter(e => e.id !== id));
  }

  const displayed = compact ? events.slice(0, 5) : events;

  return (
    <div className="space-y-3">
      {/* Add form — only in edit mode */}
      {!compact && (
        <div className="space-y-1.5 pb-1">
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-amber-700/60 placeholder:text-gray-600"
            placeholder='Date or era — "Session 14", "3200 CY", "Before the Scream"'
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') titleInput.trim() ? addEvent() : undefined; }}
          />
          <div className="flex gap-1.5">
            <input
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 outline-none focus:border-amber-700/60 placeholder:text-gray-600"
              placeholder="What happened?"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addEvent(); }}
            />
            <button
              onClick={addEvent}
              disabled={!titleInput.trim()}
              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <p className={`italic text-gray-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          No events yet
        </p>
      ) : (
        <div>
          {displayed.map((event, i) => (
            <div key={event.id} className="flex gap-2.5">
              {/* Dot + vertical line */}
              <div className="flex flex-col items-center pt-[5px]">
                <div className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
                {i < displayed.length - 1 && (
                  <div className="w-px bg-gray-700 flex-1 mt-1.5 min-h-[14px]" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${i < displayed.length - 1 ? 'pb-3' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {event.date && (
                      <span className={`font-mono text-amber-600/90 leading-tight block ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                        {event.date}
                      </span>
                    )}
                    <p className={`text-gray-300 leading-snug ${compact ? 'text-[10px]' : 'text-xs'} ${event.date ? 'mt-0.5' : ''}`}>
                      {event.title}
                    </p>
                  </div>
                  {!compact && (
                    <button
                      onClick={() => removeEvent(event.id)}
                      className="px-2 py-1 rounded bg-red-950/40 border border-red-800/50 text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-colors flex-shrink-0 mt-0.5"
                      title="Delete event"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {compact && events.length > 5 && (
            <p className="text-[9px] text-gray-600 pl-[18px] mt-1">
              +{events.length - 5} more events
            </p>
          )}
        </div>
      )}
    </div>
  );
}
