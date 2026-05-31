import { useRef, useEffect } from 'react';
import { useMapStore } from '../../stores/mapStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { getTileColor } from '../../systems/mapSystem.ts';
import { TILE_SIZE } from '../../data/constants.ts';
import { TileType } from '../../types/map.ts';

const CANVAS_W = 640;
const CANVAS_H = 480;

/** Draw a simple colored rectangle as player sprite. */
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;

  // Body
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(px + 4, py + 8, TILE_SIZE - 8, TILE_SIZE - 8);
  // Head
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(px + TILE_SIZE / 2, py + 8, 7, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a simple NPC. */
function drawNpc(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;

  ctx.fillStyle = color;
  ctx.fillRect(px + 4, py + 8, TILE_SIZE - 8, TILE_SIZE - 8);
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(px + TILE_SIZE / 2, py + 8, 7, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a single tile. */
function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: number,
  x: number,
  y: number,
): void {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;

  ctx.fillStyle = getTileColor(tile);
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Extra detail for specific tile types
  if (tile === TileType.TALL_GRASS) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 3; i++) {
      const bladeX = px + 6 + i * 10;
      const bladeTop = py + 4;
      ctx.fillRect(bladeX, bladeTop, 2, TILE_SIZE - 8);
    }
  }
  if (tile === TileType.DOOR) {
    ctx.fillStyle = '#a83232';
    ctx.fillRect(px + 4, py + 2, 4, TILE_SIZE - 4);
    ctx.fillRect(px + TILE_SIZE - 8, py + 2, 4, TILE_SIZE - 4);
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE - 8, py + TILE_SIZE / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const map = useMapStore((s) => s.currentMap);
  const npcs = useMapStore((s) => s.visibleNPCs);
  const player = usePlayerStore((s) => s.playerData);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Camera offset: center player on canvas
    const playerTileX = player.position.x;
    const playerTileY = player.position.y;
    const offsetX = Math.round(CANVAS_W / 2 - playerTileX * TILE_SIZE);
    const offsetY = Math.round(CANVAS_H / 2 - playerTileY * TILE_SIZE);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Draw tiles
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const tile = map.tiles[row]?.[col] ?? TileType.GRASS;
        drawTile(ctx, tile, col, row);
      }
    }

    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let row = 0; row <= map.height; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * TILE_SIZE);
      ctx.lineTo(map.width * TILE_SIZE, row * TILE_SIZE);
      ctx.stroke();
    }
    for (let col = 0; col <= map.width; col++) {
      ctx.beginPath();
      ctx.moveTo(col * TILE_SIZE, 0);
      ctx.lineTo(col * TILE_SIZE, map.height * TILE_SIZE);
      ctx.stroke();
    }

    // Draw NPCs
    for (const npc of npcs) {
      drawNpc(ctx, npc.x, npc.y, '#ef4444');
    }

    // Draw player
    drawPlayer(ctx, player.position.x, player.position.y);

    ctx.restore();
  }, [map, npcs, player.position.x, player.position.y, player.position.direction]);

  if (!map) {
    return (
      <div
        className="flex items-center justify-center bg-gray-900"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        <p className="text-gray-500">加载地图中...</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="block mx-auto"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
