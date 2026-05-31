import type { Pokemon } from './pokemon.ts';
import type { QuestProgress } from './quest.ts';

export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

export interface InventoryItem {
  itemId: number;
  quantity: number;
}

export interface PlayerData {
  name: string;
  position: {
    x: number;
    y: number;
    mapId: string;
    direction: Direction;
  };
  party: Pokemon[];
  inventory: InventoryItem[];
  badges: string[];
  questLog: QuestProgress[];
  playTime: number;
}
