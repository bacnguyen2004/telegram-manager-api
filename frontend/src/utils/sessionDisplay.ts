import type { SessionMetaOverviewItem } from '../types/api'

export function phoneLookupKeys(phone: string): string[] {
  const trimmed = phone.trim()
  const keys = new Set<string>([trimmed])
  const digits = trimmed.replace(/\D/g, '')
  if (digits) {
    keys.add(digits)
    keys.add(`+${digits}`)
  }
  if (trimmed.startsWith('+')) {
    keys.add(trimmed.slice(1))
  }
  return [...keys]
}

export function buildMetaByPhone(
  items: SessionMetaOverviewItem[],
): Map<string, SessionMetaOverviewItem> {
  const map = new Map<string, SessionMetaOverviewItem>()
  for (const item of items) {
    for (const key of phoneLookupKeys(item.phone)) {
      map.set(key, item)
    }
  }
  return map
}

export function getMetaForPhone(
  phone: string,
  metaByPhone: Map<string, SessionMetaOverviewItem>,
): SessionMetaOverviewItem | undefined {
  for (const key of phoneLookupKeys(phone)) {
    const meta = metaByPhone.get(key)
    if (meta) return meta
  }
  return undefined
}

export function formatUsername(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

export function resolveSessionName(
  meta: SessionMetaOverviewItem | undefined,
  fallbackUsername?: string | null,
): string | null {
  const displayName = meta?.display_name?.trim()
  if (displayName) return displayName
  return formatUsername(fallbackUsername ?? meta?.username)
}

/** Label for selects and compact UI: "Tên · +84..." */
export function formatSessionPickerLabel(
  phone: string,
  meta?: SessionMetaOverviewItem | null,
  fallbackUsername?: string | null,
): string {
  const name = resolveSessionName(meta ?? undefined, fallbackUsername)
  if (name) return `${name} · ${phone}`
  return phone
}