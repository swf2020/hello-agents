import type { Pokemon } from './pokemon.ts';

export const BattlePhase = {
  START: 'START',
  PLAYER_CHOOSING: 'PLAYER_CHOOSING',
  EXECUTING: 'EXECUTING',
  ENEMY_TURN: 'ENEMY_TURN',
  CATCHING: 'CATCHING',
  FAINTED: 'FAINTED',
  WON: 'WON',
  LOST: 'LOST',
  RUN: 'RUN',
} as const;

export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase];

export interface MoveResult {
  moveName: string;
  typeEffectiveness: number;
  wasCritical: boolean;
  damage: number;
}

export interface BattleState {
  playerParty: Pokemon[];
  enemyParty: Pokemon[];
  currentTurn: number;
  phase: BattlePhase;
  activePlayerPokemonIndex: number;
  activeEnemyPokemonIndex: number;
  messages: string[];
  isWildBattle: boolean;
  enemyTrainerName: string | null;
  lastMoveResult: MoveResult | null;
}
