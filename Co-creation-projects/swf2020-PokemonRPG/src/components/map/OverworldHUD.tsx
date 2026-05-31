import { useMapStore } from '../../stores/mapStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';

export default function OverworldHUD() {
  const map = useMapStore((s) => s.currentMap);
  const party = usePlayerStore((s) => s.playerData.party);
  const badges = usePlayerStore((s) => s.playerData.badges);
  const openMenu = useGameStore((s) => s.openMenu);
  const playSfx = useAudioStore((s) => s.playSfx);

  const aliveCount = party.filter((p) => p.currentHp > 0).length;

  return (
    <div className="absolute top-0 inset-x-0 pointer-events-none z-10">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Location name */}
        {map && (
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium shadow-lg">
            {map.name}
          </div>
        )}

        {/* Status indicators */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Badges */}
          {badges.length > 0 && (
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1 text-sm">
              <span className="text-yellow-400">⭐</span>
              <span className="text-white font-medium">{badges.length}</span>
            </div>
          )}

          {/* Party HP summary */}
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
            <span className="text-white">宝可梦</span>
            <span className="text-green-400 font-bold">{aliveCount}</span>
            <span className="text-gray-400">/</span>
            <span className="text-white">{party.length}</span>
          </div>

          {/* Menu button */}
          <button
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-sm font-bold
                       shadow-lg transition-colors cursor-pointer"
            onClick={() => {
              playSfx('confirm');
              openMenu();
            }}
          >
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
