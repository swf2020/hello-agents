import { create } from 'zustand';
import { Direction, StatusEffect } from '../types/index.ts';
import type { PlayerData, InventoryItem, Pokemon, QuestProgress } from '../types/index.ts';
import { SAVE_KEY, MAX_PARTY_SIZE } from '../data/constants.ts';

function createDefaultPlayer(): PlayerData {
  return {
    name: '训练家',
    position: { x: 9, y: 8, mapId: 'test_town', direction: Direction.DOWN },
    party: [],
    inventory: [
      { itemId: 1, quantity: 5 },
      { itemId: 3, quantity: 3 },
    ],
    badges: [],
    questLog: [],
    playTime: 0,
  };
}

interface PlayerStore {
  playerData: PlayerData;

  /** Replace the entire player data (e.g. on load-game). */
  setPlayerData: (data: PlayerData) => void;

  /** Update direction without moving (used when movement is blocked). */
  setDirection: (dx: number, dy: number) => void;

  /** Move the player by a relative delta, updating direction. */
  movePlayer: (dx: number, dy: number, mapId: string) => void;

  /** Set absolute position (used by warp points). */
  setPosition: (x: number, y: number, mapId: string, direction: Direction) => void;

  /** Add a Pokémon to the party. Fails silently if party is full. */
  addPokemon: (pokemon: Pokemon) => void;

  /** Remove a Pokémon from the party by its unique id. */
  removePokemon: (pokemonId: string) => void;

  /** Restore all Pokémon in the party to full HP and clear status effects. */
  healParty: () => void;

  /** Use one instance of an item from the inventory. Returns false if none left. */
  useItem: (itemId: number) => boolean;

  /** Add a quantity of an item to the inventory. */
  addItem: (itemId: number, quantity: number) => void;

  /** Remove a quantity of an item. Returns the amount actually removed. */
  removeItem: (itemId: number, quantity: number) => number;

  /** Update or insert a quest progress entry. */
  updateQuest: (questId: string, status: QuestProgress['status'], progress?: number[]) => void;

  /** Serialize current player data to localStorage. */
  save: () => void;

  /** Deserialize player data from localStorage. Returns true on success. */
  load: () => boolean;

  /** Reset player data to defaults (new game). */
  reset: () => void;
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  playerData: createDefaultPlayer(),

  setPlayerData: (data) => set({ playerData: data }),

  movePlayer: (dx, dy, mapId) =>
    set((state) => {
      const dir = dx === 1 ? Direction.RIGHT
        : dx === -1 ? Direction.LEFT
        : dy === -1 ? Direction.UP
        : Direction.DOWN;

      return {
        playerData: {
          ...state.playerData,
          position: {
            x: state.playerData.position.x + dx,
            y: state.playerData.position.y + dy,
            mapId,
            direction: dir,
          },
        },
      };
    }),

  setPosition: (x, y, mapId, direction) =>
    set((state) => ({
      playerData: {
        ...state.playerData,
        position: { x, y, mapId, direction },
      },
    })),

  setDirection: (dx, dy) =>
    set((state) => {
      const dir = dx === 1 ? Direction.RIGHT
        : dx === -1 ? Direction.LEFT
        : dy === -1 ? Direction.UP
        : Direction.DOWN;
      return {
        playerData: {
          ...state.playerData,
          position: { ...state.playerData.position, direction: dir },
        },
      };
    }),

  addPokemon: (pokemon) =>
    set((state) => {
      if (state.playerData.party.length >= MAX_PARTY_SIZE) return state;
      return {
        playerData: {
          ...state.playerData,
          party: [...state.playerData.party, pokemon],
        },
      };
    }),

  removePokemon: (pokemonId) =>
    set((state) => ({
      playerData: {
        ...state.playerData,
        party: state.playerData.party.filter((p) => p.id !== pokemonId),
      },
    })),

  healParty: () =>
    set((state) => ({
      playerData: {
        ...state.playerData,
        party: state.playerData.party.map((p) => ({
          ...p,
          currentHp: p.maxHp,
          statusEffect: StatusEffect.NONE,
        })),
      },
    })),

  useItem: (itemId) => {
    const { playerData } = get();
    const idx = playerData.inventory.findIndex((i) => i.itemId === itemId);
    if (idx === -1) return false;

    const newInv = [...playerData.inventory];
    const item = { ...newInv[idx] };
    item.quantity -= 1;
    if (item.quantity <= 0) {
      newInv.splice(idx, 1);
    } else {
      newInv[idx] = item;
    }
    set({ playerData: { ...playerData, inventory: newInv } });
    return true;
  },

  addItem: (itemId, quantity) =>
    set((state) => {
      const inv = [...state.playerData.inventory];
      const existing = inv.find((i) => i.itemId === itemId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        inv.push({ itemId, quantity });
      }
      return { playerData: { ...state.playerData, inventory: inv } };
    }),

  removeItem: (itemId, quantity) => {
    const { playerData } = get();
    const inv: InventoryItem[] = [];
    let removed = 0;

    for (const item of playerData.inventory) {
      if (item.itemId === itemId && removed < quantity) {
        const toRemove = Math.min(item.quantity, quantity - removed);
        removed += toRemove;
        if (item.quantity - toRemove > 0) {
          inv.push({ ...item, quantity: item.quantity - toRemove });
        }
      } else {
        inv.push(item);
      }
    }

    set({ playerData: { ...playerData, inventory: inv } });
    return removed;
  },

  updateQuest: (questId, status, progress) =>
    set((state) => {
      const log = [...state.playerData.questLog];
      const idx = log.findIndex((q) => q.questId === questId);

      const entry: QuestProgress = {
        questId,
        status,
        objectiveProgress: progress ?? [],
      };

      if (idx === -1) {
        log.push(entry);
      } else {
        log[idx] = entry;
      }

      return { playerData: { ...state.playerData, questLog: log } };
    }),

  save: () => {
    const { playerData } = get();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(playerData));
    } catch {
      // Storage full or unavailable
    }
  },

  load: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as PlayerData;
      set({ playerData: data });
      return true;
    } catch {
      return false;
    }
  },

  reset: () => set({ playerData: createDefaultPlayer() }),
}));
