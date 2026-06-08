import { useRef, useState } from 'react';
import { BookOpen, Download, FolderOpen, HelpCircle, PersonStanding, Dna, Sparkles, ArrowBigUp, ScrollText, Ghost, ChevronDown, ChevronRight, Navigation, AlertTriangle, Rocket, Zap } from 'lucide-react';
import type { Character } from '../types/character';
import type { Ship } from '../types/ship';
import { HULL_TYPES } from '../data/ships';
import PortraitEditor from './PortraitEditor';
import ItemActions from './ItemActions';

// Side-profile ship silhouette — represents the specific hull model/design
function HullNameIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Main hull body */}
      <path d="M3 12 C3 10 5 9 8 9 L17 9 L21 12 L17 15 L8 15 C5 15 3 14 3 12 Z" />
      {/* Bridge/cockpit */}
      <path d="M10 9 L10 6.5 L14 6.5 L14 9" />
    </svg>
  );
}

// Double chevron — military rank insignia style, represents ship class tier
function HullClassIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="4,17 12,10 20,17" />
      <polyline points="4,11 12,4 20,11" />
    </svg>
  );
}

interface Props {
  characters: Character[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRetire: (id: string) => void;
  onUnretire: (id: string) => void;
  onCopy: (id: string) => void;
  onImageChange: (id: string, dataUrl: string) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onOpenRules: () => void;
  onOpenHelp: () => void;
  ships: Ship[];
  onNewShip: () => void;
  onOpenShip: (id: string) => void;
  onDeleteShip: (id: string) => void;
  onRetireShip: (id: string) => void;
  onUnretireShip: (id: string) => void;
  onCopyShip: (id: string) => void;
  onShipImageChange: (id: string, dataUrl: string) => void;
  initialActiveTab?: 'characters' | 'ships' | 'sector';
  onTabChange: (tab: 'characters' | 'ships' | 'sector') => void;
}

export default function HomeScreen({ characters, onNew, onOpen, onDelete, onRetire, onUnretire, onCopy, onImageChange, onExport, onImport, onOpenRules, onOpenHelp, ships, onNewShip, onOpenShip, onDeleteShip, onRetireShip, onUnretireShip, onCopyShip, onShipImageChange, initialActiveTab = 'characters', onTabChange }: Props) {
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const [importPending, setImportPending] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'characters' | 'ships' | 'sector'>(initialActiveTab);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function confirmImport() {
    if (!importPending) return;
    setImporting(true);
    setImportError(null);
    try {
      await onImport(importPending);
      setImportPending(null);
    } catch {
      setImportError('Invalid backup file. Make sure you selected a valid swn-builder export.');
    } finally {
      setImporting(false);
    }
  }

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
          <div className="flex gap-1 items-center">
            <button
              onClick={onExport}
              title="Export backup (swn-builder-YYYY-MM-DD.json)"
              className="w-9 h-9 rounded text-gray-400 hover:text-emerald-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              title="Import from backup"
              className="w-9 h-9 rounded text-gray-400 hover:text-sky-300 hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <FolderOpen size={18} />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setImportPending(file); setImportError(null); }
                e.target.value = '';
              }}
            />
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <button onClick={onOpenHelp} title="Rules reference & FAQ" className="w-9 h-9 rounded text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors flex items-center justify-center">
              <HelpCircle size={20} />
            </button>
            <button onClick={onOpenRules} title="Open SWN Revised Deluxe Edition rulebook" className="p-2 rounded text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors">
              <BookOpen size={20} />
            </button>
          </div>

          {/* Import confirmation modal */}
          {importPending && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setImportPending(null); setImportError(null); }}>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-100 font-semibold">Import backup?</p>
                    <p className="text-gray-400 text-sm mt-1">
                      This will <span className="text-amber-300 font-medium">replace all current data</span> with the contents of:
                    </p>
                    <p className="text-gray-300 text-sm font-mono mt-1 truncate">{importPending.name}</p>
                  </div>
                </div>
                {importError && (
                  <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                    {importError}
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setImportPending(null); setImportError(null); }}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    <FolderOpen size={14} />
                    {importing ? 'Importing…' : 'Import'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex gap-4 mb-8 border-b border-gray-800 pb-1">
          <Tab label="Characters" active={activeTab === 'characters'} onClick={() => { setActiveTab('characters'); onTabChange('characters'); }} />
          <Tab label="Ships" active={activeTab === 'ships'} onClick={() => { setActiveTab('ships'); onTabChange('ships'); }} />
          <Tab label="Sector" active={activeTab === 'sector'} onClick={() => { setActiveTab('sector'); onTabChange('sector'); }} />
        </div>

        {activeTab === 'characters' && (
          <>
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
          </>
        )}

        {activeTab === 'ships' && (
          <>
            {ships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-xl font-semibold text-gray-300 mb-2">No ships yet</h2>
                <p className="text-gray-500 mb-6 max-w-sm">
                  Commission your first starship for traversing the Mandate's scattered worlds.
                </p>
                <button onClick={onNewShip} className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors">
                  Build Ship
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ships.filter(s => !s.retired).map(ship => (
                    <ShipCard
                      key={ship.id}
                      ship={ship}
                      onOpen={() => onOpenShip(ship.id)}
                      onDelete={() => onDeleteShip(ship.id)}
                      onRetire={() => onRetireShip(ship.id)}
                      onUnretire={() => onUnretireShip(ship.id)}
                      onCopy={() => onCopyShip(ship.id)}
                      onImageChange={dataUrl => onShipImageChange(ship.id, dataUrl)}
                    />
                  ))}
                  <button
                    onClick={onNewShip}
                    className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-amber-700 hover:bg-amber-900/10 transition-colors text-gray-600 hover:text-amber-400"
                  >
                    <span className="text-3xl">+</span>
                    <span className="text-sm font-medium">New Ship</span>
                  </button>
                </div>

                {ships.some(s => s.retired) && (
                  <div className="mt-10">
                    <button
                      onClick={() => setGraveyardOpen(v => !v)}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors mb-4 group"
                    >
                      <Ghost size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                      <span className="text-sm font-medium">Decommissioned Fleet</span>
                      <span className="text-xs text-gray-700 bg-gray-800 px-1.5 py-0.5 rounded-full ml-0.5">{ships.filter(s => s.retired).length}</span>
                      {graveyardOpen ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
                    </button>
                    {graveyardOpen && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ships.filter(s => s.retired).map(ship => (
                          <ShipCard
                            key={ship.id}
                            ship={ship}
                            onOpen={() => onOpenShip(ship.id)}
                            onDelete={() => onDeleteShip(ship.id)}
                            onRetire={() => onRetireShip(ship.id)}
                            onUnretire={() => onUnretireShip(ship.id)}
                            onCopy={() => onCopyShip(ship.id)}
                            onImageChange={dataUrl => onShipImageChange(ship.id, dataUrl)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
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
  const classLabel = char.class === 'Adventurer' && char.adventurerPartials
    ? `Adventurer (${char.adventurerPartials.map(p => p.replace('Partial ', '')).join('/')})`
    : char.class;

  return (
    <div
      onClick={onOpen}
      className="glass-card rounded-xl cursor-pointer transition-all duration-200 hover:border-amber-600/60 hover:bg-gray-800/50 hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5 relative overflow-hidden flex"
    >
      {/* Left: info + actions */}
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
            <Sparkles size={14} className="text-orange-400 flex-shrink-0" />
            <span className="text-sm text-orange-300/80 truncate">{classLabel}</span>
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
        <ItemActions
          itemType="character"
          itemName={char.name}
          retired={char.retired ?? false}
          onDelete={onDelete}
          onRetire={onRetire}
          onUnretire={onUnretire}
          onCopy={onCopy}
        />
      </div>

      {/* Right: portrait editor */}
      <PortraitEditor image={char.image} onImageChange={onImageChange} retired={char.retired} />
    </div>
  );
}

function ShipCard({ ship, onOpen, onDelete, onRetire, onUnretire, onCopy, onImageChange }: {
  ship: Ship;
  onOpen: () => void;
  onDelete: () => void;
  onRetire: () => void;
  onUnretire: () => void;
  onCopy: () => void;
  onImageChange: (dataUrl: string) => void;
}) {
  const hull = HULL_TYPES.find(h => h.id === ship.hullId);
  const hullName = hull?.name ?? ship.hullId;
  const hullClass = hull?.class ?? '—';

  return (
    <div
      onClick={onOpen}
      className="glass-card rounded-xl cursor-pointer transition-all duration-200 hover:border-amber-600/60 hover:bg-gray-800/50 hover:shadow-lg hover:shadow-amber-900/20 hover:-translate-y-0.5 relative overflow-hidden flex"
    >
      {/* Left: info + actions */}
      <div className="flex-1 p-5 flex flex-col min-w-0">
        <div className="space-y-2.5 mb-4 flex-1">
          <div className="flex items-center gap-2.5">
            <Rocket size={15} className="text-amber-400 flex-shrink-0" />
            <span className="font-bold text-gray-100 text-lg leading-tight truncate">{ship.name || '(unnamed)'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <HullNameIcon size={14} className="text-sky-400 flex-shrink-0" />
            <span className="text-sm text-sky-300/80 truncate">{hullName}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <HullClassIcon size={14} className="text-orange-400 flex-shrink-0" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-300 border border-orange-800/40">
              {hullClass}
            </span>
            {hull?.isStation && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-900/30 text-purple-300 border border-purple-800/40">
                Station
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Zap size={14} className="text-emerald-400 flex-shrink-0" />
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-800/50">
              Drive-{ship.driveRating}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Navigation size={14} className="text-violet-400 flex-shrink-0" />
            <span className="text-sm text-violet-300/80 truncate">
              {ship.location || '—'}
            </span>
          </div>
        </div>
        <ItemActions
          itemType="ship"
          itemName={ship.name}
          retired={ship.retired ?? false}
          onDelete={onDelete}
          onRetire={onRetire}
          onUnretire={onUnretire}
          onCopy={onCopy}
        />
      </div>

      {/* Right: portrait editor */}
      <PortraitEditor image={ship.image} onImageChange={onImageChange} retired={ship.retired} />
    </div>
  );
}

function Tab({ label, active, disabled, onClick }: { label: string; active: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
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
