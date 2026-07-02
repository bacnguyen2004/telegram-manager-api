import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { SessionMetaOverviewItem } from '../types/api'
import {
  buildMetaByPhone,
  formatSessionPickerLabel,
  getMetaForPhone,
} from '../utils/sessionDisplay'

interface UseSessionAccountsOptions {
  enabled?: boolean
}

export function useSessionAccounts(options: UseSessionAccountsOptions = {}) {
  const { enabled = true } = options
  const [sessions, setSessions] = useState<string[]>([])
  const [metaByPhone, setMetaByPhone] = useState<Map<string, SessionMetaOverviewItem>>(
    new Map(),
  )
  const [loading, setLoading] = useState(enabled)

  const reload = useCallback(async () => {
    if (!enabled) return { sessions: [] as string[], metaByPhone: new Map<string, SessionMetaOverviewItem>() }
    setLoading(true)
    try {
      const [sessionsRes, metaRes] = await Promise.all([
        api.listSessions(),
        api.listSessionMetaOverview(),
      ])
      const nextSessions =
        sessionsRes.success && sessionsRes.data ? sessionsRes.data.sessions : []
      const nextMeta =
        metaRes.success && metaRes.data?.database_enabled
          ? buildMetaByPhone(metaRes.data.items)
          : new Map<string, SessionMetaOverviewItem>()
      setSessions(nextSessions)
      setMetaByPhone(nextMeta)
      return { sessions: nextSessions, metaByPhone: nextMeta }
    } catch {
      setSessions([])
      setMetaByPhone(new Map())
      return { sessions: [], metaByPhone: new Map<string, SessionMetaOverviewItem>() }
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void reload()
  }, [enabled, reload])

  const getMeta = useCallback(
    (phone: string) => getMetaForPhone(phone, metaByPhone),
    [metaByPhone],
  )

  const getPickerLabel = useCallback(
    (phone: string, fallbackUsername?: string | null) =>
      formatSessionPickerLabel(phone, getMetaForPhone(phone, metaByPhone), fallbackUsername),
    [metaByPhone],
  )

  return useMemo(
    () => ({
      sessions,
      metaByPhone,
      loading,
      reload,
      getMeta,
      getPickerLabel,
    }),
    [sessions, metaByPhone, loading, reload, getMeta, getPickerLabel],
  )
}