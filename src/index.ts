import type { Config, CollectionConfig, Field } from 'payload'

import { createPublicFlagsEndpoint } from './endpoints/publicFlags.js'

export type CollectionOverrides = Partial<
  Omit<CollectionConfig, 'fields'>
> & {
  fields?: (args: { defaultFields: Field[] }) => Field[]
}

// Export shared types for users of the plugin
export type { PublicFeatureFlag, PublicFeatureFlagsResponse } from './endpoints/publicFlags.js'
export type { PayloadID, FeatureFlag } from './types/index.js'

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
   * Add a public `GET /api/<collection>/evaluate?names=a,b&userId=u` endpoint
   * that returns only `{ name, enabled }` (plus the variant and rollout result
   * for `userId`) for the named flags. The client hooks use it when called
   * with `source: 'public'`, so the collection's `read` access can stay
   * closed to visitors.
   * @default false
   */
  publicEndpoint?: boolean
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
    }

    config.collections.push(featureFlagsCollection)

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
