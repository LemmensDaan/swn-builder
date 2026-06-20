import type React from 'react';
import { useMemo } from 'react';
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
  const factionById = useMemo(
    () => Object.fromEntries(sector.factions.map(f => [f.id, f])),
    [sector.factions]
  );

  const cellProps = useMemo(() => {
    return sector.hexes.map(cell => {
      const system = cell.systemId ? systems[cell.systemId] : undefined;
      const faction = system?.factionId ? factionById[system.factionId] : undefined;
      const contestedFactions = system?.contestedFactionIds
        ?.map(id => factionById[id])
        .filter((f): f is Faction => !!f);
      return {
        cell,
        system,
        faction,
        contestedFactions,
        selected: cell.q === selectedQ && cell.r === selectedR,
        isRouteStart: cell.q === routeStartQ && cell.r === routeStartR,
      };
    });
  }, [sector.hexes, systems, factionById, selectedQ, selectedR, routeStartQ, routeStartR]);

  return (
    <group>
      {cellProps.map(props => (
        <HexCell
          key={`${props.cell.q}-${props.cell.r}`}
          cell={props.cell}
          system={props.system}
          faction={props.faction}
          contestedFactions={props.contestedFactions}
          hexSize={HEX_SIZE}
          selected={props.selected}
          onSelect={() => onSelectHex(props.cell.q, props.cell.r)}
          zoomProgressRef={zoomProgressRef}
          routeMode={routeMode}
          isRouteStart={props.isRouteStart}
          focusMode={focusMode}
        />
      ))}
    </group>
  );
}

export { HEX_SIZE };
