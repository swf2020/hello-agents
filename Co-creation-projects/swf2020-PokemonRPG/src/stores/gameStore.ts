import { create } from 'zustand';
import { GameState } from '../types/game.ts';

interface GameStore {
  /** The current high-level screen the game is showing. */
  gameState: GameState;
  /** Timestamp from the last save (ms since epoch), or 0 if never saved. */
  lastSaveTimestamp: number;

  /** Transition to a new game state. */
  setGameState: (state: GameState) => void;

  /** Start a new game from the title screen. */
  startNewGame: () => void;

  /** Load a previously saved game. Sets lastSaveTimestamp to now. */
  loadGame: () => void;

  /** Enter battle mode from overworld. */
  enterBattle: () => void;

  /** Exit battle mode back to overworld. */
  exitBattle: () => void;

  /** Open the main menu. */
  openMenu: () => void;

  /** Close the main menu back to overworld. */
  closeMenu: () => void;

  /** Open dialogue mode. */
  openDialogue: () => void;

  /** Close dialogue mode back to overworld. */
  closeDialogue: () => void;

  /** Open the shop interface. */
  openShop: () => void;

  /** Close the shop interface. */
  closeShop: () => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  gameState: GameState.TITLE,
  lastSaveTimestamp: 0,

  setGameState: (state) => set({ gameState: state }),

  startNewGame: () => set({ gameState: GameState.OVERWORLD, lastSaveTimestamp: 0 }),

  loadGame: () => set({ gameState: GameState.OVERWORLD, lastSaveTimestamp: Date.now() }),

  enterBattle: () => set({ gameState: GameState.BATTLE }),

  exitBattle: () => set({ gameState: GameState.OVERWORLD }),

  openMenu: () => set({ gameState: GameState.MENU }),

  closeMenu: () => set({ gameState: GameState.OVERWORLD }),

  openDialogue: () => set({ gameState: GameState.DIALOGUE }),

  closeDialogue: () => set({ gameState: GameState.OVERWORLD }),

  openShop: () => set({ gameState: GameState.SHOP }),

  closeShop: () => set({ gameState: GameState.OVERWORLD }),
}));
