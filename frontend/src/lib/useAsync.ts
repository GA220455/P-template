import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'

interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: true,
  })

  const run = useCallback(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          data: null,
          error:
            error instanceof ApiError
              ? error.message
              : 'Ocurrió un error inesperado',
          loading: false,
        })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => run(), [run])

  return { ...state, reload: run }
}
