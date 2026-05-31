import type { PokemonType } from './pokemon.ts';

export const MoveCategory = {
  PHYSICAL: 'PHYSICAL',
  SPECIAL: 'SPECIAL',
  STATUS: 'STATUS',
} as const;

export type MoveCategory = (typeof MoveCategory)[keyof typeof MoveCategory];

export interface Move {
  id: number;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
  description: string;
  effect: string;
  effectChance: number | null;
}
