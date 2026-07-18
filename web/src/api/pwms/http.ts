import { appConfig } from '@/config/env'

export class ApiError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('pwms_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function httpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (!res.ok) throw new ApiError(res.statusText || '请求失败', res.status)
  const json = (await res.json()) as ApiResponse<T>
  if (json.code !== 0 && json.code !== 200) throw new ApiError(json.message || '业务错误', json.code, json)
  return json.data
}

export async function httpPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new ApiError(res.statusText || '请求失败', res.status)
  const json = (await res.json()) as ApiResponse<T>
  if (json.code !== 0 && json.code !== 200) throw new ApiError(json.message || '业务错误', json.code, json)
  return json.data
}

export async function httpPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new ApiError(res.statusText || '请求失败', res.status)
  const json = (await res.json()) as ApiResponse<T>
  if (json.code !== 0 && json.code !== 200) throw new ApiError(json.message || '业务错误', json.code, json)
  return json.data
}

export async function httpDelete(path: string): Promise<void> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new ApiError(res.statusText || '请求失败', res.status)
}
