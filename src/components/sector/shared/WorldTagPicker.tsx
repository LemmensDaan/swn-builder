import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { SWN_WORLD_TAGS } from '../../../data/world-tags';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function WorldTagPicker({ tags, onChange, placeholder = 'Search world tags…' }: Props) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = SWN_WORLD_TAGS.filter(t =>
    (!input.trim() || t.toLowerCase().includes(input.toLowerCase())) && !tags.includes(t)
  );

  function add(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
    setOpen(false);
  }

  function remove(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  function openPicker() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 items-center min-h-[20px]">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded-full"
          >
            {tag}
            <button
              onClick={() => remove(tag)}
              className="text-amber-700 hover:text-amber-300 transition-colors ml-0.5"
            >
              <X size={9} />
            </button>
          </span>
        ))}
        <button
          onClick={openPicker}
          className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 hover:text-gray-300 border border-dashed border-gray-700 hover:border-gray-500 px-2 py-0.5 rounded-full transition-colors"
        >
          <Plus size={9} /> Tag
        </button>
      </div>
      {open && (
        <div className="relative">
          <input
            ref={inputRef}
            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 outline-none focus:border-amber-700/60"
            placeholder={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onBlur={() => setTimeout(() => { setOpen(false); setInput(''); }, 150)}
            onKeyDown={e => {
              if (e.key === 'Enter') add(input);
              if (e.key === 'Escape') { setOpen(false); setInput(''); }
            }}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-0.5 bg-gray-800 border border-gray-700 rounded shadow-xl overflow-y-auto max-h-48">
              {suggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => add(s)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700/60 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
