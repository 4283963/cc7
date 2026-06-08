import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

export interface TrajectoryPoint {
  timestamp: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  compressor_status?: boolean
  solar_intensity?: number
}

export interface AnomalyEvent {
  id: number
  container_id: string
  start_time: string
  end_time?: string
  max_temperature: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  cargo?: string
  customer?: string
}

export interface AttributionSegment {
  time_start: string
  time_end: string
  lat_start: number
  lon_start: number
  lat_end: number
  lon_end: number
  avg_temperature: number
  temp_rise: number
  avg_solar_intensity: number
  compressor_off_ratio: number
  sea_area: string
  cause_type: string
  confidence: number
}

export interface AttributionResult {
  anomaly_id: number
  container_id: string
  total_segments: number
  primary_cause: string
  primary_sea_area: string
  segments: AttributionSegment[]
}

export interface ContainerInfo {
  id: string
  cargo: string
  customer: string
  origin: string
  destination: string
  current_position?: {
    latitude: number
    longitude: number
    temperature: number
    humidity: number
    timestamp: string
  }
  status: string
}

export interface CompensationOrder {
  id: number
  order_no: string
  container_id: string
  anomaly_id: number
  customer: string
  cargo_type: string
  status: string
  amount?: number
  remark?: string
  created_at: string
  updated_at: string
}

const prefix = USE_MOCK ? '/mock' : ''

export const containerApi = {
  getList: () => api.get<{ containers: ContainerInfo[]; count: number }>(`${prefix}/containers`),

  getInfo: (containerId: string) => api.get<ContainerInfo>(`${prefix}/container/${containerId}`),

  getTrajectory: (containerId: string, hours = 168) =>
    api.get<{ container_id: string; total_points: number; trajectory: TrajectoryPoint[] }>(
      `${prefix}/container/${containerId}/trajectory`,
      { params: { hours } }
    ),

  getPosition: (containerId: string) =>
    api.get<TrajectoryPoint>(`${prefix}/container/${containerId}/position`),

  getTempStats: (containerId: string, hours = 24) =>
    api.get<{ min_temp: number; max_temp: number; avg_temp: number; data_points: number }>(
      `${prefix}/container/${containerId}/temp-stats`,
      { params: { hours } }
    ),

  getActiveList: () => api.get<{ containers: string[]; count: number }>(`${prefix}/active/list`),
}

export const anomalyApi = {
  getList: (status?: string) =>
    api.get<{ anomalies: AnomalyEvent[]; count: number }>(`${prefix}/anomalies`, {
      params: status ? { status } : {},
    }),
}

export const attributionApi = {
  analyze: (containerId: string, anomalyId: number) =>
    api.post<AttributionResult>(`${prefix}/attribution/analyze`, {
      container_id: containerId,
      anomaly_id: anomalyId,
    }),

  getByAnomaly: (containerId: string, anomalyId: number) =>
    api.get<AttributionResult>(`${prefix}/attribution/${containerId}/${anomalyId}`),
}

export const orderApi = {
  getList: (status?: string, containerId?: string) =>
    api.get<{ orders: CompensationOrder[]; count: number }>(`${prefix}/compensation-orders`, {
      params: { status, container_id: containerId },
    }),

  updateStatus: (orderId: number, status: string, amount?: number, remark?: string) =>
    api.put<CompensationOrder>(`${prefix}/compensation-order/${orderId}/status`, {
      status,
      amount,
      remark,
    }),
}

export interface ShelfLifePrediction {
  container_id: string
  cargo_type: string
  lookback_hours: number
  product: string
  base_shelf_life_hours: number
  reference_temp_c: number
  q10_factor: number
  total_actual_hours: number
  total_equivalent_aging_hours: number
  remaining_shelf_life_hours: number
  remaining_ratio: number
  spoiled_ratio: number
  quality_level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  average_temp_c: number
  max_temp_c: number
  min_temp_c: number
  max_degradation_rate: number
  predicted_remaining_hours_at_current_rate: number | null
  rate_history?: Array<{
    segment_index: number
    temperature_c: number
    duration_hours: number
    degradation_rate: number
    equivalent_hours: number
    is_safe: boolean
  }>
}

export const shelfLifeApi = {
  getPrediction: (containerId: string, lookbackHours = 48) =>
    api.get<ShelfLifePrediction>(`${prefix}/shelf-life/${containerId}`, {
      params: { lookback_hours: lookbackHours },
    }),

  getBatch: (containerIds: string[], lookbackHours = 48) =>
    api.post<{
      lookback_hours: number
      count: number
      results: Record<string, ShelfLifePrediction | { error: string }>
    }>(`${prefix}/shelf-life/batch`, {
      container_ids: containerIds,
      lookback_hours: lookbackHours,
    }),
}

export default api
