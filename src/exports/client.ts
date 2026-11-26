// Bucketing used by the hooks, for evaluating flags fetched some other way
export { isUserInRolloutBucket, selectVariantForUser } from '../bucketing.js'

// Client-side hooks for React components
export {
  type FeatureFlag,
  type FeatureFlagOptions,
  useFeatureFlag,
  useFeatureFlags,
  useRolloutCheck,
  useSpecificFeatureFlag,
  useVariantSelection,
  withFeatureFlag,
} from '../hooks/client.js'
