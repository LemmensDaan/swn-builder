import { useRef, useState } from 'react';
import { BookOpen, Camera, HelpCircle, Trash2, PersonStanding, Dna, Sparkles, ArrowBigUp, ScrollText, Skull, Ghost, ChevronDown, ChevronRight, HeartPulse, Copy } from 'lucide-react';
import type { Character } from '../types/character';

interface Props {
  characters: Character[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRetire: (id: string) => void;
  onUnretire: (id: string) => void;
  onCopy: (id: string) => void;
  onImageChange: (id: string, dataUrl: string) => void;
  onOpenRules: () => void;
  onOpenHelp: () => void;
}

export default function HomeScreen({ characters, onNew, onOpen, onDelete, onRetire, onUnretire, onCopy, onImageChange, onOpenRules, onOpenHelp }: Props) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);

  const activeChars = characters.filter(c => !c.retired);
  const retiredChars = characters.filter(c => c.retired);

  return (
    <div className="min-h-screen bg-gray-950/50 text-gray-100 flex flex-col">
      <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-400">Stars Without Number</h1>
            <p className="text-xs text-gray-500">Revised Deluxe Edition — Character & Ship Builder</p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={onOpenHelp} title="Rules reference & FAQ" className="w-9 h-9 rounded text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center">
              <HelpCircle size={20} />
            </button>
            <button onClick={onOpenRules} title="Open SWN Revised Deluxe Edition rulebook" className="p-2 rounded text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors">
              <BookOpen size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
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
            <button onClick={onNew} className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
              Create Character
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeChars.map(char => (
                <CharacterCard
                  key={char.id}
                  char={char}
                  onOpen={() => onOpen(char.id)}
                  onDelete={() => onDelete(char.id)}
                  onRetire={() => onRetire(char.id)}
                  onUnretire={() => onUnretire(char.id)}
                  onCopy={() => onCopy(char.id)}
                  onImageChange={dataUrl => onImageChange(char.id, dataUrl)}
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

            {retiredChars.length > 0 && (
              <div className="mt-10">
                <button
                  onClick={() => setGraveyardOpen(v => !v)}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-4 group"
                >
                  <Ghost size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                  <span className="text-sm font-medium">Graveyard</span>
                  <span className="text-xs text-gray-700 bg-gray-800 px-1.5 py-0.5 rounded-full ml-0.5">{retiredChars.length}</span>
                  {graveyardOpen ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
                </button>
                {graveyardOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {retiredChars.map(char => (
                      <CharacterCard
                        key={char.id}
                        char={char}
                        onOpen={() => onOpen(char.id)}
                        onDelete={() => onDelete(char.id)}
                        onRetire={() => onRetire(char.id)}
                        onUnretire={() => onUnretire(char.id)}
                        onCopy={() => onCopy(char.id)}
                        onImageChange={dataUrl => onImageChange(char.id, dataUrl)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Output dimensions for the saved portrait
const CROP_W = 240;
const CROP_H = 320;

interface PendingPortrait {
  src: string;
  naturalW: number;
  naturalH: number;
  /** Cover scale: factor applied so image fills CROP_W×CROP_H */
  scale: number;
  /** Scaled display size */
  dispW: number;
  dispH: number;
}

function CharacterCard({ char, onOpen, onDelete, onRetire, onUnretire, onCopy, onImageChange }: {
  char: Character;
  onOpen: () => void;
  onDelete: () => void;
  onRetire: () => void;
  onUnretire: () => void;
  onCopy: () => void;
  onImageChange: (dataUrl: string) => void;
}) {
  const [confirmAction, setConfirmAction] = useState<'delete' | 'retire' | null>(null);
  const [pending, setPending] = useState<PendingPortrait | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const classLabel = char.class === 'Adventurer' && char.adventurerPartials
    ? `Adventurer (${char.adventurerPartials.map(p => p.replace('Partial ', '')).join('/')})`
    : char.class;

  function clamp(x: number, y: number, dispW: number, dispH: number) {
    return {
      x: Math.min(0, Math.max(x, CROP_W - dispW)),
      y: Math.min(0, Math.max(y, CROP_H - dispH)),
    };
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const src = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = ev => res(ev.target!.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const scale = Math.max(CROP_W / img.naturalWidth, CROP_H / img.naturalHeight);
    const dispW = img.naturalWidth * scale;
    const dispH = img.naturalHeight * scale;
    setPending({ src, naturalW: img.naturalWidth, naturalH: img.naturalHeight, scale, dispW, dispH });
    setOffset({ x: (CROP_W - dispW) / 2, y: (CROP_H - dispH) / 2 });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !pending) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp(dragRef.current.offX + dx, dragRef.current.offY + dy, pending.dispW, pending.dispH));
  }

  function onPointerUp() {
    dragRef.current = null;
    setIsDragging(false);
  }

  function confirmPortrait() {
    if (!pending) return;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_W;
    canvas.height = CROP_H;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = pending.src;
    // offset is where the scaled image starts in the crop frame, so source rect:
    const srcX = -offset.x / pending.scale;
    const srcY = -offset.y / pending.scale;
    const srcW = CROP_W / pending.scale;
    const srcH = CROP_H / pending.scale;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, CROP_W, CROP_H);
    onImageChange(canvas.toDataURL('image/jpeg', 0.85));
    setPending(null);
  }

  return (
    <>
      <div
        onClick={onOpen}
        className="glass-card rounded-xl cursor-pointer transition-all duration-200 hover:border-amber-600/60 hover:bg-gray-800/50 hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5 relative overflow-hidden flex"
      >
        {/* Left: props + actions */}
        <div className="flex-1 p-5 flex flex-col min-w-0">
          <div className="space-y-2.5 mb-4 flex-1">
            <div className="flex items-center gap-2.5">
              <PersonStanding size={15} className="text-amber-400 flex-shrink-0" />
              <span className="font-bold text-gray-100 text-lg leading-tight truncate">{char.name || '(unnamed)'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Dna size={14} className="text-sky-400 flex-shrink-0" />
              <span className="text-sm text-sky-300/80 truncate">{char.species || 'Human'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-sm text-amber-300/80 truncate">{classLabel}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ArrowBigUp size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">
                Level {char.level}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <ScrollText size={14} className="text-violet-400 flex-shrink-0" />
              <span className="text-sm text-violet-300/80 truncate">{char.background || '—'}</span>
            </div>
          </div>

          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            {char.retired ? (
              <button onClick={onUnretire} className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-emerald-900/50 text-gray-400 hover:text-emerald-300 transition-colors flex items-center" title="Unretire">
                <HeartPulse size={14} />
              </button>
            ) : (
              <button onClick={() => setConfirmAction('retire')} className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-amber-300 transition-colors flex items-center" title="Retire">
                <Skull size={14} />
              </button>
            )}
            <button onClick={onCopy} className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-sky-300 transition-colors flex items-center" title="Duplicate">
              <Copy size={14} />
            </button>
            <div className="flex-1" />
            <button onClick={() => setConfirmAction('delete')} className="px-2.5 py-1.5 rounded bg-gray-700 hover:bg-red-900/60 text-red-500 hover:text-red-400 transition-colors flex items-center" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Right: portrait */}
        <div
          className="relative w-28 flex-shrink-0 border-l border-gray-700/50 group/img"
          onClick={e => e.stopPropagation()}
        >
          {char.image ? (
            <img src={char.image} alt="portrait" className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/30 gap-2">
              <PersonStanding size={40} className="text-gray-700" />
              <span className="text-[10px] text-gray-700 uppercase tracking-wide">No portrait</span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-end pb-3 gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent cursor-pointer"
            title="Upload portrait"
          >
            <Camera size={14} className="text-gray-300" />
            <span className="text-[10px] text-gray-300 font-medium">Upload</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {char.retired && (
            <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
              <span className="flex items-center gap-1 bg-gray-900/90 text-gray-400 text-[10px] px-2 py-0.5 rounded-full border border-gray-700">
                <Skull size={10} /> Retired
              </span>
            </div>
          )}
        </div>

        {/* Confirm overlay */}
        {confirmAction && (
          <div className="absolute inset-0 bg-gray-950/95 rounded-xl flex flex-col items-center justify-center gap-4 p-5 z-10" onClick={e => e.stopPropagation()}>
            {confirmAction === 'delete' ? (
              <>
                <p className="text-gray-200 font-semibold text-center">Delete <span className="text-amber-300">{char.name || 'this character'}</span>?</p>
                <p className="text-gray-500 text-xs text-center">This cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">Keep</button>
                  <button onClick={onDelete} className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-semibold">Delete</button>
                </div>
              </>
            ) : (
              <>
                <Skull size={28} className="text-amber-400" />
                <p className="text-gray-200 font-semibold text-center">Retire <span className="text-amber-300">{char.name || 'this character'}</span>?</p>
                <p className="text-gray-500 text-xs text-center">Mark as dead or retired. They'll rest in the Graveyard.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium">Keep</button>
                  <button onClick={onRetire} className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold flex items-center gap-2">
                    <Skull size={14} /> Retire
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Portrait positioning modal — rendered outside the overflow-hidden card */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPending(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="text-gray-100 font-semibold text-sm">Position portrait</p>
              <p className="text-gray-500 text-xs mt-0.5">Drag to reposition, then save</p>
            </div>

            {/* Crop preview */}
            <div
              style={{ width: CROP_W, height: CROP_H }}
              className={`relative overflow-hidden rounded-lg border border-gray-700 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <img
                src={pending.src}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: pending.dispW,
                  height: pending.dispH,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
              {/* Rule-of-thirds grid overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPortrait}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
              >
                Save Portrait
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tab({ label, active, disabled }: { label: string; active: boolean; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-amber-500 text-amber-300'
        : disabled ? 'border-transparent text-gray-700 cursor-not-allowed'
        : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
      {disabled && <span className="ml-1 text-xs text-gray-700">(soon)</span>}
    </button>
  );
}
