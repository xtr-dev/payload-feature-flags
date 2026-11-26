import type { Payload } from 'payload'

import { cache } from "react"

import type { FeatureFlagsCache } from '../cache.js'
import type { FeatureFlag} from '../utils/mappers.js';

import { isUserInRolloutBucket, selectVariantForUser } from '../bucketing.js'
import { toFeatureFlag } from '../utils/mappers.js'

// Must match FEATURE_FLAGS_CUSTOM_KEY in src/index.ts. Duplicated rather than
// imported so the RSC entry point does not pull in the plugin config module.
const FEATURE_FLAGS_CUSTOM_KEY = 'payloadFeatureFlags'

/**
 * Resolve the feature flags collection slug. The plugin records the slug it
 * created in `config.custom.payloadFeatureFlags.collectionSlug`; that value is
 * used when present. Configs built by older plugin versions lack it, so the
 * helper falls back to finding a collection with a unique text `name` field
 * and a checkbox `enabled` field, and finally to `feature-flags`.
 */
export function getCollectionSlug(payload: Payload): string {
  try {
    const configured = payload.config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]?.collectionSlug
    if (typeof configured === 'string' && configured.length > 0) {
      return configured
    }

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

function getCrossRequestCache(payload: Payload): FeatureFlagsCache | undefined {
  const configured = payload.config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]?.cache
  return configured && typeof configured.wrap === 'function' ? configured : undefined
}

/**
 * Runs `load` through the plugin's cross-request cache when one is configured
 * (the plugin's `cache` option), otherwise reads directly. The key starts with
 * the collection slug so two flag collections never share entries.
 */
function withCrossRequestCache<T>(payload: Payload, key: string[], load: () => Promise<T>): Promise<T> {
  const crossRequestCache = getCrossRequestCache(payload)
  return crossRequestCache ? crossRequestCache.wrap(key, load) : load()
}

/**
 * Get a specific feature flag by name (for use in React Server Components)
 */
export const getFeatureFlag = cache(async (flagName: string, payload: Payload): Promise<FeatureFlag | null> => {
  try {
    const collectionSlug = getCollectionSlug(payload)

    return await withCrossRequestCache(payload, [collectionSlug, 'flag', flagName], async () => {
      const result = await payload.find({
        collection: collectionSlug,
        limit: 1,
        where: {
          name: {
            equals: flagName,
          },
        },
      })

      if (result.docs.length === 0) {
        return null
      }

      return toFeatureFlag(result.docs[0])
    })
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

    return await withCrossRequestCache(payload, [collectionSlug, 'all'], async () => {
      const result = await payload.find({
        collection: collectionSlug,
        limit: 1000,
        where: {
          enabled: {
            equals: true,
          },
        },
      })

      const flags: Record<string, FeatureFlag> = {}

      for (const doc of result.docs) {
        flags[doc.name as string] = toFeatureFlag(doc)
      }

      return flags
    })
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

  return isUserInRolloutBucket(flagName, userId, flag.rolloutPercentage)
})

/**
 * Get the variant for a user in an A/B test (for use in React Server Components)
 */
export const getUserVariant = cache(async (
  flagName: string,
  userId: string,
  payload: Payload
): Promise<null | string> => {
  const flag = await getFeatureFlag(flagName, payload)

  if (!flag?.enabled || !flag.variants || flag.variants.length === 0) {
    return null
  }

  return selectVariantForUser(flagName, userId, flag.variants)
})

/**
 * Get feature flags by tags (for use in React Server Components)
 */
export const getFeatureFlagsByTag = cache(async (tag: string, payload: Payload): Promise<FeatureFlag[]> => {
  try {
    const collectionSlug = getCollectionSlug(payload)

    return await withCrossRequestCache(payload, [collectionSlug, 'tag', tag], async () => {
      const result = await payload.find({
        collection: collectionSlug,
        limit: 1000,
        where: {
          'tags.tag': {
            equals: tag,
          },
        },
      })

      return result.docs.map(doc => toFeatureFlag(doc))
    })
  } catch (error) {
    console.error(`Failed to fetch feature flags with tag ${tag}:`, error)
    return []
  }
})
