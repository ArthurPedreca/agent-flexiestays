export type Pagination = {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
}

export type ApiResponse<T> = {
  status: 'success' | 'error'
  message: string
  data: T
  pagination?: Pagination
  current_page?: number
  last_page?: number
  next_page_url?: string
  prev_page_url?: string
  per_page?: number
  to?: number
  total?: number
}