import type { PackageType } from '@/types/db';

/**
 * Huishoudgrootte naar pakkettype.
 * Deze verdeling staat ook in de database (functie `package_type_for`), zodat
 * server en app nooit uit elkaar lopen. Wijzig ze op beide plekken tegelijk.
 */
export const PACKAGE_BRACKETS: { type: PackageType; min: number; max: number }[] = [
  { type: 'A', min: 1, max: 1 },
  { type: 'B', min: 2, max: 2 },
  { type: 'C', min: 3, max: 4 },
  { type: 'D', min: 5, max: 6 },
  { type: 'E', min: 7, max: Number.MAX_SAFE_INTEGER },
];

export const PACKAGE_TYPES: PackageType[] = ['A', 'B', 'C', 'D', 'E'];

export function packageTypeFor(householdSize: number): PackageType {
  const size = Math.max(1, Math.round(householdSize || 1));
  const bracket = PACKAGE_BRACKETS.find((b) => size >= b.min && size <= b.max);
  return bracket ? bracket.type : 'E';
}
