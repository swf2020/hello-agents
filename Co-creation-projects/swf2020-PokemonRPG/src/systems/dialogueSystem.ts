import type { DialogueChoice, DialogueNode, PlayerData, QuestProgress } from '../types/index.ts';
import { QuestStatus } from '../types/index.ts';
import { questList } from '../data/quests.ts';
import { grantQuestRewards } from './questSystem.ts';

/**
 * 判断某个对话选项当前是否对玩家可见。
 */
export function evaluateCondition(
  choice: DialogueChoice,
  playerData: PlayerData,
): boolean {
  if (!choice.condition) return true;

  const { condition } = choice;

  if (condition.type === 'quest') {
    const { questId, requiredStatus } = condition;
    if (!questId || !requiredStatus) return true;

    const progress = playerData.questLog.find((q) => q.questId === questId);

    // 不在任务日志中 → 隐式 NOT_STARTED
    if (!progress) return requiredStatus === QuestStatus.NOT_STARTED;

    return progress.status === requiredStatus;
  }

  if (condition.type === 'item') {
    const { itemId } = condition;
    if (itemId == null) return true;
    return playerData.inventory.some((i) => i.itemId === itemId && i.quantity > 0);
  }

  return true;
}

/**
 * 执行对话选项的动作,返回需要变更的 PlayerData 片段。
 *
 * - giveItem      → 向背包添加道具
 * - completeQuest → 推进任务状态:
 *   NOT_STARTED → IN_PROGRESS (接取)
 *   IN_PROGRESS → COMPLETED (完成,发放奖励,自动接取下一任务)
 * - startBattle / heal / warp → 返回空对象,由游戏上层系统处理
 */
export function executeAction(
  action: DialogueChoice['action'],
  playerData: PlayerData,
): Partial<PlayerData> {
  if (!action) return {};

  switch (action.type) {
    /* ── 给道具 ────────────────────────────────── */
    case 'giveItem': {
      if (action.itemId == null || (action.quantity ?? 0) <= 0) return {};

      const inv = playerData.inventory.map((i) => ({ ...i }));
      const existing = inv.find((i) => i.itemId === action.itemId);
      const qty = action.quantity!;

      if (existing) {
        existing.quantity += qty;
      } else {
        inv.push({ itemId: action.itemId, quantity: qty });
      }

      return { inventory: inv };
    }

    /* ── 推进任务 ──────────────────────────────── */
    case 'completeQuest': {
      if (!action.questId) return {};

      const quest = questList.find((q) => q.id === action.questId);
      if (!quest) return {};

      const log: QuestProgress[] = playerData.questLog.map((q) => ({ ...q }));
      const idx = log.findIndex((q) => q.questId === action.questId);

      const currentStatus: QuestStatus =
        idx >= 0 ? log[idx].status : QuestStatus.NOT_STARTED;

      const result: Partial<PlayerData> = {};

      if (currentStatus === QuestStatus.NOT_STARTED || idx === -1) {
        /* NOT_STARTED → IN_PROGRESS (接取任务) */
        const entry: QuestProgress = {
          questId: action.questId,
          status: QuestStatus.IN_PROGRESS,
          objectiveProgress: quest.objectives.map(() => 0),
        };
        if (idx >= 0) {
          log[idx] = entry;
        } else {
          log.push(entry);
        }
        result.questLog = log;
      } else if (currentStatus === QuestStatus.IN_PROGRESS) {
        /* IN_PROGRESS → COMPLETED (完成任务) */
        log[idx] = { ...log[idx], status: QuestStatus.COMPLETED };

        // 发放奖励
        const rewardChanges = grantQuestRewards(quest.rewards, playerData);
        result.questLog = log;
        if (rewardChanges.inventory) {
          result.inventory = rewardChanges.inventory;
        }

        // 链式接取下一任务
        if (quest.nextQuestId) {
          const nextQuest = questList.find((q) => q.id === quest.nextQuestId);
          if (nextQuest) {
            const nextIdx = log.findIndex((q) => q.questId === nextQuest.id);
            const nextEntry: QuestProgress = {
              questId: nextQuest.id,
              status: QuestStatus.IN_PROGRESS,
              objectiveProgress: nextQuest.objectives.map(() => 0),
            };
            if (nextIdx >= 0) {
              log[nextIdx] = nextEntry;
            } else {
              log.push(nextEntry);
            }
            result.questLog = log;
          }
        }
      }
      // COMPLETED → 不做任何事

      return result;
    }

    /* ── 以下由游戏上层系统处理,此处仅返回空对象 ── */
    case 'startBattle':
    case 'heal':
    case 'warp': {
      return {};
    }

    default:
      return {};
  }
}

/**
 * 根据玩家当前状态,自动解析应跳转到的节点 ID。
 *
 * - 如果只有一个选项的条件满足 → 自动跟随该选项
 * - 如果没有选项可用且节点有默认 nextNodeId → 使用默认值
 * - 否则 → 返回 null,等待玩家选择
 */
export function resolveNextNode(
  node: DialogueNode,
  playerData: PlayerData,
): string | null {
  const validChoices = node.choices.filter((c) => evaluateCondition(c, playerData));

  if (validChoices.length === 1) {
    return validChoices[0].nextNodeId;
  }

  if (validChoices.length === 0 && node.nextNodeId) {
    return node.nextNodeId;
  }

  return null; // 玩家必须在多个选项中做选择
}

/**
 * 替换对话文本中的占位符:
 * - `{name}` → 玩家名字
 */
export function formatDialogueText(text: string, playerName: string): string {
  return text.replaceAll('{name}', playerName);
}
