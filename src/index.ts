import type { Config, CollectionConfig, Field } from 'payload'

import { customEndpointHandler } from './endpoints/customEndpointHandler.js'

export type CollectionOverrides = Partial<
  Omit<CollectionConfig, 'fields'>
> & {
  fields?: (args: { defaultFields: Field[] }) => Field[]
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
   * Enable REST API endpoints for feature flags
   * @default false
   */
  enableApi?: boolean
  /**
   * Override collection configuration
   */
  collectionOverrides?: CollectionOverrides
}

export const payloadFeatureFlags =
  (pluginOptions: PayloadFeatureFlagsConfig = {}) =>
  (config: Config): Config => {
    const {
      disabled = false,
      defaultValue = false,
      enableRollouts = true,
      enableVariants = true,
      enableApi = false,
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

    // Extract field overrides from collectionOverrides
    const { fields: _fieldsOverride, ...otherOverrides } = collectionOverrides || {}

    // Create the feature flags collection with overrides
    const featureFlagsCollection: CollectionConfig = {
      slug: collectionSlug,
      admin: {
        useAsTitle: 'name',
        group: 'Configuration',
        description: 'Manage feature flags for your application',
        ...(collectionOverrides?.admin || {}),
      },
      fields,
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
      Component: 'payload-feature-flags/views#FeatureFlagsView',
      path: '/feature-flags-overview',
    }


    // Add API endpoints if enabled
    if (enableApi) {
      // Add API endpoint for fetching feature flags
      config.endpoints.push({
        handler: customEndpointHandler(collectionSlug),
        method: 'get',
        path: '/feature-flags',
      })

      // Add endpoint for checking a specific feature flag
      config.endpoints.push({
        handler: customEndpointHandler(collectionSlug),
        method: 'get',
        path: '/feature-flags/:flag',
      })
    }

    return config
  }
