export const PokemonType = {
  NORMAL: 'NORMAL',
  FIRE: 'FIRE',
  WATER: 'WATER',
  GRASS: 'GRASS',
  ELECTRIC: 'ELECTRIC',
  ICE: 'ICE',
  FIGHTING: 'FIGHTING',
  POISON: 'POISON',
  GROUND: 'GROUND',
  FLYING: 'FLYING',
  PSYCHIC: 'PSYCHIC',
  BUG: 'BUG',
  ROCK: 'ROCK',
  GHOST: 'GHOST',
  DRAGON: 'DRAGON',
} as const;

export type PokemonType = (typeof PokemonType)[keyof typeof PokemonType];

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  types: PokemonType[];
  baseStats: BaseStats;
  catchRate: number;
  evolutionLevel: number | null;
  evolvesInto: number | null;
  learnableMoves: number[];
  baseExperience: number;
}

export interface IVs {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface EVs {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface MoveSlot {
  moveId: number;
  currentPp: number;
  maxPp: number;
}

export const StatusEffect = {
  NONE: 'NONE',
  BURN: 'BURN',
  FREEZE: 'FREEZE',
  PARALYZE: 'PARALYZE',
  POISON: 'POISON',
  SLEEP: 'SLEEP',
  CONFUSE: 'CONFUSE',
} as const;

export type StatusEffect = (typeof StatusEffect)[keyof typeof StatusEffect];

export interface Pokemon {
  id: string;
  speciesId: number;
  nickname: string | null;
  level: number;
  currentHp: number;
  maxHp: number;
  stats: Stats;
  ivs: IVs;
  evs: EVs;
  moves: MoveSlot[];
  statusEffect: StatusEffect;
  experience: number;
}
