import { useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameState } from './types/game.ts';
import { useGameStore } from './stores/gameStore.ts';
import { useAudioStore } from './stores/audioStore.ts';
import { usePlayerStore } from './stores/playerStore.ts';
import { useMapStore } from './stores/mapStore.ts';
import { useBattleStore } from './stores/battleStore.ts';
import { useDialogueStore } from './stores/dialogueStore.ts';
import { useKeyboard } from './hooks/useKeyboard.ts';
import { canMoveTo, checkWarpPoint, isEncounterTile, getFacingTile, createWildPokemon } from './systems/mapSystem.ts';
import { checkQuestCompletion } from './systems/questSystem.ts';
import { dialogueTrees } from './data/dialogues.ts';
import { questList } from './data/quests.ts';

import TitleScreen from './components/ui/TitleScreen.tsx';
import MainMenu from './components/ui/MainMenu.tsx';
import PokemonSummary from './components/ui/PokemonSummary.tsx';
import InventoryScreen from './components/ui/InventoryScreen.tsx';
import MapCanvas from './components/map/MapCanvas.tsx';
import OverworldHUD from './components/map/OverworldHUD.tsx';
import { BattleScreen } from './components/battle/BattleScreen.tsx';
import { DialogueBox } from './components/dialogue/DialogueBox.tsx';

/* ─── Overworld screen with keyboard controls ─── */

function OverworldScreen() {
  const map = useMapStore((s) => s.currentMap);
  const loadMap = useMapStore((s) => s.loadMap);
  const player = usePlayerStore((s) => s.playerData);
  const movePlayer = usePlayerStore((s) => s.movePlayer);
  const setDirection = usePlayerStore((s) => s.setDirection);
  const setPosition = usePlayerStore((s) => s.setPosition);

  const startBattle = useBattleStore((s) => s.startBattle);
  const resetBattle = useBattleStore((s) => s.resetBattle);
  const enterBattle = useGameStore((s) => s.enterBattle);
  const openDialogue = useGameStore((s) => s.openDialogue);
  const openMenu = useGameStore((s) => s.openMenu);
  const playSfx = useAudioStore((s) => s.playSfx);
  const stepCounterTick = useMapStore((s) => s.stepCounterTick);
  const npcs = useMapStore((s) => s.visibleNPCs);
  const interactWithNPC = useMapStore((s) => s.interactWithNPC);
  const startDialogue = useDialogueStore((s) => s.startDialogue);
  const dialogueIsActive = useDialogueStore((s) => s.isActive);

  // Load initial map
  useEffect(() => {
    if (!map) {
      loadMap(player.position.mapId);
    }
  }, [map, loadMap, player.position.mapId]);

  // Handle movement
  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (!map || dialogueIsActive) return;

      const newX = player.position.x + dx;
      const newY = player.position.y + dy;

      if (!canMoveTo(map, newX, newY, npcs)) {
        setDirection(dx, dy);
        return;
      }

      movePlayer(dx, dy, player.position.mapId);
      playSfx('select');

      // Check warp points
      const warp = checkWarpPoint(map, newX, newY);
      if (warp) {
        loadMap(warp.targetMapId);
        setPosition(warp.targetX, warp.targetY, warp.targetMapId, player.position.direction);
        return;
      }

      // Check wild encounter
      if (isEncounterTile(map, newX, newY)) {
        const encounter = stepCounterTick();
        if (encounter) {
          const wildPokemon = createWildPokemon(encounter.speciesId, encounter.level);
          resetBattle();
          startBattle([player.party[0]], [wildPokemon], true);
          enterBattle();
        }
      }
    },
    [map, player, npcs, dialogueIsActive, movePlayer, setDirection, loadMap, setPosition, playSfx, stepCounterTick, resetBattle, startBattle, enterBattle],
  );

  // Handle interact (Z key)
  const handleInteract = useCallback(() => {
    if (!map || dialogueIsActive) return;

    const facing = getFacingTile(player);
    const npc = interactWithNPC(facing.x, facing.y);

    if (npc) {
      const tree = dialogueTrees[npc.dialogueTreeId];
      if (tree) {
        // Check for quest completion before starting dialogue
        const questsForNpc = questList.filter((q) => q.npcGiverId === npc.npcId);
        for (const quest of questsForNpc) {
          const progress = player.questLog.find((q) => q.questId === quest.id);
          if (progress && checkQuestCompletion(quest, progress)) {
            // Auto-complete quest via dialogue — the dialogue tree handles this
            break;
          }
        }

        startDialogue(tree);
        openDialogue();
        playSfx('confirm');
      }
    }
  }, [map, player, npcs, dialogueIsActive, interactWithNPC, player.questLog, startDialogue, openDialogue, playSfx]);

  // Handle menu (Enter/Escape key)
  const handleMenu = useCallback(() => {
    if (dialogueIsActive) return;
    playSfx('confirm');
    openMenu();
  }, [dialogueIsActive, playSfx, openMenu]);

  useKeyboard({
    onMove: handleMove,
    onInteract: handleInteract,
    onMenu: handleMenu,
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
      <div
        className="relative overflow-hidden"
        style={{ width: 640, height: 480 }}
      >
        <MapCanvas />
      </div>
    </div>
  );
}

/* ─── BGM auto-switcher ─── */

function BgmManager() {
  const gameState = useGameStore((s) => s.gameState);
  const playBgm = useAudioStore((s) => s.playBgm);

  useEffect(() => {
    switch (gameState) {
      case GameState.TITLE:
        playBgm('title');
        break;
      case GameState.OVERWORLD:
      case GameState.MENU:
        playBgm('town');
        break;
      case GameState.BATTLE:
        playBgm('battle');
        break;
      case GameState.POKEMON_SUMMARY:
      case GameState.INVENTORY:
        break;
      default:
        break;
    }
  }, [gameState, playBgm]);

  return null;
}

/* ─── Shop screen placeholder ─── */

function ShopScreen() {
  const closeShop = useGameStore((s) => s.closeShop);

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-br from-amber-50 to-white flex flex-col items-center justify-center">
      <p className="text-gray-400 text-lg mb-4">商店（开发中）</p>
      <button
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        onClick={closeShop}
      >
        离开
      </button>
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const gameState = useGameStore((s) => s.gameState);
  const exitBattle = useGameStore((s) => s.exitBattle);

  const handleEndBattle = useCallback(() => {
    exitBattle();
  }, [exitBattle]);

  return (
    <div className="h-screen w-screen overflow-hidden font-sans">
      <BgmManager />

      <AnimatePresence mode="wait">
        {gameState === GameState.TITLE && (
          <TitleScreen key="title" />
        )}

        {(gameState === GameState.OVERWORLD || gameState === GameState.DIALOGUE) && (
          <div key="overworld" className="absolute inset-0">
            <OverworldScreen />
            <OverworldHUD />
            <DialogueBox />
          </div>
        )}

        {gameState === GameState.BATTLE && (
          <BattleScreen key="battle" onEndBattle={handleEndBattle} />
        )}

        {gameState === GameState.MENU && (
          <>
            <div key="overworld-bg" className="absolute inset-0">
              <OverworldScreen />
              <OverworldHUD />
            </div>
            <MainMenu key="menu" />
          </>
        )}

        {gameState === GameState.POKEMON_SUMMARY && (
          <PokemonSummary key="summary" />
        )}

        {gameState === GameState.INVENTORY && (
          <InventoryScreen key="inventory" />
        )}

        {gameState === GameState.SHOP && (
          <ShopScreen key="shop" />
        )}
      </AnimatePresence>
    </div>
  );
}
