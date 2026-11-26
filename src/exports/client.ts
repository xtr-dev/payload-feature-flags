// Client-side hooks for React components
export {
  useFeatureFlags,
  useFeatureFlag,
  useSpecificFeatureFlag,
  useVariantSelection,
  useRolloutCheck,
  withFeatureFlag,
  type FeatureFlag,
  type FeatureFlagOptions,
} from '../hooks/client.js'

// Bucketing used by the hooks, for evaluating flags fetched some other way
export { isUserInRolloutBucket, selectVariantForUser } from '../bucketing.js'
