import type { RouteCategory } from '../../../types/sector';

export const ROUTE_COLORS: Record<RouteCategory, string> = {
  'known':           '#7dd3fc',
  'experimental':    '#fcd34d',
  'crew-traveled':   '#86efac',
  'crew-discovered': '#c4b5fd',
  'hazardous':       '#fca5a5',
};

export const ROUTE_LABELS: Record<RouteCategory, string> = {
  'known':           'Known Route',
  'experimental':    'Experimental',
  'crew-traveled':   'Crew Traveled',
  'crew-discovered': 'Crew Discovered',
  'hazardous':       'Hazardous',
};

export const ROUTE_DASHED: Record<RouteCategory, boolean> = {
  'known':           false,
  'experimental':    true,
  'crew-traveled':   false,
  'crew-discovered': false,
  'hazardous':       true,
};

// odd-q offset to cube, then Chebyshev distance
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const x1 = q1, z1 = r1 - (q1 - (q1 & 1)) / 2, y1 = -x1 - z1;
  const x2 = q2, z2 = r2 - (q2 - (q2 & 1)) / 2, y2 = -x2 - z2;
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

// SWN 2e: each spike drill = 6 days; drive rating = max hexes per drill
export function travelDays(dist: number, driveRating: number): number {
  return Math.ceil(dist / driveRating) * 6;
}
