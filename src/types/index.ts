// Shared types for the feature flags plugin

// Helper type for flexible ID handling - supports both string and number IDs
// This allows the plugin to work with different Payload ID configurations
export type PayloadID = number | string

/**
 * A feature flag as the RSC helpers (`getFeatureFlag`, `getAllFeatureFlags`,
 * `getFeatureFlagsByTag`) and the client hooks return it. Optional fields that
 * Payload stores as `null` are left out, so they are `undefined` here, never
 * `null`. The document's `id`, `createdAt` and `updatedAt` and any fields added
 * through `collectionOverrides.fields` are not included; read the collection
 * (see `FeatureFlagDocument`) when you need those.
 */
export interface FeatureFlag {
  description?: string
  enabled: boolean
  metadata?: any
  name: string
  /** Absent when the flag has no gradual rollout, which means everyone is in. */
  rolloutPercentage?: number
  tags?: Array<{ tag: string }>
  variants?: Array<{
    metadata?: any
    name: string
    weight: number
  }>
}

/**
 * A document of the feature flags collection as Payload stores and returns it
 * (`payload.find`, the REST API, collection hooks), with the plugin's default
 * fields. Payload returns optional fields that were never filled in as `null`,
 * so every optional field can be `null` as well as absent. `rolloutPercentage`
 * and `variants` are absent when `enableRollouts` / `enableVariants` are off.
 * Fields added through `collectionOverrides.fields` are not part of this type;
 * use the `FeatureFlag` type from your generated `payload-types.ts` for those.
 */
export interface FeatureFlagDocument {
  createdAt: string
  description?: null | string
  enabled: boolean
  id: PayloadID
  metadata?: any
  name: string
  /** `null` or absent means no gradual rollout: everyone is in. */
  rolloutPercentage?: null | number
  tags?: Array<{
    id?: null | string
    tag?: null | string
  }> | null
  updatedAt: string
  variants?: Array<{
    id?: null | string
    metadata?: any
    name: string
    weight: number
  }> | null
}
