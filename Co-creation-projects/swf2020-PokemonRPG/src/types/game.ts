export const GameState = {
  TITLE: 'TITLE',
  OVERWORLD: 'OVERWORLD',
  BATTLE: 'BATTLE',
  DIALOGUE: 'DIALOGUE',
  MENU: 'MENU',
  INVENTORY: 'INVENTORY',
  POKEMON_SUMMARY: 'POKEMON_SUMMARY',
  SHOP: 'SHOP',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];
