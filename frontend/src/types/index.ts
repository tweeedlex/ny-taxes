// Auth / Users
export interface User {
  id: number
  login: string
  full_name: string | null
  is_active: boolean
  authorities: string[]   // 'read_users' | 'edit_users' | 'read_orders' | 'edit_orders'
  created_at: string
  updated_at: string
}

// Tax breakdown
export interface TaxBreakdown {
  state_rate: number
  county_rate: number
  city_rate: number
  special_rates: number
}

export interface JurisdictionRateItem {
  name: string
  rate: number
}

// Orders
export interface Order {
  id: number
  author_user_id: number | null
  author_login: string | null
  latitude: number
  longitude: number
  subtotal: number
  timestamp: string
  reporting_code: string
  jurisdictions: Record<string, JurisdictionRateItem[]>
  composite_tax_rate: number
  tax_amount: number
  total_amount: number
  breakdown: TaxBreakdown
  created_at: string
}

export interface OrdersListResponse {
  total: number
  limit: number
  offset: number
  items: Order[]
}

export interface OrderTaxCalculationResponse {
  order_id: number
  author_user_id: number | null
  author_login: string | null
  reporting_code: string
  jurisdictions: Record<string, JurisdictionRateItem[]>
  composite_tax_rate: number
  tax_amount: number
  total_amount: number
  breakdown: TaxBreakdown
}

// CSV import tasks
export interface FileTask {
  id: number
  user_id: number
  file_path: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  status: string   // 'pending' | 'in_progress' | 'done' | 'failed'
  created_at: string
  updated_at: string
}

// Request types
export interface LoginRequest {
  login: string
  password: string
}

export interface RegisterRequest {
  login: string
  password: string
  full_name?: string | null
}

export interface OrderCreateRequest {
  latitude: number
  longitude: number
  subtotal: number
  timestamp: string
}

export type OrdersSortOption = 'newest' | 'oldest' | 'subtotal_asc' | 'subtotal_desc' | 'tax_asc' | 'tax_desc'

export interface OrdersFilterParams {
  limit?: number
  offset?: number
  reporting_code?: string
  timestamp_from?: string
  timestamp_to?: string
  subtotal_min?: number
  subtotal_max?: number
  sort?: OrdersSortOption
}

export interface UserCreateRequest {
  login: string
  password: string
  full_name?: string | null
  is_active?: boolean
  authorities?: string[]
}

export interface UserUpdateRequest {
  login?: string | null
  password?: string | null
  full_name?: string | null
  is_active?: boolean | null
  authorities?: string[] | null
}

// WebSocket response envelopes
export interface TaxPreviewWsSuccess {
  ok: true
  result: {
    reporting_code: string
    jurisdictions: Record<string, JurisdictionRateItem[]>
    composite_tax_rate: number
    tax_amount: number
    total_amount: number
    breakdown: TaxBreakdown
  }
}

export interface TaxPreviewWsError {
  ok: false
  error: {
    code: string
    detail: string
    fields?: unknown[]
  }
}

export type TaxPreviewWsMessage = TaxPreviewWsSuccess | TaxPreviewWsError

// Import task WS
export interface ImportTasksWsMessage {
  tasks: FileTask[]
}

// Stats
export interface OrdersStatsDay {
  date: string
  total_amount: number
  total_tax_amount: number
  total_orders: number
}

export interface OrdersStatsResponse {
  from_date: string
  to_date: string
  total_amount: number
  total_tax_amount: number
  total_orders: number
  daily: OrdersStatsDay[]
}
