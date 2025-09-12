'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useConfig } from '@payloadcms/ui'

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

/**
 * Hook to fetch all active feature flags from the API
 */
export function useFeatureFlags(): {
  flags: Record<string, FeatureFlag> | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { config } = useConfig()
  const [flags, setFlags] = useState<Record<string, FeatureFlag> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${config.serverURL}${config.routes.api}/feature-flags`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Feature flags API not enabled. Set enableApi: true in plugin config.')
        }
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
      }

      const result = await response.json()
      setFlags(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setFlags(null)
    } finally {
      setLoading(false)
    }
  }, [config.serverURL, config.routes.api])

  useEffect(() => {
    void fetchFlags()
  }, [fetchFlags])

  return { flags, loading, error, refetch: fetchFlags }
}

/**
 * Hook to check if a specific feature flag is enabled
 */
export function useFeatureFlag(flagName: string): {
  isEnabled: boolean
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
} {
  const { flags, loading, error } = useFeatureFlags()
  
  const flag = flags?.[flagName] || null
  const isEnabled = flag?.enabled || false

  return { isEnabled, flag, loading, error }
}

/**
 * Hook to fetch a specific feature flag from the API
 */
export function useSpecificFeatureFlag(flagName: string): {
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { config } = useConfig()
  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${config.serverURL}${config.routes.api}/feature-flags/${flagName}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setFlag(null)
          setError(`Feature flag '${flagName}' not found`)
          return
        }
        throw new Error(`Failed to fetch feature flag: ${response.statusText}`)
      }

      const result = await response.json()
      setFlag(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setFlag(null)
    } finally {
      setLoading(false)
    }
  }, [config.serverURL, config.routes.api, flagName])

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
  userId: string
): {
  variant: string | null
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
} {
  const { flag, loading, error } = useSpecificFeatureFlag(flagName)
  
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
  userId: string
): {
  isInRollout: boolean
  flag: FeatureFlag | null
  loading: boolean
  error: string | null
} {
  const { flag, loading, error } = useSpecificFeatureFlag(flagName)
  
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
  FallbackComponent?: React.ComponentType<P>
) {
  return function FeatureFlagWrapper(
    WrappedComponent: React.ComponentType<P>
  ): React.ComponentType<P> {
    return function WithFeatureFlagComponent(props: P): React.ReactElement | null {
      const { isEnabled, loading } = useFeatureFlag(flagName)
      
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