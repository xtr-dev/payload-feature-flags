'use client'
import React, { useCallback, useEffect, useState, useRef } from 'react'

export interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage?: number
  variants?: Array<{
    name: string
    weight: number
    metadata?: any
  }>
  metadata?: any
}

export interface FeatureFlagOptions {
  serverURL?: string
  apiPath?: string
  collectionSlug?: string
}

// Helper to get config from options or defaults
function getConfig(options?: FeatureFlagOptions) {
  // In server-side environments, serverURL must be explicitly provided
  const serverURL = options?.serverURL ||
    (typeof window !== 'undefined' ? window.location.origin : undefined)

  if (!serverURL) {
    console.warn(
      'FeatureFlags: serverURL must be provided when using hooks in server-side environment. ' +
      'Falling back to relative URL which may not work correctly.'
    )
    // Use relative URL as fallback - will work if API is on same domain
    return { serverURL: '', apiPath: options?.apiPath || '/api', collectionSlug: options?.collectionSlug || 'feature-flags' }
  }

  const apiPath = options?.apiPath || '/api'
  const collectionSlug = options?.collectionSlug || 'feature-flags'

  return { serverURL, apiPath, collectionSlug }
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

      // Use Payload's native collection API
      const names = initialFlagsRef.current.map(f => f.name).filter(Boolean)
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
          fetchedFlagsMap.set(doc.name, {
            name: doc.name,
            enabled: doc.enabled,
            rolloutPercentage: doc.rolloutPercentage,
            variants: doc.variants,
            metadata: doc.metadata,
          })
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
  }, [serverURL, apiPath, collectionSlug]) // Remove initialFlags from dependencies

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
  const { serverURL, apiPath, collectionSlug } = getConfig(options)
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
        setFlag({
          name: doc.name,
          enabled: doc.enabled,
          rolloutPercentage: doc.rolloutPercentage,
          variants: doc.variants,
          metadata: doc.metadata,
        })
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
  }, [serverURL, apiPath, collectionSlug, flagName])

  useEffect(() => {
    void fetchFlag()
  }, [fetchFlag])

  return { flag, loading, error, refetch: fetchFlag }
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
  const { flag, loading, error } = useSpecificFeatureFlag(flagName, options)

  const variant = flag?.enabled && flag.variants
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
  const { flag, loading, error } = useSpecificFeatureFlag(flagName, options)

  const isInRollout = flag?.enabled
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
