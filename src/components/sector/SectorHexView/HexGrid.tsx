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
}

export default function HexGrid({ sector, systems, selectedQ, selectedR, onSelectHex, zoomProgressRef }: Props) {
  const factionById: Record<string, Faction> = Object.fromEntries(
    sector.factions.map(f => [f.id, f])
  );

  return (
    <group>
      {sector.hexes.map(cell => {
        const system = cell.systemId ? systems[cell.systemId] : undefined;
        const faction = system?.factionId ? factionById[system.factionId] : undefined;
        return (
          <HexCell
            key={`${cell.q}-${cell.r}`}
            cell={cell}
            system={system}
            faction={faction}
            hexSize={HEX_SIZE}
            selected={cell.q === selectedQ && cell.r === selectedR}
            onSelect={() => onSelectHex(cell.q, cell.r)}
            zoomProgressRef={zoomProgressRef}
          />
        );
      })}
    </group>
  );
}

export { HEX_SIZE };
