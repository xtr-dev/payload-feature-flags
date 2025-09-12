# @xtr-dev/payload-feature-flags

A powerful feature flags plugin for Payload CMS v3 that enables you to manage feature toggles, A/B testing, and gradual rollouts directly from your Payload admin panel.

## Features

- 🚀 **Easy Integration** - Drop-in plugin with minimal configuration
- 🔄 **Gradual Rollouts** - Percentage-based feature deployment
- 🧪 **A/B Testing** - Built-in variant support
- 🛣️ **REST API** - Simple flag state endpoints

## Installation

```bash
npm install @xtr-dev/payload-feature-flags
```

Or using pnpm:

```bash
pnpm add @xtr-dev/payload-feature-flags
```

Or using yarn:

```bash
yarn add @xtr-dev/payload-feature-flags
```

## Requirements

- Payload CMS v3.37.0 or higher
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
      // All options are optional
      defaultValue: false,              // Default state for new flags
      enableRollouts: true,             // Enable percentage-based rollouts
      enableVariants: true,             // Enable A/B testing variants
      enableApi: false,                 // Enable REST API endpoints
      disabled: false,                  // Disable plugin if needed
    }),
  ],
})
```

### Configuration Options

The plugin accepts the following configuration options:

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

### Collection Overrides

You can customize the feature flags collection using `collectionOverrides`:

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

## Usage

### Managing Feature Flags

Once installed, the plugin automatically:

1. **Creates a dedicated collection** - A `feature-flags` collection (or custom name) for managing all flags
2. **Provides a clean admin interface** - Manage flags directly from the Payload admin panel
3. **Exposes REST API endpoints** - Simple endpoints for checking flag states
4. **Keeps your data clean** - No modifications to your existing collections

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

**Note**: REST API endpoints are disabled by default (`enableApi: false`). Set `enableApi: true` if you need REST endpoints.

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

### Testing

```bash
# Run integration tests
pnpm test:int

# Run E2E tests
pnpm test:e2e
```

### Development Mode

```bash
# Start development server
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
