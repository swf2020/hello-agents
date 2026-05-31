export const ItemType = {
  POKEBALL: 'POKEBALL',
  POTION: 'POTION',
  STATUS_HEAL: 'STATUS_HEAL',
  REVIVE: 'REVIVE',
  TM: 'TM',
  KEY_ITEM: 'KEY_ITEM',
  BERRY: 'BERRY',
} as const;

export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export interface Item {
  id: number;
  name: string;
  type: ItemType;
  description: string;
  effect: string;
  buyPrice: number;
  sellPrice: number;
}
