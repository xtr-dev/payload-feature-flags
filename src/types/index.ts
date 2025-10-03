// Shared types for the feature flags plugin

// Helper type for flexible ID handling - supports both string and number IDs
// This allows the plugin to work with different Payload ID configurations
export type PayloadID = string | number

// Common interface for feature flags used across the plugin
export interface FeatureFlag {
  id: PayloadID
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage?: number
  variants?: Array<{
    name: string
    weight: number
    metadata?: any
  }>
  environment?: 'development' | 'staging' | 'production'
  tags?: Array<{ tag: string }>
  metadata?: any
  createdAt: string
  updatedAt: string
}