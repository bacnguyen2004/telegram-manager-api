import type {
  ApiEnvelope,
  CheckSessionsData,
  LoginData,
  SendCodeData,
  SessionMeData,
  SessionsData,
} from '../types/api'

const API_BASE = '/api'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  const body = (await response.json()) as ApiEnvelope<T>
  return body
}

export const api = {
  listSessions() {
    return request<SessionsData>('/sessions')
  },

  getSessionMe(phone: string) {
    return request<SessionMeData>(`/sessions/${encodeURIComponent(phone)}/me`)
  },

  checkSessions(phones?: string[]) {
    return request<CheckSessionsData>('/sessions/check', {
      method: 'POST',
      body: JSON.stringify(phones ? { phones } : {}),
    })
  },

  sendCode(phone: string) {
    return request<SendCodeData>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    })
  },

  login(phone: string, code: string, password?: string) {
    return request<LoginData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code, password: password || null }),
    })
  },
}