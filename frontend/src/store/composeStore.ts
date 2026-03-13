import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompositionTag } from '../api/client'

interface ComposeStore {
  positive: CompositionTag[]
  negative: CompositionTag[]

  addToPositive: (tag: Omit<CompositionTag, 'weight'>) => void
  addToNegative: (tag: Omit<CompositionTag, 'weight'>) => void
  removeFromPositive: (id: number) => void
  removeFromNegative: (id: number) => void
  setWeight: (side: 'positive' | 'negative', id: number, weight: number) => void
  loadComposition: (positive: CompositionTag[], negative: CompositionTag[]) => void
  clear: () => void

  // 输出格式化
  getPositivePrompt: () => string
  getNegativePrompt: () => string
}

function formatTag(tag: CompositionTag): string {
  if (tag.weight === 1) return tag.name
  if (tag.weight > 1) return `(${tag.name}:${tag.weight.toFixed(1)})`
  return `[${tag.name}]`  // weight < 1 用方括号降权
}

export const useComposeStore = create<ComposeStore>()(
  persist(
    (set, get) => ({
      positive: [],
      negative: [],

      addToPositive: (tag) => {
        const { positive } = get()
        if (positive.some((t) => t.id === tag.id)) return
        set({ positive: [...positive, { ...tag, weight: 1 }] })
      },

      addToNegative: (tag) => {
        const { negative } = get()
        if (negative.some((t) => t.id === tag.id)) return
        set({ negative: [...negative, { ...tag, weight: 1 }] })
      },

      removeFromPositive: (id) =>
        set((s) => ({ positive: s.positive.filter((t) => t.id !== id) })),

      removeFromNegative: (id) =>
        set((s) => ({ negative: s.negative.filter((t) => t.id !== id) })),

      setWeight: (side, id, weight) =>
        set((s) => ({
          [side]: s[side].map((t) => (t.id === id ? { ...t, weight } : t)),
        })),

      loadComposition: (positive, negative) => set({ positive, negative }),

      clear: () => set({ positive: [], negative: [] }),

      getPositivePrompt: () => get().positive.map(formatTag).join(', '),
      getNegativePrompt: () => get().negative.map(formatTag).join(', '),
    }),
    { name: 'compose-store' }
  )
)
