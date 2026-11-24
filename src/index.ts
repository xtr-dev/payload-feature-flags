import type { Config, CollectionConfig, Field } from 'payload'

import { resolveCacheOption, type FeatureFlagsCache, type NextCacheOptions } from './cache.js'

export type CollectionOverrides = Partial<
  Omit<CollectionConfig, 'fields'>
> & {
  fields?: (args: { defaultFields: Field[] }) => Field[]
}

// Export shared types for users of the plugin
export { createNextCache, DEFAULT_CACHE_TAG } from './cache.js'
export type { FeatureFlagsCache, NextCacheOptions } from './cache.js'
export type { PayloadID, FeatureFlag } from './types/index.js'

/**
 * Key under `config.custom` where the plugin records its own settings for the
 * server helpers. Root `config.custom` is server-only in Payload, so nothing
 * stored here reaches the admin client.
 */
export const FEATURE_FLAGS_CUSTOM_KEY = 'payloadFeatureFlags'

export type PayloadFeatureFlagsConfig = {
  /**
   * Enable/disable the plugin
   * @default false
   */
  disabled?: boolean
  /**
   * Default value for new feature flags
   * @default false
   */
  defaultValue?: boolean
  /**
   * Enable percentage-based rollouts
   * @default true
   */
  enableRollouts?: boolean
  /**
   * Enable variant/experiment support (A/B testing)
   * @default true
   */
  enableVariants?: boolean
  /**
   * Override collection configuration
   */
  collectionOverrides?: CollectionOverrides
  /**
   * Enable custom list view for feature flags
   * @default false
   */
  enableCustomListView?: boolean
  /**
   * Cache the RSC helpers' lookups across requests. The plugin clears the
   * cache from the collection's `afterChange` and `afterDelete` hooks.
   * - `true`: Next.js `unstable_cache` tagged `payload-feature-flags`.
   * - `{ tag?, revalidate? }`: the same, with your own tag or time limit.
   * - A `FeatureFlagsCache` object: your own cache (Redis, in-memory, ...).
   * Off by default: without it every request reads the database.
   * @default false
   */
  cache?: boolean | NextCacheOptions | FeatureFlagsCache
}

export const payloadFeatureFlags =
  (pluginOptions: PayloadFeatureFlagsConfig = {}) =>
  (config: Config): Config => {
    const {
      disabled = false,
      defaultValue = false,
      enableRollouts = true,
      enableVariants = true,
      enableCustomListView = false,
      cache: cacheOption,
      collectionOverrides,
    } = pluginOptions

    const collectionSlug = collectionOverrides?.slug || 'feature-flags'

    if (!config.collections) {
      config.collections = []
    }

    // Define default fields
    const defaultFields: Field[] = [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            description: 'Unique identifier for the feature flag',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Describe what this feature flag controls',
          },
        },
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: defaultValue,
          required: true,
          admin: {
            description: 'Toggle this feature flag on or off',
          },
        },
        ...(enableRollouts ? [{
            name: 'rolloutPercentage',
            type: 'number' as const,
            min: 0,
            max: 100,
            defaultValue: 100,
            admin: {
              description: 'Percentage of users who will see this feature (0-100)',
              condition: (data: any) => data?.enabled === true,
            },
          }] : []),
        ...(enableVariants ? [{
            name: 'variants',
            type: 'array' as const,
            admin: {
              description: 'Define variants for A/B testing',
              condition: (data: any) => data?.enabled === true,
            },
            fields: [
              {
                name: 'name',
                type: 'text' as const,
                required: true,
                admin: {
                  description: 'Variant identifier (e.g., control, variant-a)',
                },
              },
              {
                name: 'weight',
                type: 'number' as const,
                min: 0,
                max: 100,
                required: true,
                admin: {
                  description: 'Weight for this variant (all weights should sum to 100)',
                },
              },
              {
                name: 'metadata',
                type: 'json' as const,
                admin: {
                  description: 'Additional data for this variant',
                },
              },
            ],
          }] : []),
        {
          name: 'tags',
          type: 'array' as const,
          fields: [
            {
              name: 'tag',
              type: 'text' as const,
            },
          ],
          admin: {
            description: 'Tags for organizing feature flags',
          },
        },
        {
          name: 'metadata',
          type: 'json',
          admin: {
            description: 'Additional metadata for this feature flag',
          },
        },
    ]

    // Apply field overrides if provided
    const fields = collectionOverrides?.fields
      ? collectionOverrides.fields({ defaultFields })
      : defaultFields

    // Extract field and admin overrides from collectionOverrides. Admin must be
    // merged key by key rather than spread wholesale: a blanket spread of the
    // user's admin object (whether here or via otherOverrides below) replaces the
    // components key and silently discards enableCustomListView.
    const { fields: _fieldsOverride, admin: adminOverride, ...otherOverrides } = collectionOverrides || {}

    // With a cache, any flag change has to clear it, so the invalidation hooks
    // run after the host's own afterChange / afterDelete hooks.
    const cache = resolveCacheOption(cacheOption)
    const invalidateCache = async () => {
      try {
        await cache?.invalidate()
      } catch (error) {
        console.error('Failed to clear the feature flags cache:', error)
      }
    }
    const hooks: CollectionConfig['hooks'] = cache
      ? {
          ...otherOverrides.hooks,
          afterChange: [...(otherOverrides.hooks?.afterChange || []), invalidateCache],
          afterDelete: [...(otherOverrides.hooks?.afterDelete || []), invalidateCache],
        }
      : otherOverrides.hooks

    // Create the feature flags collection with overrides
    const featureFlagsCollection: CollectionConfig = {
      slug: collectionSlug,
      admin: {
        useAsTitle: 'name',
        group: 'Configuration',
        description: 'Manage feature flags for your application',
        ...(adminOverride || {}),
        components: enableCustomListView ? {
          ...adminOverride?.components,
          views: {
            ...adminOverride?.components?.views,
            list: {
              Component: '@xtr-dev/payload-feature-flags/views#FeatureFlagsView'
            }
          }
        } : adminOverride?.components || {},
      },
      fields,
      // Apply any other collection overrides
      ...otherOverrides,
      ...(hooks ? { hooks } : {}),
    }

    config.collections.push(featureFlagsCollection)

    // The server helpers read the cache from here. Set before the disabled
    // check because the collection and the helpers stay usable when the plugin
    // is disabled, and the invalidation hooks above are added either way.
    if (cache) {
      config.custom = {
        ...config.custom,
        [FEATURE_FLAGS_CUSTOM_KEY]: {
          ...config.custom?.[FEATURE_FLAGS_CUSTOM_KEY],
          cache,
        },
      }
    }

    /**
     * If the plugin is disabled, we still want to keep the collection
     * so the database schema is consistent which is important for migrations.
     */
    if (disabled) {
      return config
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    if (!config.admin) {
      config.admin = {}
    }

    if (!config.admin.components) {
      config.admin.components = {}
    }

    if (!config.admin.components.views) {
      config.admin.components.views = {}
    }

    // Add custom feature flags overview view
    config.admin.components.views['feature-flags-overview'] = {
      Component: '@xtr-dev/payload-feature-flags/views#FeatureFlagsView',
      path: '/feature-flags-overview',
    }

    return config
  }
