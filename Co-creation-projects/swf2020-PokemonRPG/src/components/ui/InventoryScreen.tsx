import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../../types/game.ts';
import { useGameStore } from '../../stores/gameStore.ts';
import { usePlayerStore } from '../../stores/playerStore.ts';
import { useAudioStore } from '../../stores/audioStore.ts';
import { getItem } from '../../data/items.ts';
import { ItemType } from '../../types/item.ts';
import type { Item } from '../../types/item.ts';

/* ─── category config ─── */

interface Category {
  key: string;
  label: string;
  filter: (item: Item) => boolean;
}

const categories: Category[] = [
  { key: 'all', label: '全部', filter: () => true },
  { key: ItemType.POKEBALL, label: '精灵球', filter: (i) => i.type === ItemType.POKEBALL },
  { key: ItemType.POTION, label: '药品', filter: (i) => i.type === ItemType.POTION },
  {
    key: 'status',
    label: '状态恢复',
    filter: (i) =>
      i.type === ItemType.STATUS_HEAL || i.type === ItemType.REVIVE,
  },
  {
    key: 'other',
    label: '其他',
    filter: (i) =>
      !([ItemType.POKEBALL, ItemType.POTION, ItemType.STATUS_HEAL, ItemType.REVIVE] as ItemType[]).includes(
        i.type,
      ),
  },
];

/* ─── component ─── */

export default function InventoryScreen() {
  const setGameState = useGameStore((s) => s.setGameState);
  const inventory = usePlayerStore((s) => s.playerData.inventory);
  const useItem = usePlayerStore((s) => s.useItem);
  const playSfx = useAudioStore((s) => s.playSfx);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  /* ── close ── */
  const goBack = useCallback(() => {
    playSfx('cancel');
    setGameState(GameState.MENU);
  }, [playSfx, setGameState]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goBack]);

  /* ── build display list ── */
  const currentCategory = categories.find((c) => c.key === activeTab)!;

  const displayItems = useMemo(() => {
    return inventory
      .map((inv) => {
        const item = getItem(inv.itemId);
        return item ? { ...item, quantity: inv.quantity } : null;
      })
      .filter((entry): entry is Item & { quantity: number } => entry !== null)
      .filter((entry) => currentCategory.filter(entry));
  }, [inventory, activeTab]);

  const selectedItem = selectedItemId ? getItem(selectedItemId) : null;

  const handleUse = (itemId: number) => {
    playSfx('confirm');
    useItem(itemId);
  };

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
        <h2 className="text-xl font-bold text-gray-800">背包</h2>
        <button
          className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium
                     transition-colors cursor-pointer"
          onClick={goBack}
        >
          返回
        </button>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-gray-100 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0
                        ${
                          activeTab === cat.key
                            ? 'bg-blue-500 text-white shadow'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
            onClick={() => {
              playSfx('select');
              setActiveTab(cat.key);
              setSelectedItemId(null);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Item list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          <AnimatePresence mode="wait">
            {displayItems.length === 0 && (
              <motion.p
                key="empty"
                className="text-gray-400 text-center pt-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                没有道具
              </motion.p>
            )}

            {displayItems.map((entry, i) => (
              <motion.div
                key={entry.id}
                className={`rounded-xl border-2 p-3 flex items-center gap-4 cursor-pointer transition-colors
                            ${
                              selectedItemId === entry.id
                                ? 'border-blue-400 bg-blue-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  playSfx('select');
                  setSelectedItemId(entry.id === selectedItemId ? null : entry.id);
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* icon placeholder */}
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
                  {entry.type === ItemType.POKEBALL
                    ? '🔴'
                    : entry.type === ItemType.POTION
                      ? '🧪'
                      : entry.type === ItemType.STATUS_HEAL
                        ? '💊'
                        : '📦'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 truncate">{entry.name}</span>
                    <span className="text-sm text-gray-500 ml-2 tabular-nums shrink-0">
                      ×{entry.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{entry.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Detail / selected panel ── */}
        <AnimatePresence mode="wait">
          {selectedItem && (() => {
            const invEntry = inventory.find((i) => i.itemId === selectedItem.id);
            const qty = invEntry?.quantity ?? 0;
            return (
              <motion.div
                key={selectedItem.id}
                className="w-64 shrink-0 bg-white rounded-xl border border-gray-200 shadow-lg p-5 flex flex-col"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-4">
                  {selectedItem.type === ItemType.POKEBALL
                    ? '🔴'
                    : selectedItem.type === ItemType.POTION
                      ? '🧪'
                      : selectedItem.type === ItemType.STATUS_HEAL
                        ? '💊'
                        : '📦'}
                </div>

                <h3 className="text-lg font-bold text-gray-800 text-center mb-1">
                  {selectedItem.name}
                </h3>
                <p className="text-xs text-gray-400 text-center mb-2">
                  持有数量: {qty}
                </p>
                <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
                  {selectedItem.description}
                </p>

                <div className="mt-auto space-y-2">
                  <button
                    className="w-full py-2 rounded-lg bg-blue-500 text-white font-medium
                               hover:bg-blue-600 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={qty <= 0}
                    onClick={() => handleUse(selectedItem.id)}
                  >
                    使用
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">
                    买入: ¥{selectedItem.buyPrice} · 卖出: ¥{selectedItem.sellPrice}
                  </p>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
