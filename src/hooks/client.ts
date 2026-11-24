'use client'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import { FeatureFlag, toFeatureFlag } from '../utils/mappers.js'

export type { FeatureFlag }

export interface FeatureFlagOptions {
  serverURL?: string
  apiPath?: string
  collectionSlug?: string
  /**
   * Where the hooks read flags from.
   * - `'collection'` (default): Payload's REST API for the collection. The
   *   collection's `read` access must allow the visitor, and the hooks get the
   *   whole flag (description, rollout percentage, variants, tags, metadata).
   * - `'public'`: the plugin's public endpoint (enable it with the plugin's
   *   `publicEndpoint` option). It returns only the name and enabled state,
   *   with variant and rollout resolved on the server, so `read` can stay
   *   closed. The hooks' `flag` then has no description, tags, variants,
   *   rollout percentage or metadata: the endpoint keeps those private.
   */
  source?: 'collection' | 'public'
}

/** Shape of one flag in the public endpoint's response. */
interface PublicFlagResponse {
  name: string
  enabled: boolean
  variant?: string | null
  inRollout?: boolean
}

/**
 * URL of the plugin's public endpoint for the given flag names, optionally
 * resolving variant and rollout for `userId`.
 */
export function buildPublicFlagsURL(
  config: { serverURL: string; apiPath: string; collectionSlug: string },
  names: string[],
  userId?: string,
): string {
  const params = new URLSearchParams({ names: names.join(',') })
  if (userId !== undefined) {
    params.set('userId', userId)
  }
  return `${config.serverURL}${config.apiPath}/${config.collectionSlug}/evaluate?${params.toString()}`
}

async function fetchPublicFlags(
  config: { serverURL: string; apiPath: string; collectionSlug: string },
  names: string[],
  userId?: string,
): Promise<Record<string, PublicFlagResponse>> {
  const response = await fetch(buildPublicFlagsURL(config, names, userId))
  if (!response.ok) {
    throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
  }
  const result = await response.json()
  return result && typeof result.flags === 'object' && result.flags !== null ? result.flags : {}
}

// Helper to get config from options or defaults
function getConfig(options?: FeatureFlagOptions) {
  // Check if serverURL is explicitly provided
  if (options?.serverURL) {
    return {
      serverURL: options.serverURL,
      apiPath: options.apiPath || '/api',
      collectionSlug: options.collectionSlug || 'feature-flags'
    }
  }

  // In browser environment, use window.location.origin
  if (typeof window !== 'undefined') {
    return {
      serverURL: window.location.origin,
      apiPath: options?.apiPath || '/api',
      collectionSlug: options?.collectionSlug || 'feature-flags'
    }
  }

  // During SSR or in non-browser environments, use relative URL
  // This will work for same-origin requests
  return {
    serverURL: '',
    apiPath: options?.apiPath || '/api',
    collectionSlug: options?.collectionSlug || 'feature-flags'
  }
}

/**
 * Hook to fetch all active feature flags from the API
 */
export function useFeatureFlags(
  initialFlags: Partial<FeatureFlag>[],
  options?: FeatureFlagOptions
): {
  flags: Partial<FeatureFlag>[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { serverURL, apiPath, collectionSlug } = getConfig(options)
  const source = options?.source ?? 'collection'
  const [flags, setFlags] = useState<Partial<FeatureFlag>[]>(initialFlags)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use ref to store initialFlags to avoid re-creating fetchFlags on every render
  const initialFlagsRef = useRef(initialFlags)

  // Update ref when initialFlags changes (but won't trigger re-fetch)
  useEffect(() => {
    initialFlagsRef.current = initialFlags
  }, [initialFlags])

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const names = initialFlagsRef.current.map(f => f.name).filter((name): name is string => Boolean(name))

      if (source === 'public') {
        // The public endpoint only answers for named flags.
        if (names.length === 0) {
          setFlags(initialFlagsRef.current)
          return
        }
        const publicFlags = await fetchPublicFlags({ serverURL, apiPath, collectionSlug }, names)
        setFlags(initialFlagsRef.current.map(initialFlag => {
          const fetched = initialFlag.name ? publicFlags[initialFlag.name] : undefined
          return fetched ? { name: fetched.name, enabled: fetched.enabled } : initialFlag
        }))
        return
      }

      // Use Payload's native collection API
      const query = names.length > 0
        ? `?where[name][in]=${names.join(',')}&limit=1000`
        : '?limit=1000'

      const response = await fetch(`${serverURL}${apiPath}/${collectionSlug}${query}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
      }

      const result = await response.json()

      // Create a map of fetched flags by name for quick lookup
      const fetchedFlagsMap = new Map<string, Partial<FeatureFlag>>()
      if (result.docs && Array.isArray(result.docs)) {
        result.docs.forEach((doc: any) => {
          fetchedFlagsMap.set(doc.name, toFeatureFlag(doc))
        })
      }

      // Sort flags based on the order of names in initialFlags
      const sortedFlags = initialFlagsRef.current.map(initialFlag => {
        const fetchedFlag = fetchedFlagsMap.get(initialFlag.name!)
        // Use fetched flag if available, otherwise keep the initial flag
        return fetchedFlag || initialFlag
      })

      setFlags(sortedFlags)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [serverURL, apiPath, collectionSlug, source]) // Remove initialFlags from dependencies

  useEffect(() => {
    void fetchFlags()
  }, [fetchFlags])

  return { flags, loading, error, refetch: fetchFlags }
}

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  options?: FeatureFlagOptions
): {
  isEnabled: boolean
  flag: Partial<FeatureFlag> | null
  loading: boolean
  error: string | null
} {
  const { flags, loading, error } = useFeatureFlags([{ name: flagName }], options)

  const flag = flags.find(f => f.name === flagName) || null
  const isEnabled = flag?.enabled || false

  return { isEnabled, flag, loading, error }
}

interface SingleFlagState {
  flag: FeatureFlag | null
  /** Server-resolved variant; only set when reading from the public endpoint with a userId. */
  variant?: string | null
  /** Server-resolved rollout result; only set when reading from the public endpoint with a userId. */
  inRollout?: boolean
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches one flag from the configured source. With `source: 'public'` and a
 * `userId`, the endpoint also resolves the variant and rollout for that user.
 */
function useSingleFeatureFlag(
  flagName: string,
  options: FeatureFlagOptions | undefined,
  userId?: string,
): SingleFlagState {
  const { serverURL, apiPath, collectionSlug } = getConfig(options)
  const source = options?.source ?? 'collection'
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [variant, setVariant] = useState<string | null | undefined>(undefined)
  const [inRollout, setInRollout] = useState<boolean | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (source === 'public') {
        const publicFlags = await fetchPublicFlags({ serverURL, apiPath, collectionSlug }, [flagName], userId)
        const fetched = publicFlags[flagName]
        if (fetched) {
          setFlag({ name: fetched.name, enabled: fetched.enabled })
          setVariant(fetched.variant)
          setInRollout(fetched.inRollout)
        } else {
          setFlag(null)
          setVariant(undefined)
          setInRollout(undefined)
          setError(`Feature flag '${flagName}' not found`)
        }
        return
      }

      // Use Payload's native collection API with query filter
      const response = await fetch(
        `${serverURL}${apiPath}/${collectionSlug}?where[name][equals]=${flagName}&limit=1`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flag: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.docs && result.docs.length > 0) {
        const doc = result.docs[0]
        setFlag(toFeatureFlag(doc))
      } else {
        setFlag(null)
        setError(`Feature flag '${flagName}' not found`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [serverURL, apiPath, collectionSlug, flagName, source, userId])

  useEffect(() => {
    void fetchFlag()
  }, [fetchFlag])

  return { flag, variant, inRollout, loading, error, refetch: fetchFlag }
}

/**
 * Hook to fetch a specific feature flag from the API
 */
export function useSpecificFeatureFlag(
  flagName: string,
  options?: FeatureFlagOptions
): {
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { flag, loading, error, refetch } = useSingleFeatureFlag(flagName, options)
  return { flag, loading, error, refetch }
}

/**
 * Utility hook for A/B testing - selects a variant based on user ID
 */
export function useVariantSelection(
  flagName: string,
  userId: string,
  options?: FeatureFlagOptions
): {
  variant: string | null
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
} {
  const state = useSingleFeatureFlag(flagName, options, options?.source === 'public' ? userId : undefined)
  const { flag, loading, error } = state

  // The public endpoint resolves the variant on the server; the collection
  // source returns the variants, so the client picks one itself.
  const variant = options?.source === 'public'
    ? (state.variant ?? null)
    : flag?.enabled && flag.variants
      ? selectVariantForUser(userId, flag.variants)
      : null

  return { variant, flag, loading, error }
}

/**
 * Utility hook to check if user is in rollout percentage
 */
export function useRolloutCheck(
  flagName: string,
  userId: string,
  options?: FeatureFlagOptions
): {
  isInRollout: boolean
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
} {
  const state = useSingleFeatureFlag(flagName, options, options?.source === 'public' ? userId : undefined)
  const { flag, loading, error } = state

  // The public endpoint resolves the rollout on the server; the collection
  // source returns the percentage, so the client checks it itself.
  const isInRollout = options?.source === 'public'
    ? (state.inRollout ?? false)
    : flag?.enabled
      ? checkUserInRollout(userId, flag.rolloutPercentage || 100)
      : false

  return { isInRollout, flag, loading, error }
}

// Utility functions for client-side feature flag evaluation

/**
 * Select variant for a user based on consistent hashing
 */
function selectVariantForUser(
  userId: string,
  variants: Array<{ name: string; weight: number }>
): string | null {
  if (variants.length === 0) return null

  // Simple hash function for consistent user bucketing
  const hash = Math.abs(userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0))

  const bucket = hash % 100
  let cumulative = 0

  for (const variant of variants) {
    cumulative += variant.weight
    if (bucket < cumulative) {
      return variant.name
    }
  }

  return variants[0]?.name || null
}

/**
 * Check if user is in rollout percentage
 */
function checkUserInRollout(userId: string, percentage: number): boolean {
  if (percentage >= 100) return true
  if (percentage <= 0) return false

  // Simple hash function for consistent user bucketing
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)

  return (Math.abs(hash) % 100) < percentage
}

/**
 * Higher-order component for feature flag gating
 */
export function withFeatureFlag<P extends Record<string, any>>(
  flagName: string,
  FallbackComponent?: React.ComponentType<P>,
  options?: FeatureFlagOptions
) {
  return function FeatureFlagWrapper(
    WrappedComponent: React.ComponentType<P>
  ): React.ComponentType<P> {
    return function WithFeatureFlagComponent(props: P): React.ReactElement | null {
      const { isEnabled, loading } = useFeatureFlag(flagName, options)

      if (loading) {
        return null // or a loading spinner
      }

      if (!isEnabled) {
        return FallbackComponent ? React.createElement(FallbackComponent, props) : null
      }

      return React.createElement(WrappedComponent, props)
    }
  }
}
