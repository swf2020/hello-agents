import { create } from 'zustand';
import type { DialogueTree, DialogueNode, DialogueChoice } from '../types/dialogue.ts';

interface DialogueStore {
  /** The currently active dialogue tree, or null. */
  currentTree: DialogueTree | null;
  /** The ID of the currently active node. */
  currentNodeId: string | null;
  /** Whether the dialogue system is active. */
  isActive: boolean;

  /** Start a dialogue tree from its first node. */
  startDialogue: (tree: DialogueTree) => void;

  /** Advance dialogue to the next node (auto-advance when only one choice). */
  advanceDialogue: () => void;

  /** Follow a specific choice. Returns the action payload if any. */
  selectChoice: (choiceIndex: number) => DialogueChoice['action'];

  /** End the current dialogue and reset. */
  endDialogue: () => void;

  /** Get the current node object, or null. */
  getCurrentNode: () => DialogueNode | null;
}

export const useDialogueStore = create<DialogueStore>()((set, get) => ({
  currentTree: null,
  currentNodeId: null,
  isActive: false,

  startDialogue: (tree) => {
    const firstNode = tree.nodes[0];
    if (!firstNode) return;
    set({
      currentTree: tree,
      currentNodeId: firstNode.id,
      isActive: true,
    });
  },

  advanceDialogue: () => {
    const { currentTree, currentNodeId } = get();
    if (!currentTree || !currentNodeId) return;

    const node = currentTree.nodes.find((n) => n.id === currentNodeId);
    if (!node) return;

    // If there are choices, the player must pick one
    if (node.choices.length > 0) return;

    if (node.nextNodeId) {
      set({ currentNodeId: node.nextNodeId });
    } else {
      set({ isActive: false, currentTree: null, currentNodeId: null });
    }
  },

  selectChoice: (choiceIndex) => {
    const { currentTree, currentNodeId } = get();
    if (!currentTree || !currentNodeId) return null;

    const node = currentTree.nodes.find((n) => n.id === currentNodeId);
    if (!node) return null;

    const choice = node.choices[choiceIndex];
    if (!choice) return null;

    // Follow the choice
    if (choice.nextNodeId) {
      set({ currentNodeId: choice.nextNodeId });
    } else {
      set({ isActive: false, currentTree: null, currentNodeId: null });
    }

    return choice.action;
  },

  endDialogue: () => {
    set({ isActive: false, currentTree: null, currentNodeId: null });
  },

  getCurrentNode: () => {
    const { currentTree, currentNodeId } = get();
    if (!currentTree || !currentNodeId) return null;
    return currentTree.nodes.find((n) => n.id === currentNodeId) ?? null;
  },
}));
