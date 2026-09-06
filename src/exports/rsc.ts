// Server-side hooks for React Server Components
export {
  getFeatureFlag,
  isFeatureEnabled,
  getAllFeatureFlags,
  isUserInRollout,
  getUserVariant,
  getFeatureFlagsByTag,
} from '../hooks/server.js'

export { type FeatureFlag } from '../utils/mappers.js'
