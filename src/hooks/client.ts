'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { FeatureFlag} from '../utils/mappers.js';

import { isUserInRolloutBucket, selectVariantForUser } from '../bucketing.js'
import { toFeatureFlag } from '../utils/mappers.js'

export type { FeatureFlag }

export interface FeatureFlagOptions {
  apiPath?: string
  collectionSlug?: string
  serverURL?: string
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
  enabled: boolean
  inRollout?: boolean
  name: string
  variant?: null | string
}

/**
 * URL of the plugin's public endpoint for the given flag names, optionally
 * resolving variant and rollout for `userId`.
 */
export function buildPublicFlagsURL(
  config: { apiPath: string; collectionSlug: string; serverURL: string },
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
  config: { apiPath: string; collectionSlug: string; serverURL: string },
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
      apiPath: options.apiPath || '/api',
      collectionSlug: options.collectionSlug || 'feature-flags',
      serverURL: options.serverURL
    }
  }

  // In browser environment, use window.location.origin
  if (typeof window !== 'undefined') {
    return {
      apiPath: options?.apiPath || '/api',
      collectionSlug: options?.collectionSlug || 'feature-flags',
      serverURL: window.location.origin
    }
  }

  // During SSR or in non-browser environments, use relative URL
  // This will work for same-origin requests
  return {
    apiPath: options?.apiPath || '/api',
    collectionSlug: options?.collectionSlug || 'feature-flags',
    serverURL: ''
  }
}

/**
 * Hook to fetch all active feature flags from the API
 */
export function useFeatureFlags(
  initialFlags: Partial<FeatureFlag>[],
  options?: FeatureFlagOptions
): {
  error: null | string
  flags: Partial<FeatureFlag>[]
  loading: boolean
  refetch: () => Promise<void>
} {
  const { apiPath, collectionSlug, serverURL } = getConfig(options)
  const source = options?.source ?? 'collection'
  const [flags, setFlags] = useState<Partial<FeatureFlag>[]>(initialFlags)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

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
        const publicFlags = await fetchPublicFlags({ apiPath, collectionSlug, serverURL }, names)
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

  return { error, flags, loading, refetch: fetchFlags }
}

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  options?: FeatureFlagOptions
): {
  error: null | string
  flag: null | Partial<FeatureFlag>
  isEnabled: boolean
  loading: boolean
} {
  const { error, flags, loading } = useFeatureFlags([{ name: flagName }], options)

  const flag = flags.find(f => f.name === flagName) || null
  const isEnabled = flag?.enabled || false

  return { error, flag, isEnabled, loading }
}

interface SingleFlagState {
  error: null | string
  flag: FeatureFlag | null
  /** Server-resolved rollout result; only set when reading from the public endpoint with a userId. */
  inRollout?: boolean
  loading: boolean
  refetch: () => Promise<void>
  /** Server-resolved variant; only set when reading from the public endpoint with a userId. */
  variant?: null | string
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
  const { apiPath, collectionSlug, serverURL } = getConfig(options)
  const source = options?.source ?? 'collection'
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [variant, setVariant] = useState<null | string | undefined>(undefined)
  const [inRollout, setInRollout] = useState<boolean | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (source === 'public') {
        const publicFlags = await fetchPublicFlags({ apiPath, collectionSlug, serverURL }, [flagName], userId)
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

  return { error, flag, inRollout, loading, refetch: fetchFlag, variant }
}

/**
 * Hook to fetch a specific feature flag from the API
 */
export function useSpecificFeatureFlag(
  flagName: string,
  options?: FeatureFlagOptions
): {
  error: null | string
  flag: FeatureFlag | null
  loading: boolean
  refetch: () => Promise<void>
} {
  const { error, flag, loading, refetch } = useSingleFeatureFlag(flagName, options)
  return { error, flag, loading, refetch }
}

/**
 * Utility hook for A/B testing - selects a variant based on user ID
 */
export function useVariantSelection(
  flagName: string,
  userId: string,
  options?: FeatureFlagOptions
): {
  error: null | string
  flag: FeatureFlag | null
  loading: boolean
  variant: null | string
} {
  const state = useSingleFeatureFlag(flagName, options, options?.source === 'public' ? userId : undefined)
  const { error, flag, loading } = state

  // The public endpoint resolves the variant on the server; the collection
  // source returns the variants, so the client picks one itself.
  const variant = options?.source === 'public'
    ? (state.variant ?? null)
    : flag?.enabled && flag.variants
      ? selectVariantForUser(flagName, userId, flag.variants)
      : null

  return { error, flag, loading, variant }
}

/**
 * Utility hook to check if user is in rollout percentage
 */
export function useRolloutCheck(
  flagName: string,
  userId: string,
  options?: FeatureFlagOptions
): {
  error: null | string
  flag: FeatureFlag | null
  isInRollout: boolean
  loading: boolean
} {
  const state = useSingleFeatureFlag(flagName, options, options?.source === 'public' ? userId : undefined)
  const { error, flag, loading } = state

  // The public endpoint resolves the rollout on the server; the collection
  // source returns the percentage, so the client checks it itself.
  const isInRollout = options?.source === 'public'
    ? (state.inRollout ?? false)
    : flag?.enabled
      ? isUserInRolloutBucket(flagName, userId, flag.rolloutPercentage)
      : false

  return { error, flag, isInRollout, loading }
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
    return function WithFeatureFlagComponent(props: P): null | React.ReactElement {
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
