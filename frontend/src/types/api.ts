export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface SessionsData {
  total: number
  sessions: string[]
}

export interface SendCodeData {
  status: 'success' | 'info' | 'error'
  message: string
  phone: string
}

export interface LoginData {
  status: 'success' | 'need_2fa' | 'error'
  message: string
  phone: string
  first_name: string
  last_name: string
  username: string
  session_file: string
}

export interface SessionMeData {
  status: 'success' | 'unauthorized' | 'error'
  phone: string
  me_id: number | null
  first_name: string | null
  last_name: string | null
  username: string | null
  message: string
}

export interface CheckSessionItem {
  phone: string
  status: string
  session_file: string
  me_id: number | null
  username: string | null
  message: string | null
}

export interface CheckSessionsData {
  total: number
  active: number
  unauthorized: number
  error: number
  sessions: CheckSessionItem[]
}