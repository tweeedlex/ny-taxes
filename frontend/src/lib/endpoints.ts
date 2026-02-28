import { api, buildQueryString, BASE_URL } from './api'
import type {
  CoordinateStreamParams,
  FileTask,
  LoginRequest,
  OrderCreateRequest,
  OrdersFilterParams,
  OrdersListResponse,
  OrdersStatsResponse,
  OrdersStatsSummaryResponse,
  OrderTaxCalculationResponse,
  RegisterRequest,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from '@/types'

export const authApi = {
  login: (data: LoginRequest) => api.post<User>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<User>('/auth/register', data),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
}

export const ordersApi = {
  create: (data: OrderCreateRequest) =>
    api.post<OrderTaxCalculationResponse>('/orders', data),

  list: (params?: OrdersFilterParams) =>
    api.get<OrdersListResponse>(`/orders${buildQueryString({ ...params })}`),

  stats: (from_date: string, to_date: string) =>
    api.get<OrdersStatsResponse>(
      `/orders/stats${buildQueryString({ from_date, to_date })}`,
    ),

  statsSummary: (from_date?: string, to_date?: string) =>
    api.get<OrdersStatsSummaryResponse>(
      `/orders/stats${buildQueryString({ from_date, to_date })}`,
    ),

  statsDaily: (from_date: string, to_date: string) =>
    api.get<OrdersStatsResponse>(
      `/orders/stats/daily${buildQueryString({ from_date, to_date })}`,
    ),

  streamCoordinates: (params?: CoordinateStreamParams) =>
    fetch(`${BASE_URL}/orders/stream/coordinates${buildQueryString({ ...params })}`, {
      credentials: 'include',
    }),

  importCsv: (file: File) =>
    api.uploadFile<{ task: FileTask }>('/orders/import', file),

  importTasks: () => api.get<FileTask[]>('/orders/import/tasks'),
}

export const usersApi = {
  list: (limit = 100, offset = 0) =>
    api.get<User[]>(`/users${buildQueryString({ limit, offset })}`),

  get: (id: number) => api.get<User>(`/users/${id}`),

  create: (data: UserCreateRequest) => api.post<User>('/users', data),

  update: (id: number, data: UserUpdateRequest) =>
    api.patch<User>(`/users/${id}`, data),

  delete: (id: number) => api.delete<void>(`/users/${id}`),
}
