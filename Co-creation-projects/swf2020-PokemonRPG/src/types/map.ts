export const TileType = {
  GRASS: 0,
  TALL_GRASS: 1,
  WATER: 2,
  WALL: 3,
  FLOOR: 4,
  DOOR: 5,
  WARP: 6,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface NPCInstance {
  id: string;
  npcId: string;
  x: number;
  y: number;
  direction: string;
  dialogueTreeId: string;
}

export interface WarpPoint {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
}

export interface WildEncounter {
  speciesId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
  terrain: number;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[][];
  npcs: NPCInstance[];
  warpPoints: WarpPoint[];
  wildEncounters: WildEncounter[];
  bgm: string | null;
}
