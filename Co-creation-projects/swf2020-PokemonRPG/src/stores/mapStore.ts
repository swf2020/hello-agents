import { create } from 'zustand';
import type { MapData, NPCInstance } from '../types/map.ts';
import { TileType } from '../types/map.ts';
import { getMap } from '../data/maps/testTown.ts';
import { ENCOUNTER_STEPS_MIN, ENCOUNTER_STEPS_MAX } from '../data/constants.ts';

interface MapStore {
  /** The currently active map data, or null if not yet loaded. */
  currentMap: MapData | null;
  /** Cache of previously loaded maps keyed by id. */
  mapCache: Record<string, MapData>;
  /** NPCs visible on the current map. */
  visibleNPCs: NPCInstance[];
  /** Step counter since last wild encounter. */
  encounterStepCounter: number;
  /** Randomised step threshold for the next wild encounter. */
  encounterThreshold: number;

  /** Load a map by id (from cache or fetch). */
  loadMap: (mapId: string) => void;

  /** Check if a tile coordinate is walkable. */
  checkCollision: (x: number, y: number) => boolean;

  /** Roll for a wild encounter. Returns a species id + level, or null. */
  checkEncounter: (terrain: number) => { speciesId: number; level: number } | null;

  /** Advance the encounter step counter and roll if threshold is reached. */
  stepCounterTick: () => { speciesId: number; level: number } | null;

  /** Interact with an NPC at the given tile. Returns the NPC instance or null. */
  interactWithNPC: (x: number, y: number) => NPCInstance | null;

  /** Reset the encounter counter (after a battle). */
  resetEncounterCounter: () => void;
}

function randomEncounterThreshold(): number {
  return (
    Math.floor(Math.random() * (ENCOUNTER_STEPS_MAX - ENCOUNTER_STEPS_MIN + 1)) +
    ENCOUNTER_STEPS_MIN
  );
}

export const useMapStore = create<MapStore>()((set, get) => ({
  currentMap: null,
  mapCache: {},
  visibleNPCs: [],
  encounterStepCounter: 0,
  encounterThreshold: randomEncounterThreshold(),

  loadMap: (mapId) => {
    const { mapCache } = get();
    let map: MapData | undefined = mapCache[mapId];
    if (!map) {
      map = getMap(mapId);
      if (!map) return;
      set((state) => ({
        mapCache: { ...state.mapCache, [mapId]: map! },
      }));
    }
    set({
      currentMap: map,
      visibleNPCs: map.npcs,
      encounterStepCounter: 0,
      encounterThreshold: randomEncounterThreshold(),
    });
  },

  checkCollision: (x, y) => {
    const { currentMap } = get();
    if (!currentMap) return false;

    // Bounds check
    if (x < 0 || y < 0 || x >= currentMap.width || y >= currentMap.height) {
      return true; // out of bounds = collision
    }

    const tile = currentMap.tiles[y]?.[x];
    if (tile === undefined) return true;

    // Walls and water block movement; everything else is walkable
    if (tile === TileType.WALL) return true;
    if (tile === TileType.WATER) return true;

    return false;
  },

  checkEncounter: (terrain) => {
    const { currentMap } = get();
    if (!currentMap) return null;

    const pool = currentMap.wildEncounters.filter((e) => e.terrain === terrain);
    if (pool.length === 0) return null;

    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        const level =
          entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
        return { speciesId: entry.speciesId, level };
      }
    }

    return null;
  },

  stepCounterTick: () => {
    const { currentMap, encounterStepCounter, encounterThreshold } = get();
    if (!currentMap) return null;

    const newCount = encounterStepCounter + 1;
    set({ encounterStepCounter: newCount });

    if (newCount >= encounterThreshold) {
      set({
        encounterStepCounter: 0,
        encounterThreshold: randomEncounterThreshold(),
      });
      return get().checkEncounter(TileType.TALL_GRASS);
    }

    return null;
  },

  interactWithNPC: (x, y) => {
    const { visibleNPCs } = get();
    return visibleNPCs.find((npc) => npc.x === x && npc.y === y) ?? null;
  },

  resetEncounterCounter: () => {
    set({
      encounterStepCounter: 0,
      encounterThreshold: randomEncounterThreshold(),
    });
  },
}));
