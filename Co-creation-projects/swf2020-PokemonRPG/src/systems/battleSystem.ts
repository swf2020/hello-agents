import type { Move } from '../types/move.ts';
import type { Pokemon, Stats } from '../types/pokemon.ts';
import { StatusEffect, PokemonType } from '../types/pokemon.ts';
import { MoveCategory } from '../types/move.ts';
import { getTypeEffectiveness } from '../data/typeChart.ts';
import { getMove } from '../data/moves.ts';
import { getSpecies } from '../data/species.ts';
import { GROWTH_RATE_MEDIUM_FAST, CATCH_STATUS_BONUS } from '../data/constants.ts';

/**
 * Damage calculation using Pokémon-style formula:
 * ((2 * level / 5 + 2) * power * (atk / def) / 50 + 2) * typeEffectiveness * critical * random(0.85, 1.0)
 *
 * - PHYSICAL moves use atk/def
 * - SPECIAL moves use spAtk/spDef
 * - STATUS moves return 0 damage
 */
export function calculateDamage(
  move: Move,
  attacker: Pokemon,
  defender: Pokemon,
): { damage: number; critical: boolean; typeEffectiveness: number } {
  // Status moves deal no damage
  if (move.category === MoveCategory.STATUS || !move.power) {
    return { damage: 0, critical: false, typeEffectiveness: 1 };
  }

  const atkStat =
    move.category === MoveCategory.PHYSICAL
      ? attacker.stats.atk
      : attacker.stats.spAtk;
  const defStat =
    move.category === MoveCategory.PHYSICAL
      ? defender.stats.def
      : defender.stats.spDef;

  const level = attacker.level;
  const power = move.power;

  // Base damage
  const base = Math.floor(
    Math.floor(Math.floor((2 * level) / 5 + 2) * power * (atkStat / defStat)) /
      50 +
      2,
  );

  // Type effectiveness - lookup defender's species for types
  const defenderSpecies = getSpecies(defender.speciesId);
  const defenderTypes = defenderSpecies?.types ?? [PokemonType.NORMAL];
  const typeEffectiveness = getTypeEffectiveness(move.type, defenderTypes);

  // Critical hit: 1/16 chance
  const critical = checkCritical();
  const criticalMultiplier = critical ? 1.5 : 1;

  // Random factor 0.85 - 1.0
  const randomFactor = 0.85 + Math.random() * 0.15;

  // Final damage
  const damage = Math.max(
    1,
    Math.floor(
      base * typeEffectiveness * criticalMultiplier * randomFactor,
    ),
  );

  return { damage, critical, typeEffectiveness };
}

/**
 * Check if a move hits based on its accuracy.
 * Returns true if the move lands.
 */
export function checkHit(move: Move): boolean {
  if (move.accuracy === null) return true; // moves with null accuracy never miss
  return Math.random() * 100 < move.accuracy;
}

/**
 * Check for a critical hit (1/16 chance ≈ 6.25%).
 */
export function checkCritical(): boolean {
  return Math.random() < 1 / 16;
}

/**
 * Apply end-of-turn status effects (burn/poison damage).
 * Burn: 1/8 of max HP
 * Poison: 1/8 of max HP
 */
export function applyEndOfTurnEffects(pokemon: Pokemon): {
  newHp: number;
  damage: number;
} {
  let damage = 0;

  if (pokemon.statusEffect === StatusEffect.BURN) {
    damage = Math.max(1, Math.floor(pokemon.maxHp / 8));
  } else if (pokemon.statusEffect === StatusEffect.POISON) {
    damage = Math.max(1, Math.floor(pokemon.maxHp / 8));
  }

  const newHp = Math.max(0, pokemon.currentHp - damage);
  return { newHp, damage };
}

/**
 * Check if a Pokémon has fainted (currentHp <= 0).
 */
export function isFainted(pokemon: Pokemon): boolean {
  return pokemon.currentHp <= 0;
}

/**
 * Calculate experience gain from defeating a Pokémon.
 * Formula: baseExperience * level / 7
 */
export function calculateExpGain(
  defeatedPokemon: Pokemon,
  isWild: boolean,
): number {
  const species = getSpecies(defeatedPokemon.speciesId);
  const baseExp = species?.baseExperience ?? 60;
  const exp = Math.floor(baseExp * defeatedPokemon.level) / 7;
  // Wild battles give full exp, trainer battles give 1.5x
  const multiplier = isWild ? 1 : 1.5;
  return Math.max(1, Math.floor(exp * multiplier));
}

/**
 * Check if a Pokémon should level up.
 * Returns the new level and stat increases, or null if no level up.
 *
 * Uses medium-fast growth rate: XP needed = (4/5) * level^3
 */
export function checkLevelUp(pokemon: Pokemon): {
  leveledUp: boolean;
  newLevel: number;
  statIncreases: Partial<Stats>;
} | null {
  const species = getSpecies(pokemon.speciesId);
  if (!species) return null;

  let currentLevel = pokemon.level;
  let leveledUp = false;
  const statIncreases: Partial<Stats> = {};

  // Check if enough XP for next level
  while (currentLevel < 100) {
    const xpNeeded = GROWTH_RATE_MEDIUM_FAST(currentLevel + 1);
    if (pokemon.experience >= xpNeeded) {
      currentLevel++;
      leveledUp = true;

      // Calculate stat increase from base stats
      // Each level adds ~1/50 of base stats with some variance
      statIncreases.hp =
        (statIncreases.hp ?? 0) +
        Math.max(1, Math.floor(species.baseStats.hp / 25) + Math.floor(Math.random() * 3));
      statIncreases.atk =
        (statIncreases.atk ?? 0) +
        Math.max(1, Math.floor(species.baseStats.atk / 25) + Math.floor(Math.random() * 2));
      statIncreases.def =
        (statIncreases.def ?? 0) +
        Math.max(1, Math.floor(species.baseStats.def / 25) + Math.floor(Math.random() * 2));
      statIncreases.spAtk =
        (statIncreases.spAtk ?? 0) +
        Math.max(1, Math.floor(species.baseStats.spAtk / 25) + Math.floor(Math.random() * 2));
      statIncreases.spDef =
        (statIncreases.spDef ?? 0) +
        Math.max(1, Math.floor(species.baseStats.spDef / 25) + Math.floor(Math.random() * 2));
      statIncreases.spd =
        (statIncreases.spd ?? 0) +
        Math.max(1, Math.floor(species.baseStats.spd / 25) + Math.floor(Math.random() * 2));
    } else {
      break;
    }
  }

  if (!leveledUp) return null;

  return { leveledUp: true, newLevel: currentLevel, statIncreases };
}

/**
 * Catch rate calculation using simplified Pokémon-style formula.
 * a = ((3 * maxHP - 2 * currentHP) * catchRate * pokeballBonus) / (3 * maxHP) * statusMultiplier
 * If a > random(0, 255), capture succeeds.
 */
export function calculateCatchSuccess(
  targetPokemon: Pokemon,
  pokeballBonus: number,
  statusMultiplier: number,
): boolean {
  const species = getSpecies(targetPokemon.speciesId);
  const catchRate = species?.catchRate ?? 45;
  const maxHp = targetPokemon.maxHp;
  const currentHp = targetPokemon.currentHp;

  const a =
    ((3 * maxHp - 2 * currentHp) * catchRate * pokeballBonus) /
      (3 * maxHp) *
      statusMultiplier;

  // Clamp to 0-255
  const clamped = Math.min(255, Math.max(1, Math.floor(a)));

  return Math.floor(Math.random() * 256) < clamped;
}

/**
 * Get the status multiplier for catch rate calculation.
 */
export function getCatchStatusMultiplier(status: StatusEffect): number {
  return CATCH_STATUS_BONUS[status] ?? 1;
}

/**
 * Get the pokeball bonus multiplier.
 * Standard Poké Ball: 1
 * Super Ball: 1.5
 * Ultra Ball: 2
 * Master Ball: 255 (guaranteed capture)
 */
export function getPokeballBonus(itemEffect: string): number {
  switch (itemEffect) {
    case 'catch':
      return 1;
    case 'catch_better':
      return 1.5;
    case 'catch_best':
      return 2;
    case 'catch_master':
      return 255;
    default:
      return 1;
  }
}

/**
 * AI move selection for enemy Pokémon.
 * Picks the move with the highest power that still has PP.
 * If multiple moves have same power, picks randomly among them.
 * If no moves have PP, returns -1.
 */
export function selectEnemyMove(pokemon: Pokemon): number {
  const availableMoves = pokemon.moves.filter((m) => m.currentPp > 0);

  if (availableMoves.length === 0) return -1;

  // Find the move with the highest power
  let bestMoves: number[] = [];
  let bestPower = -1;

  for (const moveSlot of availableMoves) {
    const move = getMove(moveSlot.moveId);
    // Default power to 0 if null (status moves)
    const power = move?.power ?? 0;
    // Add small random weight for variety
    const weightedPower = power + Math.random() * 5;

    if (weightedPower > bestPower) {
      bestPower = weightedPower;
      bestMoves = [moveSlot.moveId];
    } else if (weightedPower === bestPower) {
      bestMoves.push(moveSlot.moveId);
    }
  }

  // Pick randomly among best moves
  const chosenMoveId = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  // Find the index in the pokemon's moves array
  return pokemon.moves.findIndex((m) => m.moveId === chosenMoveId);
}

/**
 * Attempt to flee from a wild battle.
 * Formula: escapeChance = (playerSpeed * 128 / enemySpeed + 30) % 256
 * If escapeChance > 255, auto-run. Otherwise compare with random(0, 255).
 * Simplified: compare speed ratio.
 */
export function calculateRunSuccess(
  playerPokemon: Pokemon,
  enemyPokemon: Pokemon,
): boolean {
  const playerSpeed = playerPokemon.stats.spd;
  const enemySpeed = enemyPokemon.stats.spd;

  // Always at least 30% chance, scales with speed ratio
  const escapeChance = Math.min(
    95,
    Math.floor((playerSpeed * 128) / enemySpeed + 30),
  );

  // Cap at 255 for the formula
  const clamped = Math.min(255, escapeChance);

  return Math.floor(Math.random() * 256) < clamped;
}

/**
 * Get the display name for a Pokémon (nickname > species name > fallback).
 */
export function getPokemonDisplayName(pokemon: Pokemon): string {
  if (pokemon.nickname) return pokemon.nickname;
  const species = getSpecies(pokemon.speciesId);
  return species?.name ?? '未知';
}

/**
 * Get the type color class for a Pokémon type.
 * Returns Tailwind CSS classes.
 */
export function getTypeColor(type: PokemonType): string {
  const typeColorMap: Record<PokemonType, string> = {
    [PokemonType.NORMAL]: 'bg-gray-400',
    [PokemonType.FIRE]: 'bg-orange-500',
    [PokemonType.WATER]: 'bg-blue-500',
    [PokemonType.GRASS]: 'bg-green-500',
    [PokemonType.ELECTRIC]: 'bg-yellow-400',
    [PokemonType.ICE]: 'bg-cyan-300',
    [PokemonType.FIGHTING]: 'bg-red-600',
    [PokemonType.POISON]: 'bg-purple-500',
    [PokemonType.GROUND]: 'bg-amber-600',
    [PokemonType.FLYING]: 'bg-indigo-300',
    [PokemonType.PSYCHIC]: 'bg-pink-500',
    [PokemonType.BUG]: 'bg-lime-500',
    [PokemonType.ROCK]: 'bg-yellow-700',
    [PokemonType.GHOST]: 'bg-violet-700',
    [PokemonType.DRAGON]: 'bg-indigo-600',
  };
  return typeColorMap[type] ?? 'bg-gray-400';
}

/**
 * Get the text color class for a Pokémon type (for text on type badges).
 */
export function getTypeTextColor(type: PokemonType): string {
  const darkTypes: PokemonType[] = [
    PokemonType.NORMAL,
    PokemonType.ELECTRIC,
    PokemonType.ICE,
    PokemonType.BUG,
  ];
  return darkTypes.includes(type) ? 'text-gray-900' : 'text-white';
}

/**
 * Get the effectiveness description text in Chinese.
 */
export function getEffectivenessText(multiplier: number): string | null {
  if (multiplier === 0) return '对目标没有效果...';
  if (multiplier > 1) return '效果拔群！';
  if (multiplier < 1) return '效果不是很理想...';
  return null;
}

/**
 * Check if a Pokémon's status prevents it from moving this turn.
 * Returns a reason message or null if it can act.
 * Includes self-hit damage for confusion.
 */
export function getStatusBlockReason(pokemon: Pokemon): {
  blocked: boolean;
  message: string | null;
  selfDamage?: number;
} {
  const name = getPokemonDisplayName(pokemon);

  if (pokemon.statusEffect === StatusEffect.SLEEP) {
    return { blocked: true, message: `${name}正在睡觉...` };
  }

  if (pokemon.statusEffect === StatusEffect.FREEZE) {
    // 20% chance to thaw each turn
    if (Math.random() < 0.2) {
      return { blocked: false, message: `${name}解冻了！` };
    }
    return { blocked: true, message: `${name}被冻住了，无法行动...` };
  }

  if (pokemon.statusEffect === StatusEffect.CONFUSE) {
    // 33% chance to hit self
    if (Math.random() < 1 / 3) {
      const selfDamage = Math.max(
        1,
        Math.floor(
          ((2 * pokemon.level) / 5 + 2) * 40 * (pokemon.stats.atk / pokemon.stats.def) / 50 + 2,
        ),
      );
      return {
        blocked: true,
        message: `${name}混乱了，攻击了自己！`,
        selfDamage,
      };
    }
    return { blocked: false, message: null };
  }

  if (pokemon.statusEffect === StatusEffect.PARALYZE) {
    // 25% chance to be fully paralyzed
    if (Math.random() < 0.25) {
      return { blocked: true, message: `${name}麻痹了，无法行动！` };
    }
    return { blocked: false, message: null };
  }

  return { blocked: false, message: null };
}
