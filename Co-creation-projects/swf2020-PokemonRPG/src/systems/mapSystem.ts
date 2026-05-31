import { TileType } from '../types/map.ts';
import type { MapData, NPCInstance, WarpPoint } from '../types/map.ts';
import type { PlayerData, Pokemon } from '../types/index.ts';
import { Direction, StatusEffect } from '../types/index.ts';
import { getSpecies } from '../data/species.ts';
import { getMove } from '../data/moves.ts';
import { MAX_MOVES_PER_POKEMON, GROWTH_RATE_MEDIUM_FAST } from '../data/constants.ts';

// ---------------------------------------------------------------------------
// Tile colours (pixel-art Pokémon style)
// ---------------------------------------------------------------------------
const TILE_COLORS: Record<number, string> = {
  [TileType.GRASS]: '#4a9e4a',
  [TileType.TALL_GRASS]: '#2d7a2d',
  [TileType.WATER]: '#4a8fca',
  [TileType.WALL]: '#8b7355',
  [TileType.FLOOR]: '#d4c5a9',
  [TileType.DOOR]: '#c44a4a',
  [TileType.WARP]: '#c44a4a',
};

export function getTileColor(tileType: number): string {
  return TILE_COLORS[tileType] ?? '#000000';
}

// ---------------------------------------------------------------------------
// Tile queries
// ---------------------------------------------------------------------------

/**
 * Get the tile type at a specific (x, y) grid position.
 * Returns -1 if the coordinate is out of bounds.
 */
export function getTileAt(map: MapData, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return -1;
  return map.tiles[y]?.[x] ?? -1;
}

// ---------------------------------------------------------------------------
// Movement helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the player character may move to (x, y).
 * Checks map bounds, tile walkability and NPC occupancy.
 */
export function canMoveTo(
  map: MapData,
  x: number,
  y: number,
  npcs: NPCInstance[],
): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;

  const tile = getTileAt(map, x, y);
  if (tile === -1) return false;

  // Walls and water are impassable
  if (tile === TileType.WALL) return false;
  if (tile === TileType.WATER) return false;

  // NPCs block the tile they stand on
  for (const npc of npcs) {
    if (npc.x === x && npc.y === y) return false;
  }

  return true;
}

/** Return the warp point at (x, y) on the given map, or null. */
export function checkWarpPoint(
  map: MapData,
  x: number,
  y: number,
): WarpPoint | null {
  return map.warpPoints.find((wp) => wp.x === x && wp.y === y) ?? null;
}

/** Returns true when the tile at (x, y) can trigger wild encounters. */
export function isEncounterTile(map: MapData, x: number, y: number): boolean {
  return getTileAt(map, x, y) === TileType.TALL_GRASS;
}

/**
 * Return the grid coordinate in front of the player based on their
 * current direction.
 */
export function getFacingTile(
  player: PlayerData,
): { x: number; y: number } {
  const { x, y } = player.position;
  switch (player.position.direction) {
    case Direction.UP:
      return { x, y: y - 1 };
    case Direction.DOWN:
      return { x, y: y + 1 };
    case Direction.LEFT:
      return { x: x - 1, y };
    case Direction.RIGHT:
      return { x: x + 1, y };
    default:
      return { x, y };
  }
}

// ---------------------------------------------------------------------------
// Pokémon helpers
// ---------------------------------------------------------------------------

/** Generate a reasonably unique id for a Pokémon instance. */
export function generatePokemonId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

/**
 * Create a wild Pokémon instance from its species id.
 * IVs are randomly generated (0-31). Stats are calculated with the
 * standard Gen-III/IV formula. Moves are taken from the species'
 * learnable-move pool (up to MAX_MOVES_PER_POKEMON).
 */
export function createWildPokemon(
  speciesId: number,
  level: number,
): Pokemon {
  const species = getSpecies(speciesId);
  if (!species) {
    throw new Error(`Unknown species id: ${speciesId}`);
  }

  // Random IVs (0–31)
  const randIv = () => Math.floor(Math.random() * 32);
  const ivs = {
    hp: randIv(),
    atk: randIv(),
    def: randIv(),
    spAtk: randIv(),
    spDef: randIv(),
    spd: randIv(),
  };

  // Stat calculation (Gen-III/IV formula)
  const calcHp = (base: number, iv: number, lv: number): number =>
    Math.floor(((2 * base + iv) * lv) / 100) + lv + 10;

  const calcStat = (base: number, iv: number, lv: number): number =>
    Math.floor(((2 * base + iv) * lv) / 100) + 5;

  const maxHp = calcHp(species.baseStats.hp, ivs.hp, level);

  const stats = {
    hp: maxHp,
    atk: calcStat(species.baseStats.atk, ivs.atk, level),
    def: calcStat(species.baseStats.def, ivs.def, level),
    spAtk: calcStat(species.baseStats.spAtk, ivs.spAtk, level),
    spDef: calcStat(species.baseStats.spDef, ivs.spDef, level),
    spd: calcStat(species.baseStats.spd, ivs.spd, level),
  };

  // Assign up to MAX_MOVES_PER_POKEMON moves from the learnable pool
  const moves = species.learnableMoves
    .slice(0, MAX_MOVES_PER_POKEMON)
    .map((moveId) => {
      const moveData = getMove(moveId);
      const pp = moveData?.pp ?? 35;
      return { moveId, currentPp: pp, maxPp: pp };
    });

  const evs = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spd: 0 };

  return {
    id: generatePokemonId(),
    speciesId,
    nickname: null,
    level,
    currentHp: maxHp,
    maxHp,
    stats,
    ivs,
    evs,
    moves,
    statusEffect: StatusEffect.NONE,
    experience: GROWTH_RATE_MEDIUM_FAST(level),
  };
}
