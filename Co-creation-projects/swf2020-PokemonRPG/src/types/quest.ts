export const QuestStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type QuestStatus = (typeof QuestStatus)[keyof typeof QuestStatus];

export interface QuestObjective {
  type: 'defeat' | 'collect' | 'talkTo' | 'reachLocation';
  target: string;
  amount: number;
}

export interface QuestReward {
  type: 'item' | 'experience' | 'money';
  itemId?: number;
  amount: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  npcGiverId: string;
  nextQuestId: string | null;
  dialogueStart: string;
  dialogueComplete: string;
}

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  objectiveProgress: number[];
}
