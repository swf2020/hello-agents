import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../../types/game.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';
import { getSpecies } from '../../data/species.ts';
import { TYPE_COLORS, typeTextColor, TYPE_LABELS } from '../../data/typeColors.ts';
import type { Pokemon, MoveSlot } from '../../types/pokemon.ts';
import { getMove } from '../../data/moves.ts';

/* ─── helpers ─── */

function hpPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((current / max) * 100);
}

function hpBarColor(pct: number): string {
  if (pct > 50) return 'bg-green-500';
  if (pct > 20) return 'bg-yellow-400';
  return 'bg-red-500';
}

/* ─── type badge ─── */

function TypeBadge({ type }: { type: string }) {
  const bg = TYPE_COLORS[type as keyof typeof TYPE_COLORS] ?? '#888';
  const fg = typeTextColor(type as keyof typeof TYPE_COLORS);
  const label = TYPE_LABELS[type as keyof typeof TYPE_COLORS] ?? type;
  return (
    <span
      className="inline-block text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

/* ─── HP bar ─── */

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = hpPercent(current, max);
  const color = hpBarColor(pct);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 text-right tabular-nums text-gray-600">{current}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="w-6 text-gray-600 tabular-nums">{max}</span>
    </div>
  );
}

/* ─── main component ─── */

export default function PokemonSummary() {
  const setGameState = useGameStore((s) => s.setGameState);
  const party = usePlayerStore((s) => s.playerData.party);
  const playSfx = useAudioStore((s) => s.playSfx);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = party.find((p) => p.id === selectedId) ?? null;

  /* ── close ── */
  const goBack = useCallback(() => {
    playSfx('cancel');
    setGameState(GameState.MENU);
  }, [playSfx, setGameState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedId) {
          setSelectedId(null);
        } else {
          goBack();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, goBack]);

  /* fill empty slots */
  const slots: Array<Pokemon | null> = [...party];
  while (slots.length < 6) slots.push(null);

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-gradient-to-br from-blue-50 to-white flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">宝可梦</h2>
        <span className="text-sm text-gray-500">
          {party.length} / 6
        </span>
        <button
          className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium
                     transition-colors cursor-pointer"
          onClick={goBack}
        >
          返回
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Party grid */}
        <div className="flex-1 grid grid-cols-2 gap-4 content-start overflow-y-auto">
          {slots.map((pkm, idx) => {
            if (!pkm) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50
                             flex items-center justify-center h-28 text-gray-400 text-sm"
                >
                  空位 {idx + 1}
                </div>
              );
            }
            const species = getSpecies(pkm.speciesId);
            const pct = hpPercent(pkm.currentHp, pkm.maxHp);
            const isSelected = pkm.id === selectedId;
            return (
              <motion.button
                key={pkm.id}
                className={`rounded-xl border-2 p-3 text-left transition-colors cursor-pointer
                            ${isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-blue-300'}`}
                onClick={() => {
                  playSfx('select');
                  setSelectedId(isSelected ? null : pkm.id);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                layout
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-800 truncate">
                    {pkm.nickname ?? species?.name ?? '???'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1 shrink-0">
                    Lv.{pkm.level}
                  </span>
                </div>
                {/* Types */}
                <div className="flex gap-1 mb-2">
                  {species?.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
                {/* HP bar */}
                <HpBar current={pkm.currentHp} max={pkm.maxHp} />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                  <span>HP</span>
                  <span>{pct}%</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Detail panel ── */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 shadow-lg p-5 overflow-y-auto"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {selected.nickname ?? getSpecies(selected.speciesId)?.name ?? '???'}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Lv.{selected.level} · {getSpecies(selected.speciesId)?.name ?? '???'}
              </p>

              {/* Types */}
              <div className="flex gap-1 mb-4">
                {getSpecies(selected.speciesId)?.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>

              {/* Stats */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  能力值
                </h4>
                <div className="space-y-1 text-sm">
                  {[
                    { label: 'HP', value: `${selected.currentHp}/${selected.maxHp}` },
                    { label: '攻击', value: selected.stats.atk },
                    { label: '防御', value: selected.stats.def },
                    { label: '特攻', value: selected.stats.spAtk },
                    { label: '特防', value: selected.stats.spDef },
                    { label: '速度', value: selected.stats.spd },
                  ].map((s) => (
                    <div key={s.label} className="flex justify-between">
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-mono font-medium text-gray-800">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Moves */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  招式
                </h4>
                <div className="space-y-1">
                  {selected.moves.length === 0 && (
                    <p className="text-sm text-gray-400 italic">无招式</p>
                  )}
                  {selected.moves.map((m: MoveSlot) => (
                    <div
                      key={m.moveId}
                      className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-700">{getMove(m.moveId)?.name ?? `招式${m.moveId}`}</span>
                      <span className="text-gray-500 tabular-nums">
                        PP {m.currentPp}/{m.maxPp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXP */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  经验值
                </h4>
                <p className="text-sm text-gray-600">
                  {selected.experience} EXP
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
