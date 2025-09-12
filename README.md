# @xtr-dev/payload-feature-flags

Feature flags plugin for Payload CMS v3. Manage feature toggles, A/B tests, and rollouts from your admin panel.

⚠️ **Pre-release Warning**: This package is currently in active development (v0.0.x). Breaking changes may occur before v1.0.0. Not recommended for production use.

## Features

- 🚀 **Easy setup** - Add to your Payload config and you're done
- 🎛️ **Admin dashboard** - Manage flags from your Payload admin panel
- 🔄 **Gradual rollouts** - Roll out features to a percentage of users
- 🧪 **A/B testing** - Test different versions of features
- 🛣️ **REST API** - Check flag status via API endpoints
- 🗃️ **Quick demo** - Try it instantly with no database setup

## Installation

```bash
npm install @xtr-dev/payload-feature-flags
```

```bash
# or with pnpm
pnpm add @xtr-dev/payload-feature-flags

# or with yarn
yarn add @xtr-dev/payload-feature-flags
```

## Requirements

- Payload CMS v3.37.0+
- Node.js 18.20.2+ or 20.9.0+
- React 19.1.0+

## Quick Start

### Basic Setup

Add the plugin to your Payload config:

```typescript
import { buildConfig } from 'payload'
import { payloadFeatureFlags } from '@xtr-dev/payload-feature-flags'

export default buildConfig({
  // ... your existing config
  plugins: [
    payloadFeatureFlags({
      // All options are optional - these are the defaults
      defaultValue: false,       // New flags start disabled
      enableRollouts: true,      // Allow percentage rollouts
      enableVariants: true,      // Allow A/B testing
      enableApi: false,          // REST API endpoints
      disabled: false,           // Plugin enabled
    }),
  ],
})
```

### Configuration Options

Available plugin options:

```typescript
export type PayloadFeatureFlagsConfig = {
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
   * Disable the plugin while keeping the database schema intact
   * @default false
   */
  disabled?: boolean
  
  /**
   * Override collection configuration
   */
  collectionOverrides?: {
    // Override any collection config
    slug?: string // @default 'feature-flags'
    access?: CollectionConfig['access']
    admin?: CollectionConfig['admin']
    hooks?: CollectionConfig['hooks']
    timestamps?: CollectionConfig['timestamps']
    versions?: CollectionConfig['versions']
    // ... any other collection config
    
    // Customize fields
    fields?: (args: { defaultFields: Field[] }) => Field[]
  }
}
```

### Custom Fields and Access

Add custom fields or change permissions using `collectionOverrides`:

```typescript
payloadFeatureFlags({
  collectionOverrides: {
    // Custom collection slug
    slug: 'my-feature-flags',
    
    // Custom access control
    access: {
      read: ({ req: { user } }) => !!user, // authenticated users only
      update: ({ req: { user } }) => user?.role === 'admin', // admins only
    },
    
    // Add custom fields
    fields: ({ defaultFields }) => [
      ...defaultFields,
      {
        name: 'environment',
        type: 'select',
        options: ['development', 'staging', 'production'],
        required: true,
      },
      {
        name: 'expiresAt',
        type: 'date',
        admin: {
          description: 'Auto-disable this flag after this date',
        },
      },
    ],
    
    // Disable versioning (enabled by default)
    versions: false,
    
    // Add hooks
    hooks: {
      beforeChange: [
        async ({ data, req }) => {
          // Add audit log, validation, etc.
          console.log(`Flag ${data.name} changed by ${req.user?.email}`)
          return data
        },
      ],
    },
  },
})
```

### Security Considerations

**API Access Control:** When `enableApi: true`, the REST endpoints respect your collection access controls:

```typescript
// Example: Secure API access
access: {
  // Option 1: Simple authentication check
  read: ({ req: { user } }) => !!user, // Only authenticated users
  
  // Option 2: More granular control
  read: ({ req: { user } }) => {
    if (!user) return false                      // No anonymous access
    if (user.role === 'admin') return true       // Admins see all flags
    return { environment: { equals: 'public' } } // Others see public flags only
  }
}
```

**Important:** The plugin does not implement separate API authentication - it uses Payload's collection access system for security.

## Usage

### Managing Feature Flags

Once installed, the plugin automatically:

1. **Creates a dedicated collection** - A `feature-flags` collection (or custom name) for managing all flags
2. **Provides a clean admin interface** - Manage flags directly from the Payload admin panel  
3. **Adds a custom dashboard view** - Enhanced UI for managing flags at `/admin/feature-flags-overview`
4. **Exposes REST API endpoints** - Simple endpoints for checking flag states
5. **Keeps your data clean** - No modifications to your existing collections

### Admin Interface

The plugin provides a custom admin view with enhanced UI for managing feature flags:

**📍 Access:** `/admin/feature-flags-overview`

**Features:**
- 📊 **Dashboard Overview** - Visual stats showing total, enabled, and rolling out flags
- 🔍 **Search & Filter** - Find flags by name/description and filter by status
- 🎛️ **Quick Toggle** - Enable/disable flags with visual toggle switches
- 🏷️ **Smart Labels** - Visual indicators for rollout percentages, A/B tests, and environments
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

The custom view provides a more user-friendly interface compared to the standard collection view, with:
- Real-time status indicators
- One-click flag toggling
- Better visual organization
- Advanced filtering capabilities

### Using Feature Flags in React Server Components

The plugin provides server-side hooks for React Server Components:

```tsx
import { 
  isFeatureEnabled, 
  getFeatureFlag,
  isUserInRollout,
  getUserVariant 
} from '@xtr-dev/payload-feature-flags/rsc'

// Simple feature check
export default async function HomePage() {
  const showNewDesign = await isFeatureEnabled('new-homepage-design')
  
  return showNewDesign ? <NewHomePage /> : <LegacyHomePage />
}

// Percentage-based rollout
export default async function Dashboard({ userId }: { userId: string }) {
  const inRollout = await isUserInRollout('beta-dashboard', userId)
  
  return inRollout ? <BetaDashboard /> : <ClassicDashboard />
}

// A/B testing with variants
export default async function ProductPage({ userId }: { userId: string }) {
  const variant = await getUserVariant('product-page-test', userId)
  
  switch(variant) {
    case 'layout-a':
      return <ProductLayoutA />
    case 'layout-b':
      return <ProductLayoutB />
    default:
      return <DefaultProductLayout />
  }
}
```

### Using Feature Flags via REST API

If you have `enableApi: true`, you can use the REST API endpoints:

```typescript
// Check if a specific feature is enabled
const response = await fetch('/api/feature-flags/new-dashboard')
const flag = await response.json()

if (flag.enabled) {
  // Show new dashboard
}

// Get all active feature flags
const allFlags = await fetch('/api/feature-flags')
const flags = await allFlags.json()
```

**Important Security Notes:**
- REST API endpoints are disabled by default (`enableApi: false`)
- **API endpoints respect your collection access controls** - they don't bypass security
- Configure access permissions using `collectionOverrides.access` (see example above)
- Anonymous users can only access flags if you explicitly allow it in access controls

### API Endpoints

When `enableApi: true`, the plugin exposes the following endpoints:

#### Get All Active Feature Flags

```http
GET /api/feature-flags
```

Returns all enabled feature flags:

```json
{
  "new-dashboard": {
    "enabled": true,
    "rolloutPercentage": 50,
    "variants": null,
    "metadata": {}
  },
  "beta-feature": {
    "enabled": true,
    "rolloutPercentage": 100,
    "variants": [
      { "name": "control", "weight": 50, "metadata": {} },
      { "name": "variant-a", "weight": 50, "metadata": {} }
    ],
    "metadata": {}
  }
}
```

#### Get Specific Feature Flag

```http
GET /api/feature-flags/:flagName
```

Returns a specific feature flag:

```json
{
  "name": "new-dashboard",
  "enabled": true,
  "rolloutPercentage": 50,
  "variants": null,
  "metadata": {}
}
```

### Feature Flag Schema

The plugin creates a collection with the following fields:

- **`name`** (required, unique) - Unique identifier for the feature flag
- **`description`** - Description of what the flag controls
- **`enabled`** (required) - Toggle the flag on/off
- **`rolloutPercentage`** - Percentage of users (0-100) who see this feature
- **`variants`** - Array of variants for A/B testing
  - `name` - Variant identifier
  - `weight` - Distribution weight (all weights should sum to 100)
  - `metadata` - Additional variant data
- **`tags`** - Array of tags for organization
- **`metadata`** - JSON field for additional flag data

## Advanced Usage

### Conditional Feature Rendering

```typescript
// Example: Check feature flag from your frontend
async function checkFeature(flagName: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/feature-flags/${flagName}`)
    if (!response.ok) return false
    const flag = await response.json()
    return flag.enabled
  } catch {
    return false // Default to disabled on error
  }
}

// Usage in your application
if (await checkFeature('new-dashboard')) {
  // Show new dashboard
} else {
  // Show legacy dashboard
}
```

### Implementing Gradual Rollouts

```typescript
// Example: Hash-based rollout
function isUserInRollout(userId: string, percentage: number): boolean {
  // Simple hash function for consistent user bucketing
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  
  return (Math.abs(hash) % 100) < percentage
}

// Check if user should see the feature
const flag = await fetch('/api/feature-flags/new-feature').then(r => r.json())
if (flag.enabled && isUserInRollout(userId, flag.rolloutPercentage)) {
  // Show feature to this user
}
```

### A/B Testing with Variants

```typescript
// Example: Select variant based on user
function selectVariant(userId: string, variants: Array<{name: string, weight: number}>) {
  const hash = Math.abs(userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0))
  
  const bucket = hash % 100
  let cumulative = 0
  
  for (const variant of variants) {
    cumulative += variant.weight
    if (bucket < cumulative) {
      return variant.name
    }
  }
  
  return variants[0]?.name || 'control'
}

// Usage
const flag = await fetch('/api/feature-flags/homepage-test').then(r => r.json())
if (flag.enabled && flag.variants) {
  const variant = selectVariant(userId, flag.variants)
  // Render based on variant
}
```

## Migration

### Disabling the Plugin

If you need to temporarily disable the plugin (e.g., during migrations), set `disabled: true` in the configuration. This keeps the database schema intact while disabling plugin functionality.

```typescript
payloadFeatureFlags({
  disabled: true, // Plugin functionality disabled, schema preserved
})
```

## Development

### Try the Demo

Test the plugin with zero setup:

```bash
git clone https://github.com/xtr-dev/payload-feature-flags
cd payload-feature-flags
pnpm install
pnpm dev
# Visit http://localhost:3000
```

**What you get:**
- 🗃️ **No database needed** - Uses in-memory MongoDB
- 🎯 **Sample data included** - Ready-to-test feature flag
- 🔑 **Auto-login** - Use `dev@payloadcms.com / test`
- 📱 **Working dashboard** - See flags in action

### Building the Plugin

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

### Development Mode

```bash
# Start development server with hot reload
pnpm dev

# Generate types
pnpm generate:types

# Generate import map
pnpm generate:importmap
```

## API Reference

### Main Plugin Export

```typescript
import { payloadFeatureFlags } from '@xtr-dev/payload-feature-flags'
```

- `payloadFeatureFlags`: Main plugin configuration function
- `PayloadFeatureFlagsConfig`: TypeScript type for configuration options

### Server Component Hooks (RSC Export)

```typescript
import { 
  getFeatureFlag,
  isFeatureEnabled,
  getAllFeatureFlags,
  isUserInRollout,
  getUserVariant,
  getFeatureFlagsByTag 
} from '@xtr-dev/payload-feature-flags/rsc'
```

#### Available Functions:

- `getFeatureFlag(flagName: string)` - Get complete flag data
- `isFeatureEnabled(flagName: string)` - Simple boolean check
- `getAllFeatureFlags()` - Get all active flags
- `isUserInRollout(flagName: string, userId: string)` - Check rollout percentage
- `getUserVariant(flagName: string, userId: string)` - Get A/B test variant
- `getFeatureFlagsByTag(tag: string)` - Get flags by tag

## Troubleshooting

### Common Issues

**Plugin not loading:**
- Ensure Payload CMS v3.37.0+ is installed
- Check that the plugin is properly added to the `plugins` array in your Payload config

**Feature flags not appearing:**
- Verify that collections are specified in the plugin configuration
- Check that the plugin is not disabled (`disabled: false`)

**TypeScript errors:**
- Ensure all peer dependencies are installed
- Run `pnpm generate:types` to regenerate type definitions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/xtr-dev/payload-feature-flags/issues) on GitHub.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a list of changes.

## Authors

- XTR Development Team

## Acknowledgments

- Built for [Payload CMS](https://payloadcms.com/)
- Inspired by modern feature flag management systems
