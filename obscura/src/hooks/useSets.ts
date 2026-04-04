'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import type { Set, Card } from '@/types'

interface SetsState {
  sets: Set[]
  loading: boolean
  error: string | null
}

export function useSets() {
  const [state, setState] = useState<SetsState>({ sets: [], loading: true, error: null })

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await apiFetch('/sets')
      if (!res.ok) throw new Error('Failed to load sets')
      const data: Set[] = await res.json()
      setState({ sets: data, loading: false, error: null })
    } catch (err) {
      setState({ sets: [], loading: false, error: (err as Error).message })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}

interface SetDetailState {
  set: Set | null
  cards: Card[]
  loading: boolean
  error: string | null
}

export function useSet(id: string) {
  const [state, setState] = useState<SetDetailState>({
    set: null,
    cards: [],
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    if (!id) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await apiFetch(`/sets/${id}`)
      if (!res.ok) throw new Error('Failed to load set')
      const data: { set: Set; cards: Card[] } = await res.json()
      setState({ set: data.set, cards: data.cards, loading: false, error: null })
    } catch (err) {
      setState({ set: null, cards: [], loading: false, error: (err as Error).message })
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}
