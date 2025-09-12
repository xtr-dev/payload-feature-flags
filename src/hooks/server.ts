import { getPayload, type Payload } from 'payload'

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

// Helper to get the collection slug from config
function getCollectionSlug(payload: Payload): string {
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
}

/**
 * Get a specific feature flag by name (for use in React Server Components)
 */
export async function getFeatureFlag(flagName: string, payload?: Payload): Promise<FeatureFlag | null> {
  try {
    if (!payload) {
      throw new Error('Payload instance is required')
    }
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

    const flag = result.docs[0]
    
    return {
      name: flag.name as string,
      enabled: flag.enabled as boolean,
      rolloutPercentage: flag.rolloutPercentage as number | undefined,
      variants: flag.variants as any,
      metadata: flag.metadata,
    }
  } catch (error) {
    console.error(`Failed to fetch feature flag ${flagName}:`, error)
    return null
  }
}

/**
 * Check if a feature flag is enabled (for use in React Server Components)
 */
export async function isFeatureEnabled(flagName: string, payload?: Payload): Promise<boolean> {
  const flag = await getFeatureFlag(flagName, payload)
  return flag?.enabled ?? false
}

/**
 * Get all active feature flags (for use in React Server Components)
 */
export async function getAllFeatureFlags(payload?: Payload): Promise<Record<string, FeatureFlag>> {
  try {
    if (!payload) {
      throw new Error('Payload instance is required')
    }
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
      flags[doc.name as string] = {
        name: doc.name as string,
        enabled: doc.enabled as boolean,
        rolloutPercentage: doc.rolloutPercentage as number | undefined,
        variants: doc.variants as any,
        metadata: doc.metadata,
      }
    }
    
    return flags
  } catch (error) {
    console.error('Failed to fetch feature flags:', error)
    return {}
  }
}

/**
 * Check if a user is in a feature rollout (for use in React Server Components)
 */
export async function isUserInRollout(
  flagName: string,
  userId: string,
  payload?: Payload
): Promise<boolean> {
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
}

/**
 * Get the variant for a user in an A/B test (for use in React Server Components)
 */
export async function getUserVariant(
  flagName: string,
  userId: string,
  payload?: Payload
): Promise<string | null> {
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
}

/**
 * Get feature flags by tags (for use in React Server Components)
 */
export async function getFeatureFlagsByTag(tag: string, payload?: Payload): Promise<FeatureFlag[]> {
  try {
    if (!payload) {
      throw new Error('Payload instance is required')
    }
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

    return result.docs.map(doc => ({
      name: doc.name as string,
      enabled: doc.enabled as boolean,
      rolloutPercentage: doc.rolloutPercentage as number | undefined,
      variants: doc.variants as any,
      metadata: doc.metadata,
    }))
  } catch (error) {
    console.error(`Failed to fetch feature flags with tag ${tag}:`, error)
    return []
  }
}