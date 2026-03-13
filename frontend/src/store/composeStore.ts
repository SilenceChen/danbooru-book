import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompositionTag } from '../api/client'

interface ComposeStore {
  positive: CompositionTag[]
  negative: CompositionTag[]

  addToPositive: (tag: Omit<CompositionTag, 'highWeight'>) => void
  addToNegative: (tag: Omit<CompositionTag, 'highWeight'>) => void
  removeFromPositive: (id: number) => void
  removeFromNegative: (id: number) => void
  toggleHighWeight: (side: 'positive' | 'negative', id: number) => void
  loadComposition: (positive: CompositionTag[], negative: CompositionTag[]) => void
  clearAll: () => void

  getPositivePrompt: () => string
  getNegativePrompt: () => string
}

export const useComposeStore = create<ComposeStore>()(
  persist(
    (set, get) => ({
      positive: [],
      negative: [],

      addToPositive: (tag) => {
        const { positive } = get()
        if (positive.some((t) => t.id === tag.id)) return
        set({ positive: [...positive, { ...tag, highWeight: false }] })
      },

      addToNegative: (tag) => {
        const { negative } = get()
        if (negative.some((t) => t.id === tag.id)) return
        set({ negative: [...negative, { ...tag, highWeight: false }] })
      },

      removeFromPositive: (id) =>
        set((s) => ({ positive: s.positive.filter((t) => t.id !== id) })),

      removeFromNegative: (id) =>
        set((s) => ({ negative: s.negative.filter((t) => t.id !== id) })),

      toggleHighWeight: (side, id) =>
        set((s) => ({
          [side]: s[side].map((t) => (t.id === id ? { ...t, highWeight: !t.highWeight } : t)),
        })),

      loadComposition: (positive, negative) => set({ positive, negative }),

      clearAll: () => set({ positive: [], negative: [] }),

      getPositivePrompt: () =>
        get().positive.map((t) => (t.highWeight ? `(${t.name}:1.3)` : t.name)).join(', '),

      getNegativePrompt: () =>
        get().negative.map((t) => (t.highWeight ? `(${t.name}:1.3)` : t.name)).join(', '),
    }),
    { name: 'compose-store-v2' }
  )
)
