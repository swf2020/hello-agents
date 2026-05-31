import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogueStore } from '../../stores/dialogueStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';
import {
  evaluateCondition,
  formatDialogueText,
  executeAction,
} from '../../systems/dialogueSystem';

/* ── NPC 树 ID → 显示名称映射 ─────────────────────────── */
const NPC_NAMES: Record<string, string> = {
  professor_intro: '大木博士',
  shopkeeper: '商店老板',
  town_guide: '镇向导',
  herb_elder: '药草爷爷',
};

/* ── 常数 ──────────────────────────────────────────────── */
const TYPE_SPEED_MS = 35; // 每个字符间隔 (ms)
const AUTO_END_DELAY_MS = 2500; // 对话结束后的自动关闭延迟

export function DialogueBox() {
  /* ── Store 订阅 ─────────────────────────────────────── */
  const isActive = useDialogueStore((s) => s.isActive);
  const currentTree = useDialogueStore((s) => s.currentTree);
  const currentNodeId = useDialogueStore((s) => s.currentNodeId);
  const playerData = usePlayerStore((s) => s.playerData);

  /* ── 当前节点 & 可用选项 ─────────────────────────────── */
  const node = useMemo(() => {
    if (!currentTree || !currentNodeId) return null;
    return currentTree.nodes.find((n) => n.id === currentNodeId) ?? null;
  }, [currentTree, currentNodeId]);

  const availableChoices = useMemo(
    () => (node ? node.choices.filter((c) => evaluateCondition(c, playerData)) : []),
    [node, playerData],
  );

  const npcName = currentTree ? NPC_NAMES[currentTree.id] ?? currentTree.id : '';

  /* ── 打字机 / UI 状态 ──────────────────────────────── */
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [_selectedChoice, setSelectedChoice] = useState(0);

  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(0); // 与 selectedChoice 同步,避免键盘 handler 闭包过期

  /* ── 打字机效果 ────────────────────────────────────── */
  useEffect(() => {
    if (!node || !isActive) return;

    // 清理上一个节点的定时器
    if (typingRef.current) clearInterval(typingRef.current);
    if (autoEndRef.current) clearTimeout(autoEndRef.current);

    const fullText = formatDialogueText(node.text, playerData.name);
    setDisplayedText('');
    setSelectedChoice(0);
    selectedRef.current = 0;
    setIsTyping(true);

    let i = 0;
    typingRef.current = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        typingRef.current = null;
        setIsTyping(false);
      }
    }, TYPE_SPEED_MS);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
      if (autoEndRef.current) clearTimeout(autoEndRef.current);
    };
  }, [node?.id, isActive]);

  /* ── 无选项且无下一节点 → 自动关闭 ──────────────────── */
  useEffect(() => {
    if (isTyping || !isActive || !node) return;
    if (availableChoices.length > 0) return;
    if (node.nextNodeId) return; // 还有后续节点,等待玩家按键

    autoEndRef.current = setTimeout(() => {
      useDialogueStore.getState().endDialogue();
      useGameStore.getState().closeDialogue();
    }, AUTO_END_DELAY_MS);

    return () => {
      if (autoEndRef.current) clearTimeout(autoEndRef.current);
    };
  }, [isTyping, isActive, node?.id, availableChoices.length]);

  /* ── 跳过打字 ──────────────────────────────────────── */
  const skipTyping = useCallback(() => {
    const n = node;
    if (!n) return;
    if (typingRef.current) {
      clearInterval(typingRef.current);
      typingRef.current = null;
    }
    setDisplayedText(formatDialogueText(n.text, playerData.name));
    setIsTyping(false);
  }, [node, playerData.name]);

  /* ── 前进 (无选项时按空格/点击) ────────────────────── */
  const handleAdvance = useCallback(() => {
    if (isTyping) {
      skipTyping();
      return;
    }
    if (availableChoices.length > 0) return; // 有选项时不能"前进"

    const store = useDialogueStore.getState();

    if (node?.nextNodeId) {
      store.advanceDialogue(); // 走到下一节点
    } else {
      // 对话结束
      store.endDialogue();
      useGameStore.getState().closeDialogue();
    }
  }, [isTyping, skipTyping, availableChoices.length, node?.nextNodeId]);

  /* ── 选择选项 ──────────────────────────────────────── */
  const handleChoiceSelect = useCallback(
    (index: number) => {
      if (isTyping) return;
      if (index < 0 || index >= availableChoices.length) return;

      const action = useDialogueStore.getState().selectChoice(index);
      if (action) {
        const pData = usePlayerStore.getState().playerData;
        const changes = executeAction(action, pData);
        if (Object.keys(changes).length > 0) {
          usePlayerStore.getState().setPlayerData({ ...pData, ...changes });
        }
      }

      if (!useDialogueStore.getState().isActive) {
        useGameStore.getState().closeDialogue();
      }
    },
    [isTyping, availableChoices.length],
  );

  /* ── 键盘控制 ──────────────────────────────────────── */
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      /* 打字中：空格/回车 → 跳过 */
      if (isTyping && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        skipTyping();
        return;
      }

      /* 有选项 → 方向键导航 + 回车选择 */
      if (!isTyping && availableChoices.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedChoice((p) => {
            const next = Math.max(0, p - 1);
            selectedRef.current = next;
            return next;
          });
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedChoice((p) => {
            const next = Math.min(availableChoices.length - 1, p + 1);
            selectedRef.current = next;
            return next;
          });
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleChoiceSelect(selectedRef.current);
          return;
        }
      }

      /* 无选项 → 空格/回车前进 */
      if (!isTyping && availableChoices.length === 0) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleAdvance();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isActive, isTyping, availableChoices.length, skipTyping, handleChoiceSelect, handleAdvance]);

  /* ────────────────────────────────────────────────────────
   * Render
   * ──────────────────────────────────────────────────────── */
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="dialogue-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleAdvance}
        >
          <motion.div
            key="dialogue-box"
            className="w-full max-w-2xl bg-gray-900/95 border-2 border-gray-600 rounded-2xl p-5 shadow-2xl backdrop-blur-sm"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── NPC 名称标签 ─────────────────────────── */}
            {npcName && (
              <div className="inline-block px-4 py-1 mb-3 text-sm font-bold text-white bg-gray-700 rounded-full border border-gray-500">
                {npcName}
              </div>
            )}

            {/* ── 对话正文 (打字机效果) ─────────────────── */}
            <div className="min-h-[4.5rem] text-lg leading-relaxed text-gray-100 whitespace-pre-line">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-[3px] h-5 ml-0.5 bg-yellow-300 animate-pulse align-text-bottom" />
              )}
            </div>

            {/* ── 选项列表 ─────────────────────────────── */}
            <AnimatePresence>
              {!isTyping && availableChoices.length > 0 && (
                <motion.div
                  className="mt-4 space-y-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {availableChoices.map((choice, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer select-none transition-colors ${
                        i === selectedRef.current
                          ? 'bg-blue-600/50 text-white ring-1 ring-blue-400'
                          : 'text-gray-300 hover:bg-gray-700/40'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => handleChoiceSelect(i)}
                      onMouseEnter={() => {
                        setSelectedChoice(i);
                        selectedRef.current = i;
                      }}
                    >
                      <span className="w-5 text-yellow-300 font-bold text-center shrink-0">
                        {i === selectedRef.current ? '▶' : ''}
                      </span>
                      <span>{choice.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 继续提示 (▼) ─────────────────────────── */}
            {!isTyping && availableChoices.length === 0 && (
              <div className="flex justify-end mt-2 pr-1">
                <motion.span
                  className="text-yellow-300 text-lg"
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                >
                  ▼
                </motion.span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
