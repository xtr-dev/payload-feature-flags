// Shared types for the feature flags plugin

// Helper type for flexible ID handling - supports both string and number IDs
// This allows the plugin to work with different Payload ID configurations
export type PayloadID = number | string

// Common interface for feature flags used across the plugin
export interface FeatureFlag {
  createdAt: string
  description?: string
  enabled: boolean
  environment?: 'development' | 'production' | 'staging'
  id: PayloadID
  metadata?: any
  name: string
  rolloutPercentage?: number
  tags?: Array<{ tag: string }>
  updatedAt: string
  variants?: Array<{
    metadata?: any
    name: string
    weight: number
  }>
}