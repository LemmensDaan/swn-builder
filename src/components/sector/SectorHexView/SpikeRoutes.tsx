import { useState } from 'react';
import { Html, Line } from '@react-three/drei';
import type { SpikeRoute, Sector } from '../../../types/sector';
import { hexToWorld } from './HexCell';
import { HEX_SIZE } from './HexGrid';
import { ROUTE_COLORS, ROUTE_DASHED, ROUTE_LABELS, hexDistance, travelDays } from './routeUtils';

const LINE_Y = 0.22;

interface RouteObjectProps {
  route: SpikeRoute;
  sector: Sector;
  selected: boolean;
  onSelect: (id: string | null) => void;
}

function RouteObject({ route, selected, onSelect }: RouteObjectProps) {
  const [hovered, setHovered] = useState(false);
  const color = ROUTE_COLORS[route.category];
  const dashed = ROUTE_DASHED[route.category];

  const [x1, z1] = hexToWorld(route.fromQ, route.fromR, HEX_SIZE);
  const [x2, z2] = hexToWorld(route.toQ, route.toR, HEX_SIZE);

  const points: [number, number, number][] = [
    [x1, LINE_Y, z1],
    [x2, LINE_Y, z2],
  ];

  const mx = (x1 + x2) / 2;
  const mz = (z1 + z2) / 2;

  const dist = hexDistance(route.fromQ, route.fromR, route.toQ, route.toR);

  const lineWidth = selected ? 3 : hovered ? 2.5 : 1.8;
  const opacity   = selected ? 1 : hovered ? 0.9 : 0.6;

  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={dashed}
        dashSize={0.3}
        gapSize={0.15}
      />

      {/* End cap dots */}
      <mesh position={[x1, LINE_Y, z1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.07, 12]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={[x2, LINE_Y, z2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.07, 12]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>

      {/* Midpoint interactive label */}
      <Html
        position={[mx, LINE_Y + 0.08, mz]}
        center
        distanceFactor={20}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={e => { e.stopPropagation(); onSelect(selected ? null : route.id); }}
          style={{
            background: selected ? `${color}25` : `${color}10`,
            border: `1px solid ${color}${selected ? 'aa' : '55'}`,
            color,
            borderRadius: '4px',
            padding: hovered || selected ? '3px 7px' : '2px 5px',
            fontSize: '8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            transition: 'all 0.12s',
            userSelect: 'none',
            boxShadow: selected ? `0 0 6px ${color}44` : 'none',
          }}
        >
          {hovered || selected ? (
            <span>
              {route.label
                ? <><span style={{ opacity: 0.7 }}>{route.label}</span> · </>
                : null}
              {ROUTE_LABELS[route.category]} · {dist} hex{dist !== 1 ? 'es' : ''}
              {' '}·{' '}
              D1:{travelDays(dist, 1)}d D2:{travelDays(dist, 2)}d D3:{travelDays(dist, 3)}d
            </span>
          ) : (
            <span>{dist}h</span>
          )}
        </div>
      </Html>

      {/* Invisible wider hit surface along the line for click detection */}
      {(() => {
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return null;
        const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
        const angle = Math.atan2(dz, dx);
        return (
          <mesh
            position={[cx, LINE_Y, cz]}
            rotation={[-Math.PI / 2, 0, -angle]}
            onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
            onClick={e => { e.stopPropagation(); onSelect(selected ? null : route.id); }}
          >
            <planeGeometry args={[len, 0.35]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })()}
    </group>
  );
}

interface Props {
  routes: SpikeRoute[];
  sector: Sector;
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
}

export default function SpikeRoutes({ routes, sector, selectedRouteId, onSelectRoute }: Props) {
  return (
    <group>
      {routes.map(route => (
        <RouteObject
          key={route.id}
          route={route}
          sector={sector}
          selected={selectedRouteId === route.id}
          onSelect={onSelectRoute}
        />
      ))}
    </group>
  );
}
