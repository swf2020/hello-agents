export interface DialogueChoice {
  text: string;
  nextNodeId: string | null;
  condition: {
    type: 'quest' | 'item';
    questId?: string;
    itemId?: number;
    requiredStatus?: string;
  } | null;
  action: {
    type: 'giveItem' | 'startBattle' | 'completeQuest' | 'heal' | 'warp';
    itemId?: number;
    quantity?: number;
    questId?: string;
    trainerParty?: string;
    warpMapId?: string;
    warpX?: number;
    warpY?: number;
  } | null;
}

export interface DialogueNode {
  id: string;
  text: string;
  choices: DialogueChoice[];
  nextNodeId: string | null;
}

export interface DialogueTree {
  id: string;
  nodes: DialogueNode[];
}
