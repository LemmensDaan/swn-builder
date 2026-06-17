import type React from 'react';
import type { Sector, StarSystem, Faction } from '../../../types/sector';
import HexCell from './HexCell';

const HEX_SIZE = 1.1;

interface Props {
  sector: Sector;
  systems: Record<string, StarSystem>;
  selectedQ: number | null;
  selectedR: number | null;
  onSelectHex: (q: number, r: number) => void;
  zoomProgressRef?: React.MutableRefObject<number>;
  routeMode?: boolean;
  routeStartQ?: number | null;
  routeStartR?: number | null;
  focusMode?: 'hexes' | 'routes';
}

export default function HexGrid({ sector, systems, selectedQ, selectedR, onSelectHex, zoomProgressRef, routeMode, routeStartQ, routeStartR, focusMode = 'hexes' }: Props) {
  const factionById: Record<string, Faction> = Object.fromEntries(
    sector.factions.map(f => [f.id, f])
  );

  return (
    <group>
      {sector.hexes.map(cell => {
        const system = cell.systemId ? systems[cell.systemId] : undefined;
        const faction = system?.factionId ? factionById[system.factionId] : undefined;
        const contestedFactions = system?.contestedFactionIds
          ?.map(id => factionById[id])
          .filter((f): f is Faction => !!f);
        return (
          <HexCell
            key={`${cell.q}-${cell.r}`}
            cell={cell}
            system={system}
            faction={faction}
            contestedFactions={contestedFactions}
            hexSize={HEX_SIZE}
            selected={cell.q === selectedQ && cell.r === selectedR}
            onSelect={() => onSelectHex(cell.q, cell.r)}
            zoomProgressRef={zoomProgressRef}
            routeMode={routeMode}
            isRouteStart={cell.q === routeStartQ && cell.r === routeStartR}
            focusMode={focusMode}
          />
        );
      })}
    </group>
  );
}

export { HEX_SIZE };
