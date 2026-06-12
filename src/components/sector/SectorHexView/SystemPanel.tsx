import { useState } from 'react';
import { X, Plus, Eye, Trash2, Shuffle } from 'lucide-react';
import type { StarSystem, SystemObject, ObjectType, SystemType } from '../../../types/sector';
import { sortSystemObjects, getPrimaryObjectTypes } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';
import { randomizeSystem } from '../SystemViewer/systemRandomizer';
import ObjectEditor from './ObjectEditor';

const SYSTEM_TYPES: SystemType[] = ['Standard', 'Binary', 'Hostile', 'Rich', 'Dead', 'Frontier'];

const QUICK_TYPES: { type: ObjectType; label: string; extra?: Partial<SystemObject> }[] = [
  { type: 'Star',         label: 'Star'        },
  { type: 'NeutronStar',  label: 'Neutron Star'},
  { type: 'Planet',       label: 'Planet'      },
  { type: 'GasGiant',     label: 'Gas Giant'   },
  { type: 'Moon',         label: 'Moon'        },
  { type: 'AsteroidBelt', label: 'Belt'        },
  { type: 'Comet',        label: 'Comet'       },
  { type: 'SpaceStation', label: 'Station'     },
  { type: 'JumpGate',     label: 'Gate'        },
  { type: 'BlackHole',    label: 'Black Hole'  },
  { type: 'Nebula',       label: 'Nebula',     extra: { isDeepSpace: true } },
  { type: 'Other',        label: 'Other'       },
];

const OBJECT_TYPE_COLORS: Record<ObjectType, string> = {
  Star:        '#FFF4C2',
  NeutronStar: '#A0CFFF',
  BlackHole:   '#ff7828',
  Planet:      '#4E9AF1',
  GasGiant:    '#D4924A',
  Moon:        '#9E9E9E',
  AsteroidBelt:'#8C7B6B',
  SpaceStation:'#B0C4DE',
  JumpGate:    '#00FFCC',
  Comet:       '#E8F4F8',
  Other:       '#888888',
  Nebula:      '#9b0d7c',
};

const DEEP_ORBIT_BASE    = 80;
const DEEP_ORBIT_SPACING = 15;

// Orbit radius increments when placing a reparented object
const TL_BASE_ORBIT    = 8;
const TL_SPACING       = 10;
const CHILD_BASE_ORBIT = 1.5;
const CHILD_SPACING    = 0.8;

// Only these types may orbit an asteroid belt
const BELT_ALLOWED_TYPES = new Set<ObjectType>(['SpaceStation', 'JumpGate', 'Other']);

interface Props {
  system: StarSystem;
  sectorId: string;
  onClose: () => void;
  onViewSystem: () => void;
  onDeleteSystem: () => void;
}

type DragPayload = { kind: 'tl' | 'child'; objId: string };

export default function SystemPanel({ system, sectorId: _sectorId, onClose, onViewSystem, onDeleteSystem }: Props) {
  const { updateSystem, addObject, updateObject, removeObject, reorderObjects } = useSectorStore();
  const [addingType, setAddingType] = useState(false);
  const [systemType, setSystemType] = useState<SystemType>('Standard');

  function handleRandomize() {
    const newObjects = randomizeSystem(systemType);
    system.objects.forEach(o => removeObject(system.id, o.id));
    newObjects.forEach(o => addObject(system.id, o));
  }

  // ── Derived structure ────────────────────────────────────────────────────

  const sorted = sortSystemObjects(system.objects);
  const primaryTypes = getPrimaryObjectTypes();
  const primaryObjs = sorted.filter(o => primaryTypes.has(o.type));
  const primaryIds = new Set(primaryObjs.map(o => o.id));

  // parentId to assign when making an object orbit the star
  const defaultTLParentId: string | null = primaryObjs.length === 1 ? primaryObjs[0].id : null;

  const isTopLevelNonPrimary = (o: SystemObject) =>
    !primaryTypes.has(o.type) && (o.parentId === null || primaryIds.has(o.parentId ?? ''));

  const topLevelNonPrimary = sorted.filter(isTopLevelNonPrimary);

  // Map each non-primary id → its direct children (pre-sorted by sortOrder)
  const childrenOf = new Map<string, SystemObject[]>();
  sorted.forEach(o => {
    if (primaryTypes.has(o.type) || isTopLevelNonPrimary(o)) return;
    const pid = o.parentId;
    if (!pid) return;
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid)!.push(o);
  });

  // ── Drag helpers ─────────────────────────────────────────────────────────

  /** Build the flat sortOrder list: primaries, then each TL with all its descendants. */
  function buildAllIds(
    tlOrder: SystemObject[],
    cMap: Map<string, SystemObject[]>
  ): string[] {
    const result: string[] = primaryObjs.map(o => o.id);
    function appendDesc(id: string) {
      result.push(id);
      (cMap.get(id) ?? []).forEach(c => appendDesc(c.id));
    }
    tlOrder.forEach(o => appendDesc(o.id));
    return result;
  }

  /** Reorder top-level objects and redistribute orbit radii within each zone independently. */
  function reorderTopLevel(fromTlIdx: number, toTlIdx: number) {
    const tlIds = topLevelNonPrimary.map(o => o.id);
    const [moved] = tlIds.splice(fromTlIdx, 1);
    tlIds.splice(toTlIdx, 0, moved);

    const newTLOrder = tlIds.map(id => topLevelNonPrimary.find(o => o.id === id)!);

    // Keep system-zone and deep-zone orbit radii separate so they never cross the boundary.
    const perObjectUpdates: Record<string, Partial<SystemObject>> = {};
    for (const isDeep of [false, true]) {
      const zoneObjs = newTLOrder.filter(o => !!o.isDeepSpace === isDeep);
      const sortedRadii = zoneObjs.map(o => o.orbitRadius).sort((a, b) => a - b);
      zoneObjs.forEach((o, i) => { perObjectUpdates[o.id] = { orbitRadius: sortedRadii[i] }; });
    }

    reorderObjects(system.id, buildAllIds(newTLOrder, childrenOf), perObjectUpdates);
  }

  /** Move an object to the system or deep-space zone, assigning a new orbit radius. */
  function moveToZone(obj: SystemObject, toDeep: boolean) {
    const others = topLevelNonPrimary.filter(o => o.id !== obj.id);
    const zoneObjs = others.filter(o => !!o.isDeepSpace === toDeep);
    const newOrbitRadius = zoneObjs.length > 0
      ? Math.max(...zoneObjs.map(o => o.orbitRadius)) + (toDeep ? DEEP_ORBIT_SPACING : TL_SPACING)
      : toDeep ? DEEP_ORBIT_BASE : TL_BASE_ORBIT;

    // Place obj at the end of its new zone in the sorted order.
    const sysObjs  = others.filter(o => !o.isDeepSpace);
    const deepObjs = others.filter(o => o.isDeepSpace);
    const newTLOrder = toDeep
      ? [...sysObjs, ...deepObjs, obj]
      : [...sysObjs, obj, ...deepObjs];

    reorderObjects(
      system.id,
      buildAllIds(newTLOrder, childrenOf),
      { [obj.id]: { isDeepSpace: toDeep, orbitRadius: newOrbitRadius } }
    );
  }

  /** Reorder siblings within the same parent, redistributing their orbit radii. */
  function reorderSiblings(draggedObj: SystemObject, targetObj: SystemObject) {
    const siblings = childrenOf.get(draggedObj.parentId!) ?? [];
    const fromIdx = siblings.findIndex(s => s.id === draggedObj.id);
    const toIdx   = siblings.findIndex(s => s.id === targetObj.id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const newSibIds = siblings.map(s => s.id);
    const [moved] = newSibIds.splice(fromIdx, 1);
    newSibIds.splice(toIdx, 0, moved);

    const newSibOrder = newSibIds.map(id => siblings.find(s => s.id === id)!);
    const newCMap = new Map(childrenOf);
    newCMap.set(draggedObj.parentId!, newSibOrder);

    const sortedRadii = newSibOrder.map(s => s.orbitRadius).sort((a, b) => a - b);
    const perObjectUpdates: Record<string, Partial<SystemObject>> = {};
    newSibOrder.forEach((sib, i) => { perObjectUpdates[sib.id] = { orbitRadius: sortedRadii[i] }; });

    reorderObjects(system.id, buildAllIds(topLevelNonPrimary, newCMap), perObjectUpdates);
  }

  /**
   * Move obj to a new parent (or to top-level when newParentId is a primary or null).
   * Assigns a sensible orbit radius and updates the full sorted order atomically.
   */
  function reparentTo(obj: SystemObject, newParentId: string | null) {
    const wasTopLevel  = isTopLevelNonPrimary(obj);
    const willBeTopLevel = newParentId === null || primaryIds.has(newParentId ?? '');

    // New TL order
    const newTLOrder = wasTopLevel
      ? topLevelNonPrimary.filter(o => o.id !== obj.id)
      : [...topLevelNonPrimary];
    if (willBeTopLevel) newTLOrder.push(obj);

    // New children map: remove from old parent, add to new
    const newCMap = new Map<string, SystemObject[]>();
    childrenOf.forEach((children, pid) => {
      newCMap.set(pid, children.filter(c => c.id !== obj.id));
    });
    if (!willBeTopLevel && newParentId) {
      const existing = newCMap.get(newParentId) ?? [];
      newCMap.set(newParentId, [...existing, obj]);
    }

    // Compute new orbit radius for the moved object
    let newOrbitRadius: number;
    if (willBeTopLevel) {
      const otherRadii = newTLOrder.filter(o => o.id !== obj.id).map(o => o.orbitRadius);
      newOrbitRadius = otherRadii.length > 0
        ? Math.max(...otherRadii) + TL_SPACING
        : TL_BASE_ORBIT;
    } else {
      const newParentObj = sorted.find(o => o.id === newParentId);
      if (newParentObj?.type === 'AsteroidBelt') {
        // Objects in a belt orbit at the belt's own radius and inclination so they
        // appear embedded in the field rather than as a child offset from its center.
        newOrbitRadius = newParentObj.orbitRadius;
      } else {
        const newSiblings = (newCMap.get(newParentId!) ?? []).filter(c => c.id !== obj.id);
        newOrbitRadius = newSiblings.length > 0
          ? Math.max(...newSiblings.map(s => s.orbitRadius)) + CHILD_SPACING
          : CHILD_BASE_ORBIT;
      }
    }

    const extraUpdates: Partial<SystemObject> =
      (() => {
        const newParentObj = !willBeTopLevel ? sorted.find(o => o.id === newParentId) : undefined;
        return newParentObj?.type === 'AsteroidBelt'
          ? { inclination: newParentObj.inclination }
          : {};
      })();

    reorderObjects(
      system.id,
      buildAllIds(newTLOrder, newCMap),
      { [obj.id]: { parentId: newParentId, orbitRadius: newOrbitRadius, ...extraUpdates } }
    );
  }

  // ── Unified drop handler ─────────────────────────────────────────────────

  function onDragStart(e: React.DragEvent, obj: SystemObject) {
    const kind: DragPayload['kind'] = isTopLevelNonPrimary(obj) ? 'tl' : 'child';
    e.dataTransfer.setData('swn-drag', JSON.stringify({ kind, objId: obj.id } satisfies DragPayload));
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    // Clone into body so the drag ghost isn't affected by the scrolled container's offset
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${rect.width}px;margin:0;pointer-events:none`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  function onDrop(e: React.DragEvent, targetObj: SystemObject) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('swn-drag');
    if (!raw) return;
    let payload: DragPayload;
    try { payload = JSON.parse(raw); } catch { return; }

    const dragged = sorted.find(o => o.id === payload.objId);
    if (!dragged || dragged.id === targetObj.id) return;
    if (dragged.type === 'Nebula') return;

    const targetIsPrimary = primaryTypes.has(targetObj.type);
    const targetIsTL      = isTopLevelNonPrimary(targetObj);

    if (payload.kind === 'tl') {
      if (targetIsPrimary) return;
      if (targetIsTL) {
        // Dropping a belt-compatible type onto an asteroid belt embeds it in the belt
        if (targetObj.type === 'AsteroidBelt' && BELT_ALLOWED_TYPES.has(dragged.type)) {
          reparentTo(dragged, targetObj.id);
        } else if (!!dragged.isDeepSpace !== !!targetObj.isDeepSpace) {
          // Cross-zone drop: move to the target's zone
          moveToZone(dragged, !!targetObj.isDeepSpace);
        } else {
          const fromTlIdx = topLevelNonPrimary.findIndex(o => o.id === dragged.id);
          const toTlIdx   = topLevelNonPrimary.findIndex(o => o.id === targetObj.id);
          reorderTopLevel(fromTlIdx, toTlIdx);
        }
      } else {
        // TL dropped onto a child → reparent TL under that child's parent
        if (wouldBeInBelt(targetObj.parentId) && !BELT_ALLOWED_TYPES.has(dragged.type)) return;
        reparentTo(dragged, targetObj.parentId);
      }
      return;
    }

    // Resolve the belt the drop would end up in (if any) and validate the type
    const wouldBeInBelt = (parentId: string | null | undefined) => {
      const parent = parentId ? sorted.find(o => o.id === parentId) : undefined;
      return parent?.type === 'AsteroidBelt';
    };

    // kind === 'child'
    if (targetIsPrimary) {
      reparentTo(dragged, defaultTLParentId); // orbit star
    } else if (targetIsTL) {
      if (targetObj.type === 'AsteroidBelt' && !BELT_ALLOWED_TYPES.has(dragged.type)) return;
      reparentTo(dragged, targetObj.id);      // orbit this planet / belt
    } else if (dragged.parentId === targetObj.parentId) {
      reorderSiblings(dragged, targetObj);    // swap within same parent
    } else {
      // Moving to a different parent's group — validate if that parent is a belt
      if (wouldBeInBelt(targetObj.parentId) && !BELT_ALLOWED_TYPES.has(dragged.type)) return;
      reparentTo(dragged, targetObj.parentId);
    }
  }

  // ── Recursive child renderer ─────────────────────────────────────────────

  function renderDescendants(parentId: string): React.ReactNode {
    const children = childrenOf.get(parentId) ?? [];
    if (children.length === 0) return null;
    return (
      <div className="ml-3 border-l-2 border-gray-700/30 mt-1 space-y-1 pb-0.5">
        {children.map(child => (
          <div key={child.id}>
            <div
              draggable
              onDragStart={e => onDragStart(e, child)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, child)}
              className="pl-2 cursor-grab active:cursor-grabbing"
            >
              <ObjectEditor
                obj={child}
                allObjects={system.objects}
                onChange={updates => updateObject(system.id, child.id, updates)}
                onRemove={() => removeObject(system.id, child.id)}
                draggable={true}
              />
            </div>
            {renderDescendants(child.id)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur border-l border-gray-700/60">
      {/* Header row 1: name + close */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <input
          className="flex-1 bg-transparent text-base font-bold text-amber-300 placeholder:text-gray-600 outline-none border-b border-transparent focus:border-amber-600 transition-colors"
          value={system.name}
          onChange={e => updateSystem(system.id, { name: e.target.value })}
          placeholder="System name"
        />
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      {/* Header row 2: actions */}
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-gray-700/60">
        <button
          onClick={onViewSystem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-200 text-xs font-medium transition-colors flex-shrink-0"
        >
          <Eye size={13} />
          View 3D
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[9px] text-gray-600 font-medium uppercase tracking-wider">Randomize</span>
          <select
            value={systemType}
            onChange={e => setSystemType(e.target.value as SystemType)}
            className="text-[10px] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300 outline-none hover:border-gray-600 transition-colors"
            title="Select system archetype, then click shuffle to randomize"
          >
            {SYSTEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={handleRandomize}
            title="Randomize system with selected type"
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-amber-300 transition-colors"
          >
            <Shuffle size={13} />
          </button>
        </div>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 min-h-0">
        {sorted.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-6">No objects yet. Add one below.</p>
        )}

        {/* Primary objects — accept drops but not draggable */}
        {primaryObjs.map(obj => (
          <div
            key={obj.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, obj)}
            title="Drop here to make an object orbit the star"
          >
            <ObjectEditor
              obj={obj}
              allObjects={system.objects}
              onChange={updates => updateObject(system.id, obj.id, updates)}
              onRemove={() => removeObject(system.id, obj.id)}
              draggable={false}
            />
          </div>
        ))}

        {/* Separator */}
        {primaryObjs.length > 0 && sorted.length > primaryObjs.length && (
          <div className="border-t border-gray-700/40" />
        )}

        {/* Top-level non-primary objects (draggable) with children nested below */}
        {(() => {
          const sysZone  = topLevelNonPrimary.filter(o => !o.isDeepSpace);
          const deepZone = topLevelNonPrimary.filter(o => o.isDeepSpace);

          const renderObj = (obj: SystemObject) => {
            if (obj.type === 'Nebula') return (
              <div key={obj.id}>
                <ObjectEditor
                  obj={obj}
                  allObjects={system.objects}
                  onChange={updates => updateObject(system.id, obj.id, updates)}
                  onRemove={() => removeObject(system.id, obj.id)}
                  draggable={false}
                />
              </div>
            );
            return (
              <div key={obj.id}>
                <div
                  draggable
                  onDragStart={e => onDragStart(e, obj)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => onDrop(e, obj)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <ObjectEditor
                    obj={obj}
                    allObjects={system.objects}
                    onChange={updates => updateObject(system.id, obj.id, updates)}
                    onRemove={() => removeObject(system.id, obj.id)}
                    draggable={true}
                  />
                </div>
                {renderDescendants(obj.id)}
              </div>
            );
          };

          const onDropSeparator = (e: React.DragEvent) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('swn-drag');
            if (!raw) return;
            let payload: DragPayload;
            try { payload = JSON.parse(raw); } catch { return; }
            const dragged = sorted.find(o => o.id === payload.objId);
            if (!dragged || dragged.isDeepSpace) return;
            moveToZone(dragged, true);
          };

          return (
            <>
              {sysZone.map(renderObj)}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={onDropSeparator}
                className="my-1.5 flex items-center gap-2 rounded py-0.5 transition-colors [&:has(+*)]:hover:bg-gray-700/20"
                title="Drop here to move to deep space"
              >
                <div className="flex-1 border-t border-gray-700/40" />
                <span className="text-[9px] text-gray-700 uppercase tracking-wider font-medium select-none">Deep Space</span>
                <div className="flex-1 border-t border-gray-700/40" />
              </div>
              {deepZone.map(renderObj)}
            </>
          );
        })()}
      </div>

      {/* Add object row */}
      <div className="px-3 py-3 border-t border-gray-700/60">
        {!addingType ? (
          <button
            onClick={() => setAddingType(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm transition-colors"
          >
            <Plus size={14} />
            Add Object
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map(({ type, label, extra }) => {
                const color = OBJECT_TYPE_COLORS[type];
                return (
                  <button
                    key={label}
                    onClick={() => {
                      addObject(system.id, { type, ...extra });
                      setAddingType(false);
                    }}
                    className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 border text-xs font-medium transition-colors"
                    style={{
                      borderColor: color,
                      color: color,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setAddingType(false)}
              className="text-xs text-gray-600 hover:text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Delete system */}
      <div className="px-3 pt-2 border-t border-gray-700/60">
        <button
          onClick={onDeleteSystem}
          className="flex items-center gap-1.5 text-red-500 hover:text-red-400 text-xs transition-colors"
        >
          <Trash2 size={12} />
          Delete System
        </button>
      </div>

      {/* Notes */}
      <div className="px-3 pb-3 pt-2">
        <textarea
          rows={2}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder:text-gray-600 outline-none resize-none focus:border-gray-500 transition-colors"
          value={system.notes}
          onChange={e => updateSystem(system.id, { notes: e.target.value })}
          placeholder="System notes, GM secrets…"
        />
      </div>
    </div>
  );
}
