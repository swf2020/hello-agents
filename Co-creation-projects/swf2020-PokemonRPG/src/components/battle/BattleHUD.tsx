import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MoveResult, Pokemon } from '../../types/index.ts';
import { StatusEffect } from '../../types/index.ts';

interface BattleHUDProps {
  lastMoveResult: MoveResult | null;
  activePlayerPokemon: Pokemon | null;
  activeEnemyPokemon: Pokemon | null;
}

type HudMessage =
  | { type: 'effectiveness'; text: string; severity: 'good' | 'bad' | 'immune' }
  | { type: 'critical'; text: string }
  | { type: 'status'; text: string; statusType: StatusEffect };

/**
 * HUD overlay that shows type effectiveness indicators,
 * critical hit notifications, and status effect icons.
 */
export function BattleHUD({
  lastMoveResult,
  activePlayerPokemon,
  activeEnemyPokemon,
}: BattleHUDProps) {
  // Derive HUD messages from last move result
  const hudMessages = useMemo<HudMessage[]>(() => {
    const msgs: HudMessage[] = [];

    if (lastMoveResult) {
      // Type effectiveness
      if (lastMoveResult.typeEffectiveness === 0) {
        msgs.push({
          type: 'effectiveness',
          text: '没有效果',
          severity: 'immune',
        });
      } else if (lastMoveResult.typeEffectiveness > 1) {
        msgs.push({
          type: 'effectiveness',
          text: '效果拔群！',
          severity: 'good',
        });
      } else if (lastMoveResult.typeEffectiveness < 1) {
        msgs.push({
          type: 'effectiveness',
          text: '效果不理想',
          severity: 'bad',
        });
      }

      // Critical hit
      if (lastMoveResult.wasCritical) {
        msgs.push({ type: 'critical', text: '会心一击！' });
      }
    }

    return msgs;
  }, [lastMoveResult]);

  // Status effects on player's Pokémon
  const playerStatus = useMemo<{ text: string; statusType: StatusEffect } | null>(() => {
    if (!activePlayerPokemon || activePlayerPokemon.statusEffect === StatusEffect.NONE) {
      return null;
    }
    return {
      text: getStatusLabel(activePlayerPokemon.statusEffect),
      statusType: activePlayerPokemon.statusEffect,
    };
  }, [activePlayerPokemon]);

  // Status effects on enemy's Pokémon
  const enemyStatus = useMemo<{ text: string; statusType: StatusEffect } | null>(() => {
    if (!activeEnemyPokemon || activeEnemyPokemon.statusEffect === StatusEffect.NONE) {
      return null;
    }
    return {
      text: getStatusLabel(activeEnemyPokemon.statusEffect),
      statusType: activeEnemyPokemon.statusEffect,
    };
  }, [activeEnemyPokemon]);

  return (
    <>
      {/* Effectiveness / Critical hit indicators - centered */}
      <div className="absolute inset-x-0 top-1/4 flex flex-col items-center gap-2 pointer-events-none z-20">
        <AnimatePresence mode="popLayout">
          {hudMessages.map((msg, i) => (
            <motion.div
              key={`${msg.type}-${i}-${msg.text}`}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className={`
                px-4 py-2 rounded-lg font-bold text-lg shadow-lg
                ${msg.type === 'effectiveness' && msg.severity === 'good' ? 'bg-green-600 text-white' : ''}
                ${msg.type === 'effectiveness' && msg.severity === 'bad' ? 'bg-gray-600 text-gray-200' : ''}
                ${msg.type === 'effectiveness' && msg.severity === 'immune' ? 'bg-red-700 text-white' : ''}
                ${msg.type === 'critical' ? 'bg-yellow-500 text-gray-900' : ''}
              `}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Status effect indicators on Pokémon */}
      {/* Player status */}
      <AnimatePresence>
        {playerStatus && (
          <motion.div
            key="player-status"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-4 bottom-48 z-20 pointer-events-none"
          >
            <StatusBadge status={playerStatus.statusType} label={playerStatus.text} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enemy status */}
      <AnimatePresence>
        {enemyStatus && (
          <motion.div
            key="enemy-status"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-4 top-32 z-20 pointer-events-none"
          >
            <StatusBadge status={enemyStatus.statusType} label={enemyStatus.text} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatusBadge({
  status,
  label,
}: {
  status: StatusEffect;
  label: string;
}) {
  const colorMap: Record<StatusEffect, string> = {
    [StatusEffect.NONE]: '',
    [StatusEffect.BURN]: 'bg-orange-600',
    [StatusEffect.FREEZE]: 'bg-cyan-400',
    [StatusEffect.PARALYZE]: 'bg-yellow-400',
    [StatusEffect.POISON]: 'bg-purple-600',
    [StatusEffect.SLEEP]: 'bg-indigo-400',
    [StatusEffect.CONFUSE]: 'bg-pink-400',
  };

  return (
    <div
      className={`
        ${colorMap[status] ?? 'bg-gray-500'}
        px-3 py-1 rounded-full text-xs font-bold text-white shadow-md
        border-2 border-white/50
      `}
    >
      {label}
    </div>
  );
}

function getStatusLabel(status: StatusEffect): string {
  const labels: Record<StatusEffect, string> = {
    [StatusEffect.NONE]: '',
    [StatusEffect.BURN]: '灼伤',
    [StatusEffect.FREEZE]: '冰冻',
    [StatusEffect.PARALYZE]: '麻痹',
    [StatusEffect.POISON]: '中毒',
    [StatusEffect.SLEEP]: '睡眠',
    [StatusEffect.CONFUSE]: '混乱',
  };
  return labels[status] ?? '未知';
}
