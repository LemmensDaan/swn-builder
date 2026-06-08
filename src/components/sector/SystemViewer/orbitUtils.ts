/**
 * Returns the 3D world position for an object at a given orbital angle,
 * radius, inclination (in radians), and eccentricity.
 * For elliptical orbits, radius is the semi-major axis.
 */
export function getOrbitPosition(
  angle: number,
  radius: number,
  inclination: number,
  eccentricity: number = 0,
): [number, number, number] {
  const e = Math.max(0, Math.min(eccentricity, 0.999));
  const r = (radius * (1 - e * e)) / (1 + e * Math.cos(angle));
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const y = z * Math.sin(inclination);
  const z2 = z * Math.cos(inclination);
  return [x, y, z2];
}
