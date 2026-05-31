import { create } from 'zustand';
import { BattlePhase } from '../types/battle.ts';
import type { BattleState, Pokemon, MoveResult } from '../types/index.ts';
import { StatusEffect } from '../types/index.ts';
import {
  calculateDamage,
  checkHit,
  calculateExpGain,
  checkLevelUp,
  calculateCatchSuccess,
  getCatchStatusMultiplier,
  getPokeballBonus,
  selectEnemyMove,
  calculateRunSuccess,
  applyEndOfTurnEffects,
  getPokemonDisplayName,
  getEffectivenessText,
} from '../systems/battleSystem.ts';
import { getMove } from '../data/moves.ts';
import { getItem } from '../data/items.ts';
import { usePlayerStore } from './playerStore.ts';

export interface BattleStore {
  battleState: BattleState;

  /** Initialise a new battle. */
  startBattle: (
    playerParty: Pokemon[],
    enemyParty: Pokemon[],
    isWildBattle: boolean,
    enemyTrainerName?: string,
  ) => void;

  /** Execute player's selected move with full damage calculation. */
  selectMove: (pokemonIndex: number, moveSlotIndex: number) => void;

  /** Use a held item (potion, status heal) on a target Pokémon. */
  useItem: (itemId: number, targetPokemonIndex: number) => void;

  /** Attempt to catch the active enemy Pokémon. */
  tryCatch: (pokeballItemId: number) => void;

  /** Attempt to flee from battle (wild only). */
  tryRun: () => void;

  /** Advance to the next turn. */
  nextTurn: () => void;

  /** Process enemy's AI turn. */
  processEnemyTurn: () => void;

  /** Add a message to the battle log. */
  addMessage: (message: string) => void;

  /** Switch the active player Pokémon. */
  setActivePlayerPokemon: (index: number) => void;

  /** Reset battle state. */
  resetBattle: () => void;

  /** Switch to a different party Pokémon (costs a turn). */
  switchPokemon: (partyIndex: number) => void;
}

function defaultBattleState(): BattleState {
  return {
    playerParty: [],
    enemyParty: [],
    currentTurn: 0,
    phase: BattlePhase.START,
    activePlayerPokemonIndex: 0,
    activeEnemyPokemonIndex: 0,
    messages: [],
    isWildBattle: true,
    enemyTrainerName: null,
    lastMoveResult: null,
  };
}

/** Deep-clone a Pokemon to avoid mutation issues. */
function clonePokemon(p: Pokemon): Pokemon {
  return {
    ...p,
    stats: { ...p.stats },
    ivs: { ...p.ivs },
    evs: { ...p.evs },
    moves: p.moves.map((m) => ({ ...m })),
  };
}

/** Deep-clone an array of Pokemon. */
function cloneParty(party: Pokemon[]): Pokemon[] {
  return party.map(clonePokemon);
}

/** Find the next alive Pokémon index in a party, starting from a given index. */
function findNextAlive(party: Pokemon[], startIndex: number): number {
  for (let i = startIndex; i < party.length; i++) {
    if (party[i].currentHp > 0) return i;
  }
  return -1;
}

export const useBattleStore = create<BattleStore>()((set, get) => ({
  battleState: defaultBattleState(),

  startBattle: (playerParty, enemyParty, isWildBattle, enemyTrainerName) =>
    set({
      battleState: {
        playerParty: cloneParty(playerParty),
        enemyParty: cloneParty(enemyParty),
        currentTurn: 1,
        phase: BattlePhase.PLAYER_CHOOSING,
        activePlayerPokemonIndex: 0,
        activeEnemyPokemonIndex: 0,
        messages: [
          isWildBattle
            ? '野生宝可梦出现了！'
            : `${enemyTrainerName ?? '训练家'}向你发起了挑战！`,
        ],
        isWildBattle,
        enemyTrainerName: enemyTrainerName ?? null,
        lastMoveResult: null,
      },
    }),

  selectMove: (pokemonIndex, moveSlotIndex) => {
    const state = get().battleState;
    if (state.phase !== BattlePhase.PLAYER_CHOOSING) return;

    const attacker = state.playerParty[pokemonIndex];
    if (!attacker || attacker.currentHp <= 0) return;

    const moveSlot = attacker.moves[moveSlotIndex];
    if (!moveSlot || moveSlot.currentPp <= 0) return;

    const move = getMove(moveSlot.moveId);
    if (!move) return;

    const defender = state.enemyParty[state.activeEnemyPokemonIndex];
    if (!defender || defender.currentHp <= 0) return;

    const attackerName = getPokemonDisplayName(attacker);
    const defenderName = getPokemonDisplayName(defender);

    // Deduct PP
    const updatedMoves = attacker.moves.map((m, i) =>
      i === moveSlotIndex ? { ...m, currentPp: Math.max(0, m.currentPp - 1) } : m,
    );
    const updatedAttacker = { ...attacker, moves: updatedMoves };

    const newParty = state.playerParty.map((p, i) =>
      i === pokemonIndex ? updatedAttacker : p,
    );

    const messages: string[] = [...state.messages];
    messages.push(`${attackerName}使用了${move.name}！`);

    // Accuracy check
    if (!checkHit(move)) {
      messages.push('但是没有命中...');

      set({
        battleState: {
          ...state,
          playerParty: newParty,
          messages,
          lastMoveResult: {
            moveName: move.name,
            typeEffectiveness: 1,
            wasCritical: false,
            damage: 0,
          },
          phase: BattlePhase.ENEMY_TURN,
        },
      });
      return;
    }

    // Calculate damage
    const { damage, critical, typeEffectiveness } = calculateDamage(
      move,
      updatedAttacker,
      defender,
    );

    // Apply damage to enemy
    const updatedDefender = {
      ...defender,
      currentHp: Math.max(0, defender.currentHp - damage),
    };
    const newEnemyParty = state.enemyParty.map((p, i) =>
      i === state.activeEnemyPokemonIndex ? updatedDefender : p,
    );

    // Build result messages
    // Immune (0 effectiveness)
    if (typeEffectiveness === 0) {
      messages.push(`对${defenderName}没有效果...`);
    } else {
      if (critical) {
        messages.push('会心一击！');
      }
      const effText = getEffectivenessText(typeEffectiveness);
      if (effText) messages.push(effText);
      messages.push(`造成了${damage}点伤害！`);
    }

    const lastMoveResult: MoveResult = {
      moveName: move.name,
      typeEffectiveness,
      wasCritical: critical,
      damage,
    };

    // Check if enemy fainted
    if (updatedDefender.currentHp <= 0) {
      messages.push(`${defenderName}倒下了！`);

      // Award experience
      const expGain = calculateExpGain(defender, state.isWildBattle);
      const expAttacker = updatedAttacker;
      // Add exp to the attacker
      const expUpdatedAttacker = {
        ...expAttacker,
        experience: expAttacker.experience + expGain,
      };
      const expParty = newParty.map((p, i) =>
        i === pokemonIndex ? expUpdatedAttacker : p,
      );
      messages.push(`${attackerName}获得了${expGain}点经验值！`);

      // Check level up
      const levelUp = checkLevelUp(expUpdatedAttacker);
      if (levelUp) {
        messages.push(
          `${attackerName}升级到了${levelUp.newLevel}级！`,
        );
      }

      // Determine what happens next
      if (state.isWildBattle) {
        // Wild battle won
        set({
          battleState: {
            ...state,
            playerParty: expParty,
            enemyParty: newEnemyParty,
            messages,
            lastMoveResult,
            phase: BattlePhase.WON,
          },
        });
      } else {
        // Trainer battle - check if enemy has more Pokémon
        const nextEnemyIndex = findNextAlive(
          newEnemyParty,
          state.activeEnemyPokemonIndex + 1,
        );
        if (nextEnemyIndex === -1) {
          // No more enemy Pokémon → won
          set({
            battleState: {
              ...state,
              playerParty: expParty,
              enemyParty: newEnemyParty,
              messages,
              lastMoveResult,
              phase: BattlePhase.WON,
            },
          });
        } else {
          // Enemy sends out next Pokémon
          const nextEnemy = newEnemyParty[nextEnemyIndex];
          const nextEnemyName = getPokemonDisplayName(nextEnemy);
          messages.push(
            `对手训练家派出了${nextEnemyName}！`,
          );
          set({
            battleState: {
              ...state,
              playerParty: expParty,
              enemyParty: newEnemyParty,
              activeEnemyPokemonIndex: nextEnemyIndex,
              messages,
              lastMoveResult,
              phase: BattlePhase.PLAYER_CHOOSING,
            },
          });
        }
      }
      return;
    }

    // Enemy survived → enemy's turn
    set({
      battleState: {
        ...state,
        playerParty: newParty,
        enemyParty: newEnemyParty,
        messages,
        lastMoveResult,
        phase: BattlePhase.ENEMY_TURN,
      },
    });
  },

  processEnemyTurn: () => {
    const state = get().battleState;
    if (state.phase !== BattlePhase.ENEMY_TURN) return;

    const enemy = state.enemyParty[state.activeEnemyPokemonIndex];
    if (!enemy || enemy.currentHp <= 0) return;

    const defender = state.playerParty[state.activePlayerPokemonIndex];
    if (!defender || defender.currentHp <= 0) return;

    // AI select move
    const moveSlotIndex = selectEnemyMove(enemy);
    let moveSlot = moveSlotIndex >= 0 ? enemy.moves[moveSlotIndex] : undefined;

    // If no valid move (all out of PP), use Struggle
    const isStruggle = !moveSlot || moveSlot.currentPp <= 0;

    let moveName = '挣扎';
    let movePower = 50;
    let moveAccuracy = 100;
    let moveType = StatusEffect.NONE as unknown as string; // typeless for struggle

    if (!isStruggle) {
      const move = getMove(moveSlot!.moveId);
      if (move) {
        moveName = move.name;
        movePower = move.power ?? 0;
        moveAccuracy = move.accuracy ?? 100;
        moveType = move.type as unknown as string;
      }
    }

    const enemyName = getPokemonDisplayName(enemy);
    const defenderName = getPokemonDisplayName(defender);

    const messages: string[] = [...state.messages];
    messages.push(`对手的${enemyName}使用了${moveName}！`);

    // PP deduction for real moves
    let updatedEnemyMoves = enemy.moves;
    if (!isStruggle && moveSlotIndex >= 0) {
      updatedEnemyMoves = enemy.moves.map((m, i) =>
        i === moveSlotIndex
          ? { ...m, currentPp: Math.max(0, m.currentPp - 1) }
          : m,
      );
    }

    const updatedEnemy = { ...enemy, moves: updatedEnemyMoves };
    const newEnemyParty = state.enemyParty.map((p, i) =>
      i === state.activeEnemyPokemonIndex ? updatedEnemy : p,
    );

    // Accuracy check
    const hit = isStruggle || Math.random() * 100 < moveAccuracy;
    if (!hit) {
      messages.push('对手的攻击没有命中！');
    } else {
      // Calculate damage using the same formula
      const fakeMove = {
        id: -1,
        name: moveName,
        type: moveType as any,
        category: 'PHYSICAL' as const,
        power: movePower,
        accuracy: moveAccuracy,
        pp: 0,
        description: '',
        effect: 'none',
        effectChance: null,
      };

      const { damage, critical, typeEffectiveness } = calculateDamage(
        fakeMove as any,
        updatedEnemy,
        defender,
      );

      // Apply damage to player
      const updatedDefender = {
        ...defender,
        currentHp: Math.max(0, defender.currentHp - damage),
      };
      const newParty = state.playerParty.map((p, i) =>
        i === state.activePlayerPokemonIndex ? updatedDefender : p,
      );

      if (typeEffectiveness === 0) {
        messages.push(`对${defenderName}没有效果...`);
      } else {
        if (critical) {
          messages.push('会心一击！');
        }
        const effText = getEffectivenessText(typeEffectiveness);
        if (effText) messages.push(effText);
        messages.push(`造成了${damage}点伤害！`);
      }

      // Apply end-of-turn effects to both sides
      const playerEot = applyEndOfTurnEffects(updatedDefender);
      const enemyEot = applyEndOfTurnEffects(updatedEnemy);

      let finalPlayerPokemon = updatedDefender;
      let finalEnemyPokemon = updatedEnemy;

      if (playerEot.damage > 0) {
        finalPlayerPokemon = {
          ...updatedDefender,
          currentHp: Math.max(0, updatedDefender.currentHp - playerEot.damage),
        };
        const statusName =
          updatedDefender.statusEffect === StatusEffect.BURN ? '灼伤' : '中毒';
        messages.push(
          `${defenderName}受到了${statusName}的伤害(${playerEot.damage}点)！`,
        );
      }

      if (enemyEot.damage > 0) {
        finalEnemyPokemon = {
          ...updatedEnemy,
          currentHp: Math.max(0, updatedEnemy.currentHp - enemyEot.damage),
        };
        const statusName =
          updatedEnemy.statusEffect === StatusEffect.BURN ? '灼伤' : '中毒';
        messages.push(
          `${enemyName}受到了${statusName}的伤害(${enemyEot.damage}点)！`,
        );
      }

      // Update parties with EOT effects
      const finalParty = newParty.map((p, i) =>
        i === state.activePlayerPokemonIndex ? finalPlayerPokemon : p,
      );
      const finalEnemyParty2 = newEnemyParty.map((p, i) =>
        i === state.activeEnemyPokemonIndex ? finalEnemyPokemon : p,
      );

      // Check player fainted
      if (finalPlayerPokemon.currentHp <= 0) {
        messages.push(`${defenderName}倒下了！`);

        // Find next alive player Pokémon
        const nextPlayerIndex = findNextAlive(
          finalParty,
          state.activePlayerPokemonIndex + 1,
        );

        if (nextPlayerIndex === -1) {
          // All fainted → lost
          set({
            battleState: {
              ...state,
              playerParty: finalParty,
              enemyParty: finalEnemyParty2,
              messages,
              phase: BattlePhase.LOST,
            },
          });
          return;
        }

        // Auto-switch to next alive Pokémon
        const nextMon = finalParty[nextPlayerIndex];
        const nextName = getPokemonDisplayName(nextMon);
        messages.push(`上场吧！${nextName}！`);

        set({
          battleState: {
            ...state,
            playerParty: finalParty,
            enemyParty: finalEnemyParty2,
            activePlayerPokemonIndex: nextPlayerIndex,
            messages,
            phase: BattlePhase.PLAYER_CHOOSING,
          },
        });
        return;
      }

      // Check enemy fainted from EOT
      if (finalEnemyPokemon.currentHp <= 0) {
        messages.push(`${enemyName}倒下了！`);

        // Award experience
        const expGain = calculateExpGain(finalEnemyPokemon, state.isWildBattle);
        const defenderMon = finalParty[state.activePlayerPokemonIndex];
        const expMon = {
          ...defenderMon,
          experience: defenderMon.experience + expGain,
        };
        const expParty = finalParty.map((p, i) =>
          i === state.activePlayerPokemonIndex ? expMon : p,
        );
        messages.push(`${getPokemonDisplayName(expMon)}获得了${expGain}点经验值！`);

        const levelUp = checkLevelUp(expMon);
        if (levelUp) {
          messages.push(
            `${getPokemonDisplayName(expMon)}升级到了${levelUp.newLevel}级！`,
          );
        }

        if (state.isWildBattle) {
          set({
            battleState: {
              ...state,
              playerParty: expParty,
              enemyParty: finalEnemyParty2,
              messages,
              phase: BattlePhase.WON,
            },
          });
          return;
        }

        // Trainer battle - check for more enemies
        const nextEnemyIndex = findNextAlive(
          finalEnemyParty2,
          state.activeEnemyPokemonIndex + 1,
        );
        if (nextEnemyIndex === -1) {
          set({
            battleState: {
              ...state,
              playerParty: expParty,
              enemyParty: finalEnemyParty2,
              messages,
              phase: BattlePhase.WON,
            },
          });
          return;
        }

        const nextEnemy = finalEnemyParty2[nextEnemyIndex];
        messages.push(
          `对手训练家派出了${getPokemonDisplayName(nextEnemy)}！`,
        );
        set({
          battleState: {
            ...state,
            playerParty: expParty,
            enemyParty: finalEnemyParty2,
            activeEnemyPokemonIndex: nextEnemyIndex,
            messages,
            phase: BattlePhase.PLAYER_CHOOSING,
          },
        });
        return;
      }

      // Both sides survived → advance turn
      set({
        battleState: {
          ...state,
          playerParty: finalParty,
          enemyParty: finalEnemyParty2,
          messages,
          currentTurn: state.currentTurn + 1,
          phase: BattlePhase.PLAYER_CHOOSING,
        },
      });
      return;
    }

    // Missed → player's turn
    set({
      battleState: {
        ...state,
        enemyParty: newEnemyParty,
        messages,
        currentTurn: state.currentTurn + 1,
        phase: BattlePhase.PLAYER_CHOOSING,
      },
    });
  },

  useItem: (itemId, targetPokemonIndex) => {
    const state = get().battleState;
    if (state.phase !== BattlePhase.PLAYER_CHOOSING) return;

    const item = getItem(itemId);
    if (!item) return;

    const messages: string[] = [...state.messages];

    if (item.type === 'POTION') {
      // Effect format: "heal:X"
      const healAmount = parseInt(item.effect.split(':')[1] ?? '20', 10);
      const target = state.playerParty[targetPokemonIndex];
      if (!target || target.currentHp <= 0) {
        messages.push('无法对目标使用该道具！');
        set({
          battleState: {
            ...state,
            messages,
          },
        });
        return;
      }

      const newHp = Math.min(target.maxHp, target.currentHp + healAmount);
      const actualHeal = newHp - target.currentHp;
      const updatedTarget = { ...target, currentHp: newHp };
      const newParty = state.playerParty.map((p, i) =>
        i === targetPokemonIndex ? updatedTarget : p,
      );

      messages.push(
        `对${getPokemonDisplayName(target)}使用了${item.name}，回复了${actualHeal}点HP！`,
      );

      // Remove item from inventory
      usePlayerStore.getState().useItem(itemId);

      set({
        battleState: {
          ...state,
          playerParty: newParty,
          messages,
          phase: BattlePhase.ENEMY_TURN,
        },
      });
    } else if (item.type === 'STATUS_HEAL') {
      // Effect format: "cure:STATUS"
      const targetStatus = item.effect.split(':')[1] ?? '';
      const target = state.playerParty[targetPokemonIndex];
      if (!target) return;

      if (target.statusEffect !== targetStatus) {
        messages.push('目标没有这种异常状态！');
        set({
          battleState: {
            ...state,
            messages,
          },
        });
        return;
      }

      const updatedTarget = {
        ...target,
        statusEffect: StatusEffect.NONE as any,
      };
      const newParty = state.playerParty.map((p, i) =>
        i === targetPokemonIndex ? updatedTarget : p,
      );

      messages.push(
        `对${getPokemonDisplayName(target)}使用了${item.name}，治愈了异常状态！`,
      );

      // Remove item from inventory
      usePlayerStore.getState().useItem(itemId);

      set({
        battleState: {
          ...state,
          playerParty: newParty,
          messages,
          phase: BattlePhase.ENEMY_TURN,
        },
      });
    } else {
      messages.push(`使用了${item.name}，但在这里似乎没有效果...`);
      set({
        battleState: {
          ...state,
          messages,
        },
      });
    }
  },

  tryCatch: (pokeballItemId) => {
    const state = get().battleState;
    if (!state.isWildBattle) {
      get().addMessage('不能对训练家的宝可梦使用精灵球！');
      return;
    }

    if (state.phase !== BattlePhase.PLAYER_CHOOSING) return;

    const item = getItem(pokeballItemId);
    if (!item || item.type !== 'POKEBALL') return;

    const enemy = state.enemyParty[state.activeEnemyPokemonIndex];
    if (!enemy || enemy.currentHp <= 0) return;

    const messages: string[] = [...state.messages];
    messages.push(`扔出了${item.name}！`);

    // Use the item from inventory
    usePlayerStore.getState().useItem(pokeballItemId);

    const pokeballBonus = getPokeballBonus(item.effect);
    const statusMultiplier = getCatchStatusMultiplier(enemy.statusEffect);

    const success = calculateCatchSuccess(
      enemy,
      pokeballBonus,
      statusMultiplier,
    );

    if (success) {
      messages.push('太好了！成功捕获了！');

      // Add caught Pokémon to player's party
      usePlayerStore.getState().addPokemon(enemy);

      set({
        battleState: {
          ...state,
          messages,
          phase: BattlePhase.WON,
        },
      });
    } else {
      messages.push('噢不！精灵球被弹开了！');

      set({
        battleState: {
          ...state,
          messages,
          phase: BattlePhase.ENEMY_TURN,
        },
      });
    }
  },

  tryRun: () => {
    const state = get().battleState;
    if (!state.isWildBattle) {
      get().addMessage('不能从训练家战斗中逃跑！');
      return;
    }

    if (state.phase !== BattlePhase.PLAYER_CHOOSING) return;

    const player = state.playerParty[state.activePlayerPokemonIndex];
    const enemy = state.enemyParty[state.activeEnemyPokemonIndex];

    if (!player || !enemy) return;

    const success = calculateRunSuccess(player, enemy);

    const messages: string[] = [...state.messages];
    if (success) {
      messages.push('成功逃跑了！');
      set({
        battleState: {
          ...state,
          messages,
          phase: BattlePhase.RUN,
        },
      });
    } else {
      messages.push('无法逃跑！');
      set({
        battleState: {
          ...state,
          messages,
          phase: BattlePhase.ENEMY_TURN,
        },
      });
    }
  },

  nextTurn: () =>
    set((state) => ({
      battleState: {
        ...state.battleState,
        currentTurn: state.battleState.currentTurn + 1,
        phase: BattlePhase.PLAYER_CHOOSING,
        lastMoveResult: null,
      },
    })),

  addMessage: (message) =>
    set((state) => ({
      battleState: {
        ...state.battleState,
        messages: [...state.battleState.messages, message],
      },
    })),

  setActivePlayerPokemon: (index) =>
    set((state) => ({
      battleState: {
        ...state.battleState,
        activePlayerPokemonIndex: index,
      },
    })),

  switchPokemon: (partyIndex) => {
    const state = get().battleState;
    if (state.phase !== BattlePhase.PLAYER_CHOOSING) return;

    const target = state.playerParty[partyIndex];
    if (!target || target.currentHp <= 0) return;
    if (partyIndex === state.activePlayerPokemonIndex) return;

    const messages: string[] = [...state.messages];
    messages.push(
      `回来吧！${getPokemonDisplayName(state.playerParty[state.activePlayerPokemonIndex])}！`,
    );
    messages.push(`上吧！${getPokemonDisplayName(target)}！`);

    set({
      battleState: {
        ...state,
        activePlayerPokemonIndex: partyIndex,
        messages,
        phase: BattlePhase.ENEMY_TURN,
      },
    });
  },

  resetBattle: () => set({ battleState: defaultBattleState() }),
}));
