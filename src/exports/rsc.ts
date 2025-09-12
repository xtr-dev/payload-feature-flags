export { BeforeDashboardServer } from '../components/BeforeDashboardServer.js'

// Server-side hooks for React Server Components
export {
  getFeatureFlag,
  isFeatureEnabled,
  getAllFeatureFlags,
  isUserInRollout,
  getUserVariant,
  getFeatureFlagsByTag,
  type FeatureFlag,
} from '../hooks/server.js'
