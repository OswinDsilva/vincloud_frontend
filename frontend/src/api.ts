import type { Catalog, Image, Instance, LaunchPayload, Network, Overview, Volume } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(body.detail || `Request failed (${response.status})`)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  overview: () => request<Overview>('/overview'),
  catalog: () => request<Catalog>('/catalog'),
  instances: () => request<Instance[]>('/instances'),
  instance: (id: string) => request<Instance>(`/instances/${id}`),
  launch: (data: LaunchPayload) => request<Instance[]>('/instances', { method: 'POST', body: JSON.stringify(data) }),
  instanceAction: (id: string, action: string) => request<Instance>(`/instances/${id}/actions`, { method: 'POST', body: JSON.stringify({ action }) }),
  deleteInstance: (id: string) => request<void>(`/instances/${id}`, { method: 'DELETE' }),
  volumes: () => request<Volume[]>('/volumes'),
  volume: (id: string) => request<Volume>(`/volumes/${id}`),
  createVolume: (data: Record<string, unknown>) => request<Volume>('/volumes', { method: 'POST', body: JSON.stringify(data) }),
  deleteVolume: (id: string) => request<void>(`/volumes/${id}`, { method: 'DELETE' }),
  attachVolume: (id: string, instance_id: string) => request<Volume>(`/volumes/${id}/attach`, { method: 'POST', body: JSON.stringify({ instance_id }) }),
  detachVolume: (id: string) => request<Volume>(`/volumes/${id}/detach`, { method: 'POST' }),
  networks: () => request<Network[]>('/networks'),
  images: () => request<Image[]>('/images'),
}

