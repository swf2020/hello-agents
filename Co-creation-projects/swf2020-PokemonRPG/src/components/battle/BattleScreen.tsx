import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBattleStore } from '../../stores/battleStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { BattlePhase } from '../../types/battle.ts';
import { StatusEffect, PokemonType } from '../../types/pokemon.ts';
import type { Pokemon, MoveSlot, Item } from '../../types/index.ts';
import {
  getPokemonDisplayName,
  getTypeColor,
  getTypeTextColor,
  getStatusBlockReason,
} from '../../systems/battleSystem.ts';
import { getMove } from '../../data/moves.ts';
import { getSpecies } from '../../data/species.ts';
import { GROWTH_RATE_MEDIUM_FAST } from '../../data/constants.ts';
import { getItem } from '../../data/items.ts';
import { BattleHUD } from './BattleHUD.tsx';

type MenuState = 'main' | 'fight' | 'bag' | 'pokemon';

/* ─────────────────────────── helpers ─────────────────────────── */

function hpPercent(hp: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
}

function hpBarColor(pct: number): string {
  if (pct > 50) return 'bg-green-500';
  if (pct > 25) return 'bg-yellow-400';
  return 'bg-red-500';
}

function expProgress(pokemon: Pokemon): number {
  const current = GROWTH_RATE_MEDIUM_FAST(pokemon.level);
  const next = GROWTH_RATE_MEDIUM_FAST(pokemon.level + 1);
  const needed = next - current;
  if (needed <= 0) return 100;
  const have = Math.max(0, pokemon.experience - current);
  return Math.min(100, (have / needed) * 100);
}

function statusIcon(status: StatusEffect): string {
  const map: Record<StatusEffect, string> = {
    [StatusEffect.NONE]: '',
    [StatusEffect.BURN]: '🔥',
    [StatusEffect.FREEZE]: '❄️',
    [StatusEffect.PARALYZE]: '⚡',
    [StatusEffect.POISON]: '☠️',
    [StatusEffect.SLEEP]: '💤',
    [StatusEffect.CONFUSE]: '😵',
  };
  return map[status] ?? '';
}

function primaryType(pokemon: Pokemon): PokemonType {
  const species = getSpecies(pokemon.speciesId);
  return species?.types?.[0] ?? PokemonType.NORMAL;
}

/* ────────────────────── sub-components ──────────────────────── */

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = hpPercent(current, max);
  const color = hpBarColor(pct);

  return (
    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-500">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

function ExpBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-0.5">
      <motion.div
        className="h-full bg-blue-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

function SpritePlaceholder({
  type,
  label,
  isBack,
}: {
  type: PokemonType;
  label: string;
  isBack?: boolean;
}) {
  const bg = getTypeColor(type);
  return (
    <div
      className={`
        w-20 h-20 sm:w-24 sm:h-24 rounded-full ${bg}
        flex items-center justify-center text-white/80 font-bold text-2xl
        border-4 border-white/30 shadow-lg
        ${isBack ? 'scale-x-[-1]' : ''}
      `}
      title={label}
    >
      ?
    </div>
  );
}

/* ────────────────────── main component ──────────────────────── */

export function BattleScreen({ onEndBattle }: { onEndBattle: () => void }) {
  const { battleState, selectMove, tryCatch, tryRun, useItem, switchPokemon, addMessage, resetBattle } =
    useBattleStore();
  const { playerData } = usePlayerStore();

  const [menuState, setMenuState] = useState<MenuState>('main');
  const [locked, setLocked] = useState(false);

  const activePlayer = battleState.playerParty[battleState.activePlayerPokemonIndex] ?? null;
  const activeEnemy = battleState.enemyParty[battleState.activeEnemyPokemonIndex] ?? null;

  /* ── effects ──────────────────────────────────────────────── */

  // Auto-progress enemy turn after delay
  useEffect(() => {
    if (battleState.phase === BattlePhase.ENEMY_TURN) {
      const timer = setTimeout(() => {
        useBattleStore.getState().processEnemyTurn();
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [battleState.phase]);

  // Reset menu to main when player gets to choose
  useEffect(() => {
    if (battleState.phase === BattlePhase.PLAYER_CHOOSING) {
      setMenuState('main');
      setLocked(false);
    }
  }, [battleState.phase]);

  // Check status block when player's turn starts
  useEffect(() => {
    if (battleState.phase === BattlePhase.PLAYER_CHOOSING && activePlayer && !locked) {
      const check = getStatusBlockReason(activePlayer);
      if (check.blocked) {
        setLocked(true);
        addMessage(check.message ?? '');

        // Handle self-damage from confusion
        if (check.selfDamage && check.selfDamage > 0) {
          const state = useBattleStore.getState().battleState;
          const updatedParty = state.playerParty.map((p, i) =>
            i === state.activePlayerPokemonIndex
              ? { ...p, currentHp: Math.max(0, p.currentHp - check.selfDamage!) }
              : p,
          );
          const selfHp = updatedParty[state.activePlayerPokemonIndex]?.currentHp ?? 0;
          if (selfHp <= 0) {
            addMessage(`${getPokemonDisplayName(activePlayer)}倒下了！`);
          }
          useBattleStore.setState({
            battleState: { ...state, playerParty: updatedParty },
          });
        }

        // Auto-advance to enemy turn after a short pause
        const timer = setTimeout(
          () => {
            useBattleStore.getState().processEnemyTurn();
          },
          check.selfDamage ? 2000 : 1500,
        );
        return () => clearTimeout(timer);
      }
    }
  }, [battleState.phase, activePlayer?.id, locked]);

  /* ── handlers ─────────────────────────────────────────────── */

  const handleMoveSelect = useCallback(
    (slotIndex: number) => {
      if (locked) return;
      if (battleState.phase !== BattlePhase.PLAYER_CHOOSING) return;
      if (!activePlayer) return;

      const moveSlot = activePlayer.moves[slotIndex];
      if (!moveSlot || moveSlot.currentPp <= 0) return;

      setLocked(true);
      selectMove(battleState.activePlayerPokemonIndex, slotIndex);
    },
    [locked, battleState.phase, activePlayer, battleState.activePlayerPokemonIndex, selectMove],
  );

  const handleBagItem = useCallback(
    (itemId: number) => {
      if (locked) return;
      if (battleState.phase !== BattlePhase.PLAYER_CHOOSING) return;

      const item = getItem(itemId);
      if (!item) return;

      if (item.type === 'POKEBALL') {
        // Use pokeball on enemy
        setLocked(true);
        tryCatch(itemId);
      } else if (item.type === 'POTION' || item.type === 'STATUS_HEAL') {
        // Use on player's active Pokémon
        setLocked(true);
        useItem(itemId, battleState.activePlayerPokemonIndex);
      }
    },
    [locked, battleState.phase, battleState.activePlayerPokemonIndex, tryCatch, useItem],
  );

  const handlePokemonSelect = useCallback(
    (partyIndex: number) => {
      if (locked) return;
      if (battleState.phase !== BattlePhase.PLAYER_CHOOSING) return;
      if (partyIndex === battleState.activePlayerPokemonIndex) return;

      const target = battleState.playerParty[partyIndex];
      if (!target || target.currentHp <= 0) return;

      setLocked(true);
      switchPokemon(partyIndex);
    },
    [locked, battleState.phase, battleState.activePlayerPokemonIndex, battleState.playerParty, switchPokemon],
  );

  const handleRun = useCallback(() => {
    if (locked) return;
    if (battleState.phase !== BattlePhase.PLAYER_CHOOSING) return;
    setLocked(true);
    tryRun();
  }, [locked, battleState.phase, tryRun]);

  const handleEndBattle = useCallback(() => {
    resetBattle();
    onEndBattle();
  }, [resetBattle, onEndBattle]);

  /* ── derived data ─────────────────────────────────────────── */

  const playerType = activePlayer ? primaryType(activePlayer) : PokemonType.NORMAL;
  const enemyType = activeEnemy ? primaryType(activeEnemy) : PokemonType.NORMAL;
  const playerName = activePlayer ? getPokemonDisplayName(activePlayer) : '---';
  const enemyName = activeEnemy ? getPokemonDisplayName(activeEnemy) : '---';

  const battleItems = useMemo(() => {
    return playerData.inventory
      .map((inv) => ({
        ...inv,
        item: getItem(inv.itemId),
      }))
      .filter((entry) => entry.item && (entry.item.type === 'POKEBALL' || entry.item.type === 'POTION' || entry.item.type === 'STATUS_HEAL'));
  }, [playerData.inventory]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battleState.messages]);

  /* ── render ───────────────────────────────────────────────── */

  // No Pokémon to show
  if (!activePlayer || !activeEnemy) {
    if (battleState.phase === BattlePhase.WON || battleState.phase === BattlePhase.LOST || battleState.phase === BattlePhase.RUN) {
      return (
        <BattleResultOverlay
          phase={battleState.phase}
          messages={battleState.messages}
          onEndBattle={handleEndBattle}
        />
      );
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-green-400 to-green-700 -z-10" />

      {/* Grass decoration */}
      <div className="absolute bottom-48 inset-x-0 h-32 bg-gradient-to-t from-green-800/40 to-transparent pointer-events-none" />

      {/* ── Top half: enemy ── */}
      <div className="relative flex-1 min-h-0">
        <BattleHUD
          lastMoveResult={battleState.lastMoveResult}
          activePlayerPokemon={activePlayer}
          activeEnemyPokemon={activeEnemy}
        />

        {/* Enemy info panel */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-6 min-w-[180px] sm:min-w-[220px]">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white font-bold text-sm sm:text-base truncate">
                {enemyName}
              </span>
              <span className="text-gray-300 text-xs sm:text-sm font-semibold whitespace-nowrap">
                Lv.{activeEnemy.level}
              </span>
            </div>
            <HpBar current={activeEnemy.currentHp} max={activeEnemy.maxHp} />
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-gray-300 text-xs">
                HP: {activeEnemy.currentHp}/{activeEnemy.maxHp}
              </span>
              {activeEnemy.statusEffect !== StatusEffect.NONE && (
                <span className="text-sm">{statusIcon(activeEnemy.statusEffect)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Enemy sprite */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SpritePlaceholder type={enemyType} label={enemyName} />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom half: player + UI ── */}
      <div className="relative h-56 sm:h-64 flex-shrink-0">
        {/* Player sprite */}
        <div className="absolute bottom-28 sm:bottom-32 left-6 sm:left-12">
          <SpritePlaceholder type={playerType} label={playerName} isBack />
        </div>

        {/* Player info panel */}
        <div className="absolute bottom-28 sm:bottom-32 right-3 sm:right-6 min-w-[180px] sm:min-w-[220px]">
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-white font-bold text-sm sm:text-base truncate">
                {playerName}
              </span>
              <span className="text-gray-300 text-xs sm:text-sm font-semibold whitespace-nowrap">
                Lv.{activePlayer.level}
              </span>
            </div>
            <HpBar current={activePlayer.currentHp} max={activePlayer.maxHp} />
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-gray-300 text-xs">
                HP: {activePlayer.currentHp}/{activePlayer.maxHp}
              </span>
              {activePlayer.statusEffect !== StatusEffect.NONE && (
                <span className="text-sm">{statusIcon(activePlayer.statusEffect)}</span>
              )}
            </div>
            {/* EXP bar */}
            <div className="mt-1">
              <div className="flex justify-between text-gray-400 text-[10px] mb-px">
                <span>EXP</span>
                <span>{Math.floor(expProgress(activePlayer))}%</span>
              </div>
              <ExpBar progress={expProgress(activePlayer)} />
            </div>
          </div>
        </div>

        {/* ── Bottom bar: messages + menu ── */}
        <div className="absolute bottom-0 inset-x-0 h-28 sm:h-32 bg-gray-900/90 backdrop-blur-md border-t border-white/20 flex">
          {/* Messages panel */}
          <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
            {battleState.messages.length === 0 ? (
              <p className="text-gray-400 text-sm italic">等待开始...</p>
            ) : (
              battleState.messages.slice(-4).map((msg, i) => (
                <motion.p
                  key={`${i}-${msg}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white text-xs sm:text-sm leading-relaxed"
                >
                  {msg}
                </motion.p>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Menu panel */}
          <div className="w-44 sm:w-56 border-l border-white/10 p-1 sm:p-2">
            {battleState.phase === BattlePhase.PLAYER_CHOOSING && (
              <AnimatePresence mode="wait">
                {menuState === 'main' && (
                  <MainMenu
                    key="main"
                    onFight={() => setMenuState('fight')}
                    onBag={() => setMenuState('bag')}
                    onPokemon={() => setMenuState('pokemon')}
                    onRun={handleRun}
                  />
                )}
                {menuState === 'fight' && (
                  <FightMenu
                    key="fight"
                    moves={activePlayer.moves}
                    onSelect={handleMoveSelect}
                    onBack={() => setMenuState('main')}
                  />
                )}
                {menuState === 'bag' && (
                  <BagMenu
                    key="bag"
                    items={battleItems}
                    onSelect={handleBagItem}
                    onBack={() => setMenuState('main')}
                  />
                )}
                {menuState === 'pokemon' && (
                  <PokemonMenu
                    key="pokemon"
                    party={battleState.playerParty}
                    activeIndex={battleState.activePlayerPokemonIndex}
                    onSelect={handlePokemonSelect}
                    onBack={() => setMenuState('main')}
                  />
                )}
              </AnimatePresence>
            )}

            {/* End-of-battle state */}
            {(battleState.phase === BattlePhase.WON ||
              battleState.phase === BattlePhase.LOST ||
              battleState.phase === BattlePhase.RUN) && (
              <div className="h-full flex items-center justify-center">
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.3 }}
                  onClick={handleEndBattle}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-colors"
                >
                  继续
                </motion.button>
              </div>
            )}

            {/* Battle is processing / enemy turn */}
            {battleState.phase === BattlePhase.ENEMY_TURN && (
              <div className="h-full flex items-center justify-center">
                <span className="text-gray-400 text-sm">等待中...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────── menu sub-components ─────────────────── */

function MainMenu({
  onFight,
  onBag,
  onPokemon,
  onRun,
}: {
  onFight: () => void;
  onBag: () => void;
  onPokemon: () => void;
  onRun: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="grid grid-cols-2 gap-1.5 h-full"
    >
      <MenuButton label="FIGHT" sublabel="战斗" onClick={onFight} color="bg-red-600" />
      <MenuButton label="BAG" sublabel="背包" onClick={onBag} color="bg-blue-600" />
      <MenuButton label="POKEMON" sublabel="宝可梦" onClick={onPokemon} color="bg-green-600" />
      <MenuButton label="RUN" sublabel="逃跑" onClick={onRun} color="bg-yellow-600" />
    </motion.div>
  );
}

function MenuButton({
  label,
  sublabel,
  onClick,
  color,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        ${color} hover:brightness-110 active:brightness-90
        text-white rounded-lg p-1 sm:p-2 flex flex-col items-center justify-center
        transition-all shadow-md border border-white/20
      `}
    >
      <span className="font-bold text-xs sm:text-sm leading-tight">{label}</span>
      <span className="text-[10px] sm:text-xs text-white/70">{sublabel}</span>
    </button>
  );
}

function FightMenu({
  moves,
  onSelect,
  onBack,
}: {
  moves: MoveSlot[];
  onSelect: (index: number) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      <div className="grid grid-cols-2 gap-1 flex-1">
        {moves.map((slot, i) => {
          const move = getMove(slot.moveId);
          const hasPP = slot.currentPp > 0;
          const typeColor = move ? getTypeColor(move.type) : 'bg-gray-500';
          const typeText = move ? getTypeTextColor(move.type) : 'text-white';

          return (
            <button
              key={slot.moveId}
              onClick={() => onSelect(i)}
              disabled={!hasPP}
              className={`
                rounded-lg p-1 border border-white/20 flex flex-col items-center justify-center
                transition-all text-center
                ${hasPP ? `${typeColor} hover:brightness-110 active:brightness-90 cursor-pointer` : 'bg-gray-700 opacity-50 cursor-not-allowed'}
              `}
            >
              <span className={`font-bold text-xs sm:text-sm leading-tight ${hasPP ? typeText : 'text-gray-400'}`}>
                {move?.name ?? '---'}
              </span>
              <span className="text-[10px] text-white/70">
                PP: {slot.currentPp}/{slot.maxPp}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onBack}
        className="mt-1 text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors underline"
      >
        返回
      </button>
    </motion.div>
  );
}

function BagMenu({
  items,
  onSelect,
  onBack,
}: {
  items: { itemId: number; quantity: number; item: Item | undefined }[];
  onSelect: (itemId: number) => void;
  onBack: () => void;
}) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex flex-col items-center justify-center h-full gap-1"
      >
        <span className="text-gray-400 text-sm">没有可用道具</span>
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-white underline">
          返回
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {items.map((entry) => (
          <button
            key={entry.itemId}
            onClick={() => onSelect(entry.itemId)}
            disabled={entry.quantity <= 0}
            className={`
              w-full text-left rounded px-1.5 py-1 flex items-center justify-between
              text-xs sm:text-sm transition-colors
              ${entry.quantity > 0 ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'}
            `}
          >
            <span className="truncate">
              {entry.item?.name ?? '未知'}
            </span>
            <span className="text-gray-400 ml-1 shrink-0">x{entry.quantity}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="mt-1 text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors underline"
      >
        返回
      </button>
    </motion.div>
  );
}

function PokemonMenu({
  party,
  activeIndex,
  onSelect,
  onBack,
}: {
  party: Pokemon[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto space-y-0.5">
        {party.length === 0 && (
          <span className="text-gray-400 text-sm">没有宝可梦</span>
        )}
        {party.map((p, i) => {
          const isActive = i === activeIndex;
          const isAlive = p.currentHp > 0;
          const name = getPokemonDisplayName(p);
          const typeC = getTypeColor(primaryType(p));
          const pct = hpPercent(p.currentHp, p.maxHp);

          return (
            <button
              key={p.id}
              onClick={() => onSelect(i)}
              disabled={isActive || !isAlive}
              className={`
                w-full rounded px-1.5 py-1 flex items-center gap-1.5 text-xs sm:text-sm transition-colors
                ${isActive ? 'bg-blue-600/40 text-white' : isAlive ? 'hover:bg-white/10 text-white cursor-pointer' : 'text-gray-600'}
              `}
            >
              {/* Type dot */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${typeC}`} />

              {/* Name */}
              <span className="truncate flex-1">
                {name}
                {isActive && <span className="text-blue-300 ml-1">(战斗中)</span>}
              </span>

              {/* HP */}
              <span className="text-gray-400 shrink-0">
                {p.currentHp}/{p.maxHp}
              </span>

              {/* Mini HP bar */}
              <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full ${hpBarColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onBack}
        className="mt-1 text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors underline"
      >
        返回
      </button>
    </motion.div>
  );
}

function BattleResultOverlay({
  phase,
  messages,
  onEndBattle,
}: {
  phase: BattlePhase;
  messages: string[];
  onEndBattle: () => void;
}) {
  const isWin = phase === BattlePhase.WON;
  const isRun = phase === BattlePhase.RUN;

  const title = isWin ? '胜利！' : isRun ? '逃跑成功' : '败北...';
  const emoji = isWin ? '🎉' : isRun ? '🏃' : '💔';
  const bgClass = isWin
    ? 'from-green-800/90 to-green-600/90'
    : isRun
      ? 'from-yellow-800/90 to-yellow-600/90'
      : 'from-red-800/90 to-red-600/90';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b ${bgClass} backdrop-blur-sm`}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center"
      >
        <div className="text-6xl mb-4">{emoji}</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          {title}
        </h1>
        <div className="max-w-md mx-auto mb-6 px-4">
          {messages.slice(-3).map((msg, i) => (
            <p key={i} className="text-white/80 text-sm sm:text-base">
              {msg}
            </p>
          ))}
        </div>
        <button
          onClick={onEndBattle}
          className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-lg rounded-xl transition-colors border border-white/30 shadow-lg"
        >
          返回
        </button>
      </motion.div>
    </div>
  );
}
