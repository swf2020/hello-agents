import type { Quest, QuestProgress, QuestReward, PlayerData } from '../types/index.ts';
import { QuestStatus } from '../types/index.ts';
import { questList } from '../data/quests.ts';

/**
 * 判断玩家是否可以接取某任务。
 * - 任务不在日志中或状态为 NOT_STARTED
 * - 任务未被完成
 * （如果将来需要前置任务检查,可在此扩展）
 */
export function canAcceptQuest(quest: Quest, playerData: PlayerData): boolean {
  const progress = playerData.questLog.find((q) => q.questId === quest.id);

  if (!progress) return true; // 日志中不存在 → 可接
  if (progress.status === QuestStatus.NOT_STARTED) return true;
  return false; // IN_PROGRESS 或 COMPLETED → 不可接
}

/**
 * 检查任务的所有目标是否都已完成。
 */
export function checkQuestCompletion(
  quest: Quest,
  progress: QuestProgress,
): boolean {
  if (progress.status !== QuestStatus.IN_PROGRESS) return false;

  return quest.objectives.every((obj, index) => {
    const current = progress.objectiveProgress[index] ?? 0;
    return current >= obj.amount;
  });
}

/**
 * 获取某个 NPC 当前可接取的任务列表。
 */
export function getNpcQuests(npcId: string, playerData: PlayerData): Quest[] {
  return questList.filter(
    (quest) => quest.npcGiverId === npcId && canAcceptQuest(quest, playerData),
  );
}

/**
 * 根据游戏事件推进所有进行中任务的目标进度。
 *
 * @param playerData  当前玩家数据
 * @param eventType   事件类型: defeat / collect / talkTo / reachLocation
 * @param target      事件目标标识符 (如 'wild', 'herb', 'professor_oak')
 * @returns           更新后的 PlayerData
 *
 * @example
 * // 击败一只野生宝可梦后:
 * const newData = updateQuestProgress(playerData, 'defeat', 'wild');
 */
export function updateQuestProgress(
  playerData: PlayerData,
  eventType: 'defeat' | 'collect' | 'talkTo' | 'reachLocation',
  target: string,
): PlayerData {
  const newLog = playerData.questLog.map((progress) => {
    if (progress.status !== QuestStatus.IN_PROGRESS) return progress;

    const quest = questList.find((q) => q.id === progress.questId);
    if (!quest) return progress;

    const newObjectives = progress.objectiveProgress.map((current, index) => {
      const objective = quest.objectives[index];
      if (!objective) return current;

      if (objective.type === eventType && objective.target === target) {
        return Math.min(current + 1, objective.amount);
      }
      return current;
    });

    return { ...progress, objectiveProgress: newObjectives };
  });

  return { ...playerData, questLog: newLog };
}

/**
 * 发放任务奖励,返回需要变更的 PlayerData 片段。
 *
 * 当前支持奖励类型:
 * - item → 向背包添加道具
 * - experience / money → 暂不处理(PlayerData 暂无对应字段,留待后续扩展)
 */
export function grantQuestRewards(
  rewards: QuestReward[],
  playerData: PlayerData,
): Partial<PlayerData> {
  const changes: Partial<PlayerData> = {};

  for (const reward of rewards) {
    if (reward.type === 'item' && reward.itemId != null) {
      const inv = playerData.inventory.map((i) => ({ ...i }));
      const existing = inv.find((i) => i.itemId === reward.itemId);

      if (existing) {
        existing.quantity += reward.amount;
      } else {
        inv.push({ itemId: reward.itemId, quantity: reward.amount });
      }

      changes.inventory = inv;
    }
    // experience / money 暂不处理
  }

  return changes;
}
