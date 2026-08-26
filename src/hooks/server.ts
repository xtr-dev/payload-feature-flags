import { Payload } from 'payload'
import { cache } from "react"

export interface FeatureFlag {
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage?: number
  variants?: Array<{
    name: string
    weight: number
    metadata?: any
  }>
  tags?: Array<{ tag: string }>
  metadata?: any
}

// Payload returns omitted optional fields as null; FeatureFlag advertises them as optional (`?:`).
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined
}

function mapVariants(value: unknown): FeatureFlag['variants'] {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.map((entry) => {
    const variant = (entry ?? {}) as Record<string, unknown>
    return {
      name: variant.name as string,
      weight: variant.weight as number,
      metadata: nullToUndefined(variant.metadata),
    }
  })
}

function mapTags(value: unknown): FeatureFlag['tags'] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const tags: Array<{ tag: string }> = []
  for (const entry of value) {
    const tag = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).tag : undefined
    if (typeof tag === 'string') {
      tags.push({ tag })
    }
  }
  return tags
}

function toFeatureFlag(doc: Record<string, unknown>): FeatureFlag {
  return {
    name: doc.name as string,
    description: nullToUndefined(doc.description as string | null | undefined),
    enabled: doc.enabled as boolean,
    rolloutPercentage: nullToUndefined(doc.rolloutPercentage as number | null | undefined),
    variants: mapVariants(doc.variants),
    tags: mapTags(doc.tags),
    metadata: nullToUndefined(doc.metadata),
  }
}

// Helper to get the collection slug from config
function getCollectionSlug(payload: Payload): string {
  try {
    // Look for the feature flags collection - it should have a 'name' field with unique constraint
    const collection = payload.config.collections?.find(col =>
      col.fields.some((field: any) =>
        field.name === 'name' &&
        field.type === 'text' &&
        field.unique === true
      ) &&
      col.fields.some((field: any) => field.name === 'enabled' && field.type === 'checkbox')
    )
    return collection?.slug || 'feature-flags'
  } catch {
    return 'feature-flags'
  }
}

/**
 * Get a specific feature flag by name (for use in React Server Components)
 */
export const getFeatureFlag = cache(async (flagName: string, payload: Payload): Promise<FeatureFlag | null> => {
  try {
    const collectionSlug = getCollectionSlug(payload)

    const result = await payload.find({
      collection: collectionSlug,
      where: {
        name: {
          equals: flagName,
        },
      },
      limit: 1,
    })

    if (result.docs.length === 0) {
      return null
    }

    return toFeatureFlag(result.docs[0])
  } catch (error) {
    console.error(`Failed to fetch feature flag ${flagName}:`, error)
    return null
  }
})

/**
 * Check if a feature flag is enabled (for use in React Server Components)
 */
export const isFeatureEnabled = cache(async (flagName: string, payload: Payload): Promise<boolean> => {
  const flag = await getFeatureFlag(flagName, payload)
  return flag?.enabled ?? false
})

/**
 * Get all active feature flags (for use in React Server Components)
 */
export const getAllFeatureFlags = cache(async (payload: Payload): Promise<Record<string, FeatureFlag>> => {
  try {
    const collectionSlug = getCollectionSlug(payload)

    const result = await payload.find({
      collection: collectionSlug,
      where: {
        enabled: {
          equals: true,
        },
      },
      limit: 1000,
    })

    const flags: Record<string, FeatureFlag> = {}

    for (const doc of result.docs) {
      flags[doc.name as string] = toFeatureFlag(doc)
    }

    return flags
  } catch (error) {
    console.error('Failed to fetch feature flags:', error)
    return {}
  }
})

/**
 * Check if a user is in a feature rollout (for use in React Server Components)
 */
export const isUserInRollout = cache(async (
  flagName: string,
  userId: string,
  payload: Payload
): Promise<boolean> => {
  const flag = await getFeatureFlag(flagName, payload)

  if (!flag?.enabled) {
    return false
  }

  if (!flag.rolloutPercentage || flag.rolloutPercentage === 100) {
    return true
  }

  // Simple hash function for consistent user bucketing
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)

  return (Math.abs(hash) % 100) < flag.rolloutPercentage
})

/**
 * Get the variant for a user in an A/B test (for use in React Server Components)
 */
export const getUserVariant = cache(async (
  flagName: string,
  userId: string,
  payload: Payload
): Promise<string | null> => {
  const flag = await getFeatureFlag(flagName, payload)

  if (!flag?.enabled || !flag.variants || flag.variants.length === 0) {
    return null
  }

  // Hash the user ID for consistent variant assignment
  const hash = Math.abs(userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0))

  const bucket = hash % 100
  let cumulative = 0

  for (const variant of flag.variants) {
    cumulative += variant.weight
    if (bucket < cumulative) {
      return variant.name
    }
  }

  return flag.variants[0]?.name || null
})

/**
 * Get feature flags by tags (for use in React Server Components)
 */
export const getFeatureFlagsByTag = cache(async (tag: string, payload: Payload): Promise<FeatureFlag[]> => {
  try {
    const collectionSlug = getCollectionSlug(payload)

    const result = await payload.find({
      collection: collectionSlug,
      where: {
        'tags.tag': {
          equals: tag,
        },
      },
      limit: 1000,
    })

    return result.docs.map(doc => toFeatureFlag(doc))
  } catch (error) {
    console.error(`Failed to fetch feature flags with tag ${tag}:`, error)
    return []
  }
})
