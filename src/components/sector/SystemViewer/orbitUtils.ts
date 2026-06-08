/**
 * Returns the 3D world position for an object at a given orbital angle,
 * radius, and inclination (in radians). Matches the prototype's implementation.
 */
export function getOrbitPosition(
  angle: number,
  radius: number,
  inclination: number,
): [number, number, number] {
  const x  = Math.cos(angle) * radius;
  const z  = Math.sin(angle) * radius;
  const y  = z * Math.sin(inclination);
  const z2 = z * Math.cos(inclination);
  return [x, y, z2];
}
