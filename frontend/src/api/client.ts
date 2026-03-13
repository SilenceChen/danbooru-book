import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

// ---- 类型定义 ----

export interface TagCategory {
  category_id: number
  category_name: string
  is_primary: boolean
  source: string
}

export interface Tag {
  id: number
  name: string
  name_zh: string | null
  description_zh: string | null
  danbooru_category: number | null
  post_count: number
  representative_image_url: string | null
  translated_at: string | null
  categories: TagCategory[]
}

export interface TagListResponse {
  total: number
  page: number
  limit: number
  items: Tag[]
}

export interface Category {
  id: number
  name: string
  sort_order: number
}

export interface CompositionTag {
  id: number
  name: string
  name_zh: string | null
  weight: number
}

export interface Composition {
  id: number
  name: string
  positive_tags: string
  negative_tags: string
  created_at: string
}

export interface TaskStatus {
  status: string
  progress: number
  total: number
  message: string
}

// ---- API 函数 ----

export const fetchTags = (params: {
  q?: string
  category_id?: number
  untranslated?: boolean
  page?: number
  limit?: number
}) => api.get<TagListResponse>('/tags', { params }).then((r) => r.data)

export const fetchTag = (id: number) => api.get<Tag>(`/tags/${id}`).then((r) => r.data)

export const updateTag = (id: number, data: object) =>
  api.patch<Tag>(`/tags/${id}`, data).then((r) => r.data)

export const fetchCategories = () => api.get<Category[]>('/categories').then((r) => r.data)

export const fetchCompositions = () => api.get<Composition[]>('/compositions').then((r) => r.data)

export const createComposition = (data: {
  name: string
  positive_tags: CompositionTag[]
  negative_tags: CompositionTag[]
}) => api.post<Composition>('/compositions', data).then((r) => r.data)

export const deleteComposition = (id: number) => api.delete(`/compositions/${id}`)

export const triggerCrawl = (full = false) =>
  api.post('/tasks/crawl', null, { params: { full } }).then((r) => r.data)

export const triggerTranslate = (limit = 500) =>
  api.post('/tasks/translate', null, { params: { limit } }).then((r) => r.data)

export const fetchTaskStatus = () =>
  api.get<{ crawl: TaskStatus; translate: TaskStatus }>('/tasks/status').then((r) => r.data)
