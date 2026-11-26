import type { Config, CollectionConfig, Field } from 'payload'

import { createPublicFlagsEndpoint } from './endpoints/publicFlags.js'
import { resolveCacheOption, type FeatureFlagsCache, type NextCacheOptions } from './cache.js'

export type CollectionOverrides = Partial<
  Omit<CollectionConfig, 'fields'>
> & {
  fields?: (args: { defaultFields: Field[] }) => Field[]
}

// Export shared types for users of the plugin
export type { PublicFeatureFlag, PublicFeatureFlagsResponse } from './endpoints/publicFlags.js'
export { createNextCache, DEFAULT_CACHE_TAG } from './cache.js'
export { isUserInRolloutBucket, selectVariantForUser } from './bucketing.js'
export type { FeatureFlagsCache, NextCacheOptions } from './cache.js'
export type { PayloadID, FeatureFlag } from './types/index.js'

/**
 * Key under `config.custom` where the plugin records its own settings for the
 * server helpers. Root `config.custom` is server-only in Payload, so nothing
 * stored here reaches the admin client.
 */
export const FEATURE_FLAGS_CUSTOM_KEY = 'payloadFeatureFlags'

export type FeatureFlagsCustomConfig = {
  /** Slug of the collection the plugin created for feature flags. */
  collectionSlug: string
  /** Cross-request cache for the RSC helpers, set by the `cache` option. */
  cache?: FeatureFlagsCache
  /** Other plugin settings stored under the same key (kept when merging). */
  [key: string]: unknown
}

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
   * Note: collectionOverrides.admin.components takes precedence when both are set.
   * @default false
   */
  enableCustomListView?: boolean
  /**
   * Add a public `GET /api/<collection>/evaluate?names=a,b&userId=u` endpoint
   * that returns only `{ name, enabled }` (plus the variant and rollout result
   * for `userId`) for the named flags. The client hooks use it when called
   * with `source: 'public'`, so the collection's `read` access can stay
   * closed to visitors.
   * @default false
   */
  publicEndpoint?: boolean
  /**
   * Cache the RSC helpers' lookups across requests. The plugin clears the
   * cache from the collection's `afterChange` and `afterDelete` hooks.
   * - `true`: Next.js `unstable_cache` tagged `payload-feature-flags`,
   *   refreshed at least every 60 seconds.
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
      publicEndpoint = false,
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
    const {
      fields: _fieldsOverride,
      admin: adminOverride,
      endpoints: endpointsOverride,
      ...otherOverrides
    } = collectionOverrides || {}

    // `endpoints: false` in the overrides turns off custom endpoints for the
    // collection, so the public endpoint is not added in that case either.
    const endpoints: CollectionConfig['endpoints'] =
      endpointsOverride === false
        ? false
        : [
            ...(endpointsOverride || []),
            ...(publicEndpoint && !disabled ? [createPublicFlagsEndpoint(collectionSlug)] : []),
          ]

    // With a cache, any flag change has to clear it, so the invalidation hooks
    // run after the host's own afterChange / afterDelete hooks.
    const cache = resolveCacheOption(cacheOption)
    const invalidateCache = async () => {
      try {
        await cache?.invalidate()
      } catch (error) {
        // Next.js control-flow errors (DynamicServerError and the like) carry
        // a string `digest` and must reach Next.js, so they are rethrown.
        // Other failures only mean the cache is not cleared until it
        // revalidates, which must not fail the flag change itself.
        if (error && typeof error === 'object' && typeof (error as { digest?: unknown }).digest === 'string') {
          throw error
        }
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
      endpoints,
      // Apply any other collection overrides
      ...otherOverrides,
      ...(hooks ? { hooks } : {}),
    }

    config.collections.push(featureFlagsCollection)

    // Record the configured slug so the server helpers read it instead of
    // searching the collections for one that looks like a feature flags
    // collection. Set before the disabled check because the collection (and
    // the helpers that read it) stay available when the plugin is disabled.
    // Merged into any existing entry so other plugin settings stored under
    // the same key are kept.
    const customConfig: FeatureFlagsCustomConfig = {
      ...config.custom?.[FEATURE_FLAGS_CUSTOM_KEY],
      collectionSlug,
    }
    config.custom = {
      ...config.custom,
      [FEATURE_FLAGS_CUSTOM_KEY]: customConfig,
    }

    // The server helpers read the cache from here. Set before the disabled
    // check because the collection and the helpers stay usable when the plugin
    // is disabled, and the invalidation hooks above are added either way.
    if (cache) {
      const withCache: FeatureFlagsCustomConfig = {
        ...config.custom[FEATURE_FLAGS_CUSTOM_KEY],
        collectionSlug,
        cache,
      }
      config.custom = {
        ...config.custom,
        [FEATURE_FLAGS_CUSTOM_KEY]: withCache,
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

    // Add custom feature flags overview view. This is a root admin view, not a
    // collection view, so Payload never supplies user/permissions/collectionConfig
    // on its props (only /admin/collections/:slug routes get those) - collectionSlug
    // is threaded through via Component.serverProps so FeatureFlagsOverviewView can
    // derive the same values from initPageResult instead. See FeatureFlagsOverviewView.tsx.
    config.admin.components.views['feature-flags-overview'] = {
      Component: {
        path: '@xtr-dev/payload-feature-flags/views',
        exportName: 'FeatureFlagsOverviewView',
        serverProps: { collectionSlug },
      },
      path: '/feature-flags-overview',
    }

    return config
  }
