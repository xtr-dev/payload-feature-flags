# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Payload CMS v3 plugin for feature flags (@xtr-dev/payload-feature-flags). The plugin enables feature toggles, A/B testing, and gradual rollouts through a dedicated collection and server-side hooks.

## Key Commands

### Development
- `pnpm dev` - Start Next.js dev server with Payload CMS admin panel
- `pnpm dev:payload` - Run Payload CLI commands for development
- `pnpm dev:generate-types` - Generate TypeScript types from Payload config
- `pnpm dev:generate-importmap` - Generate import map for admin panel

### Building
- `pnpm build` - Full production build (copies files, builds types, compiles with SWC)
- `pnpm build:types` - Generate TypeScript declarations only
- `pnpm build:swc` - Compile TypeScript to JavaScript using SWC
- `pnpm clean` - Remove dist directory and build artifacts
- `pnpm copyfiles` - Copy non-TS assets to dist

### Testing & Quality
- `pnpm test` - Run all tests (integration + e2e)
- `pnpm test:int` - Run integration tests with Vitest
- `pnpm test:e2e` - Run end-to-end tests with Playwright
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix

### Publishing
- `pnpm prepublishOnly` - Clean and build before publishing (runs automatically)

## Architecture

### Plugin Structure
The plugin follows Payload's plugin architecture with multiple exports:

- **Main export (`src/index.ts`)**: Core plugin configuration function
- **RSC export (`src/exports/rsc.ts`)**: Server-side hooks for React Server Components
- **Client export (`src/exports/client.ts`)**: Client-side components (currently placeholder)

### Core Components

#### Plugin Configuration (`src/index.ts`)
- `PayloadFeatureFlagsConfig`: Main configuration type
- `payloadFeatureFlags()`: Plugin factory function that creates a Payload collection and optional API endpoints
- Collection overrides support for full customization
- Feature toggles for rollouts, variants, and API endpoints

#### Server Hooks (`src/hooks/server.ts`)
- `getFeatureFlag()`: Fetch individual flag data
- `isFeatureEnabled()`: Simple boolean check
- `getAllFeatureFlags()`: Get all active flags
- `isUserInRollout()`: Check percentage-based rollouts with consistent hashing
- `getUserVariant()`: A/B testing variant selection
- `getFeatureFlagsByTag()`: Query flags by tags

#### API Access
- The plugin uses Payload's native REST API for the feature-flags collection
- Standard Payload query syntax is supported
- Collection access controls are enforced

### Collection Schema
The plugin creates a feature flags collection with these key fields:
- `name` (unique): Flag identifier
- `enabled`: On/off toggle
- `rolloutPercentage`: 0-100% rollout control
- `variants`: Array for A/B testing with weights
- `tags`: Organization and filtering
- `metadata`: Additional JSON data

### Development Environment
- Uses MongoDB Memory Server for testing
- Next.js for admin panel development
- SWC for fast compilation
- Vitest for integration testing
- Playwright for E2E testing

### Export Strategy
The plugin publishes with different entry points:
- **Development**: Points to TypeScript sources (`src/`)
- **Production**: Points to compiled JavaScript (`dist/`)
- Supports both CommonJS and ESM through package.json exports

## Important Notes

### Plugin Integration
The plugin integrates with Payload by:
1. Creating a feature flags collection with configurable slug and fields
2. Adding optional REST API endpoints
3. Providing server-side hooks that work with any collection slug
4. Supporting full collection customization through `collectionOverrides`

### Security Considerations
- Server-side hooks are the preferred method for accessing feature flags
- Collection access can be restricted through `collectionOverrides.access`
- API access follows standard Payload authentication and authorization

### Testing Setup
The development configuration (`dev/payload.config.ts`) includes:
- MongoDB Memory Server for isolated testing
- Test collections (posts, media)
- Example plugin configuration with collection overrides
- Seeding functionality for development data