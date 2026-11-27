# @xtr-dev/payload-feature-flags

Feature flags plugin for Payload CMS v3. Manage feature toggles, A/B tests, and rollouts from your admin panel.

⚠️ **Pre-release Warning**: This package is currently in active development (v0.0.x). Breaking changes may occur before v1.0.0. Not recommended for production use.

## Features

- A `feature-flags` collection with on/off state, percentage rollouts, weighted variants, tags and metadata
- Helpers for React Server Components and React hooks for client components
- Deterministic per-flag bucketing, identical on the server, in the public endpoint and in the client hooks
- An admin dashboard at `/admin/feature-flags-overview`
- Optional public evaluate endpoint, so the collection's `read` access can stay closed
- Optional cross-request cache, cleared automatically when a flag changes

## Requirements

- `payload` and `@payloadcms/ui` ^3.56.0
- `react` ^19.1.0
- Node.js ^18.20.2 or >=20.9.0

## Installation

```bash
pnpm add @xtr-dev/payload-feature-flags
```

Add the plugin to your Payload config:

```typescript
import { buildConfig } from 'payload'
import { payloadFeatureFlags } from '@xtr-dev/payload-feature-flags'

export default buildConfig({
  // ...
  plugins: [payloadFeatureFlags()],
})
```

Then regenerate the admin import map, since the plugin adds admin components:

```bash
pnpm payload generate:importmap
```

## Upgrading to 0.3.0

0.3.0 corrects the `FeatureFlag` type exported from the root entry point. It used to describe a stored document (`id`, `createdAt`, `updatedAt`), but declared an `environment` field the plugin never adds and left out the `null` Payload returns for empty optional fields. Only types change; nothing behaves differently at runtime.

- `FeatureFlag` from `@xtr-dev/payload-feature-flags` is now the type the helpers and hooks return, the same one `/rsc` and `/client` already exported. It has no `id`, `createdAt`, `updatedAt` or `environment`.
- If you used the root `FeatureFlag` for documents read with `payload.find` or the REST API, switch to the new `FeatureFlagDocument`, and handle `null` for `description`, `rolloutPercentage`, `tags` and `variants` (for example `flag.rolloutPercentage ?? 100`).
- For fields you added through `collectionOverrides.fields` (such as `environment`), use the `FeatureFlag` type from your own generated `payload-types.ts`.

See [Types](#types).

## Upgrading to 0.2.0

0.2.0 changes how users are bucketed ([#54](https://github.com/xtr-dev/payload-feature-flags/pull/54)):

- Rollouts and variants are bucketed per flag (a hash of the flag name and user ID). **Existing users get new buckets and new variants**, so running experiments restart with a fresh split. Finish an experiment, or roll its winner out to 100%, before upgrading if you need to keep assignments.
- `rolloutPercentage: 0` now means nobody. Before, it let everyone in. Set it to 100, or clear it, if you relied on that.
- If you copied hashing code from an earlier README, switch to `isUserInRolloutBucket` / `selectVariantForUser` (see [Bucketing](#bucketing)).

The admin dashboard now points at the `FeatureFlagsOverviewView` export, so run `payload generate:importmap` after upgrading.

## Options

All options are optional.

| Option | Default | Description |
| --- | --- | --- |
| `disabled` | `false` | Skip the `/admin/feature-flags-overview` view and the public endpoint. The collection is still added, so the database schema stays the same. |
| `defaultValue` | `false` | Default of the `enabled` field for new flags. |
| `enableRollouts` | `true` | Add the `rolloutPercentage` field. |
| `enableVariants` | `true` | Add the `variants` field. |
| `enableCustomListView` | `false` | Replace the collection's list view with the dashboard. Merges with `collectionOverrides.admin.components`. |
| `publicEndpoint` | `false` | Add `GET /api/<collection>/evaluate`. See [Public endpoint](#public-endpoint). |
| `cache` | `false` | Cache the RSC helpers across requests. See [Caching](#caching). |
| `collectionOverrides` | | Any `CollectionConfig` property (`slug`, `access`, `admin`, `hooks`, `versions`, ...), plus `fields: ({ defaultFields }) => Field[]`. The slug defaults to `feature-flags`. |

```typescript
payloadFeatureFlags({
  collectionOverrides: {
    slug: 'my-feature-flags',
    access: {
      read: ({ req: { user } }) => !!user,
      update: ({ req: { user } }) => user?.role === 'admin',
    },
    fields: ({ defaultFields }) => [
      ...defaultFields,
      { name: 'expiresAt', type: 'date' },
    ],
  },
})
```

The plugin records the collection slug in `config.custom.payloadFeatureFlags.collectionSlug`, which is where the server helpers read it from.

## Collection fields

- `name` (text, required, unique): the flag's identifier
- `description` (textarea)
- `enabled` (checkbox, required)
- `rolloutPercentage` (number 0-100, default 100): share of users who get the flag. Empty means everyone, 0 means nobody.
- `variants` (array of `name`, `weight`, `metadata`): weights are percentages. When they add up to less than 100, users in the remaining buckets get the first variant.
- `tags` (array of `tag`)
- `metadata` (JSON)

`rolloutPercentage` and `variants` only show in the admin panel while the flag is enabled.

## Server Components

```tsx
import { getPayload } from 'payload'
import config from '@payload-config'
import { isFeatureEnabled, getUserVariant } from '@xtr-dev/payload-feature-flags/rsc'

export default async function ProductPage({ userId }: { userId: string }) {
  const payload = await getPayload({ config })

  if (!(await isFeatureEnabled('new-product-page', payload))) {
    return <LegacyProductPage />
  }

  const variant = await getUserVariant('product-layout-test', userId, payload)
  return variant === 'layout-b' ? <LayoutB /> : <LayoutA />
}
```

All helpers take the `payload` instance as their last argument, and are wrapped in React `cache()`, so repeated calls in one request read the database once.

| Function | Returns |
| --- | --- |
| `getFeatureFlag(name, payload)` | The flag, or `null` |
| `isFeatureEnabled(name, payload)` | `boolean` |
| `getAllFeatureFlags(payload)` | Enabled flags keyed by name |
| `isUserInRollout(name, userId, payload)` | `boolean`; `false` when the flag is disabled |
| `getUserVariant(name, userId, payload)` | Variant name, or `null` when the flag is disabled or has no variants |
| `getFeatureFlagsByTag(tag, payload)` | Flags with that tag |

A flag here is a [`FeatureFlag`](#types): `name`, `enabled`, and optional `description`, `rolloutPercentage`, `variants`, `tags` and `metadata`. Lookups that fail log the error and return `null`, `{}` or `[]`.

## Client components

```tsx
'use client'
import { useFeatureFlag, useVariantSelection } from '@xtr-dev/payload-feature-flags/client'

export function Banner({ userId }: { userId: string }) {
  const { isEnabled, loading } = useFeatureFlag('new-banner')
  const { variant } = useVariantSelection('banner-copy-test', userId)

  if (loading || !isEnabled) return null
  return <p>{variant === 'short' ? 'Hi!' : 'Welcome back, good to see you!'}</p>
}
```

| Hook | Returns |
| --- | --- |
| `useFeatureFlags(initialFlags, options?)` | `{ flags, loading, error, refetch }` for the flags named in `initialFlags`, in the same order |
| `useFeatureFlag(name, options?)` | `{ isEnabled, flag, loading, error }` |
| `useSpecificFeatureFlag(name, options?)` | `{ flag, loading, error, refetch }` |
| `useVariantSelection(name, userId, options?)` | `{ variant, flag, loading, error }` |
| `useRolloutCheck(name, userId, options?)` | `{ isInRollout, flag, loading, error }` |
| `withFeatureFlag(name, Fallback?, options?)(Component)` | A component that renders `Component` when the flag is on, else `Fallback` (or nothing) |

`options` (`FeatureFlagOptions`): `serverURL` (defaults to the page's origin), `apiPath` (`/api`), `collectionSlug` (`feature-flags`), and `source`:

- `'collection'` (default): reads Payload's REST API for the collection, so visitors need `read` access. `flag` holds the whole flag, including `description` and `tags`.
- `'public'`: reads the [public endpoint](#public-endpoint). `flag` holds only `name` and `enabled`; variant and rollout are resolved on the server, and a missing flag shows as disabled instead of an error.

## Types

The root entry point exports two types for a flag:

| Type | What it describes |
| --- | --- |
| `FeatureFlag` | What the [server helpers](#server-components) and [client hooks](#client-components) return: `name`, `enabled`, and optional `description`, `rolloutPercentage`, `variants`, `tags` and `metadata`. Empty optional fields are `undefined`, never `null`. Also exported from `/rsc` and `/client`. |
| `FeatureFlagDocument` | A document as Payload stores and returns it (`payload.find`, the REST API, collection hooks): the fields above plus `id`, `createdAt` and `updatedAt`. Empty optional fields are `null`, and array rows carry an `id`. |

```typescript
import type { FeatureFlag, FeatureFlagDocument } from '@xtr-dev/payload-feature-flags'

const flag: FeatureFlag | null = await getFeatureFlag('new-dashboard', payload)

const { docs } = await payload.find({ collection: 'feature-flags' })
const documents: FeatureFlagDocument[] = docs
const percentage = documents[0].rolloutPercentage ?? 100 // null means no gradual rollout
```

Neither type includes fields added through `collectionOverrides.fields`. For those, use the `FeatureFlag` type in your generated `payload-types.ts`, which is assignable to `FeatureFlagDocument`.

## Public endpoint

To keep the collection's `read` access closed, turn on `publicEndpoint` and call the hooks with `source: 'public'`:

```typescript
payloadFeatureFlags({
  publicEndpoint: true,
  collectionOverrides: {
    access: { read: ({ req: { user } }) => !!user },
  },
})
```

```typescript
const { isEnabled } = useFeatureFlag('new-homepage', { source: 'public' })
const { variant } = useVariantSelection('checkout-test', userId, { source: 'public' })
```

`GET /api/<collection>/evaluate?names=a,b&userId=u` returns `{ flags: { [name]: { name, enabled, variant?, inRollout? } } }` (types `PublicFeatureFlagsResponse` and `PublicFeatureFlag`). It answers every name you pass (at most 100), and a name with no flag gets `enabled: false`, so the response does not reveal which flags exist. It never lists all flags. `variant` and `inRollout` are only included when `userId` is sent.

The endpoint is public by design: anyone can ask for the on/off state of a flag they can name, and for the variant and rollout result of any `userId`. Don't put secrets in flag names, and don't rely on users being unable to see other users' buckets.

## Bucketing

`isUserInRolloutBucket(flagName, userId, rolloutPercentage)` and `selectVariantForUser(flagName, userId, variants)` are exported from the root and `/client` entry points. Use them to evaluate flags you fetched yourself, for example from the REST API, with the same result as the plugin:

```typescript
import { isUserInRolloutBucket, selectVariantForUser } from '@xtr-dev/payload-feature-flags'

const { docs } = await fetch('/api/feature-flags?where[name][equals]=new-feature').then((r) => r.json())
const flag = docs[0]

const inRollout = flag?.enabled && isUserInRolloutBucket(flag.name, userId, flag.rolloutPercentage)
const variant = flag?.enabled ? selectVariantForUser(flag.name, userId, flag.variants) : null
```

Buckets come from a hash of the flag name and the user ID, so each flag splits users independently, and a flag's rollout and its variant assignment are independent of each other too.

## Caching

The RSC helpers read the database on every request unless you turn on `cache`:

```typescript
payloadFeatureFlags({
  cache: true, // Next.js unstable_cache, tag 'payload-feature-flags', revalidate 60s
  // or: cache: { tag: 'my-flags', revalidate: 300 },
})
```

The plugin appends `afterChange` and `afterDelete` hooks to the collection (after your own) that clear the cache, so a changed flag shows on the next request. This also works outside a request inside the Next.js process, such as Payload jobs, except before Next.js has served its first request (for example in `onInit`), where it logs a warning.

Changes the hooks cannot see stay cached until `revalidate` runs out: direct database writes, and writes from another process or server instance (the Payload CLI, seed scripts, a second app instance). That's why `revalidate` defaults to 60 seconds. Use `revalidate: false` only if every change goes through Payload in the same process, or clear the tag yourself with `revalidateTag('payload-feature-flags', { expire: 0 })` (on Next.js 15, `revalidateTag('payload-feature-flags')`). Outside a Next.js server, lookups are not cached.

For another store (Redis, in-memory, ...) pass an object with `wrap(key, load)` and `invalidate()`. The `FeatureFlagsCache` type, `createNextCache()` and `DEFAULT_CACHE_TAG` are exported from the root entry point.

## Admin dashboard

`/admin/feature-flags-overview` lists every flag with search (name, description, tags), sorting, totals (enabled, disabled, rolling out, A/B tests), and inline toggles for `enabled` and `rolloutPercentage`. It needs a logged-in user with `read` access to the collection; editing needs `update` access. With `enableCustomListView: true` the same dashboard replaces the collection's list view.

The views are exported from `@xtr-dev/payload-feature-flags/views` (`FeatureFlagsView`, `FeatureFlagsOverviewView`).

## REST API

The collection is a normal Payload collection, so Payload's REST and GraphQL APIs work as usual and respect its access control:

```bash
curl 'http://localhost:3000/api/feature-flags?where[name][equals]=new-dashboard'
```

## Troubleshooting

- **Dashboard or list view shows a missing component error:** run `payload generate:importmap`.
- **Client hooks return nothing or an error:** the visitor needs `read` access to the collection, or use `publicEndpoint` with `source: 'public'`.
- **A changed flag still shows its old value:** with `cache` on, a change from outside the app process shows after `revalidate` seconds. See [Caching](#caching).

## Development

```bash
pnpm install
pnpm dev     # demo app at http://localhost:3000, SQLite, login dev@payloadcms.com / test
pnpm test    # Vitest
pnpm lint
pnpm build
```

See [dev/README.md](./dev/README.md) for the demo app.

## License

MIT. See [CHANGELOG.md](./CHANGELOG.md) for changes, and [open an issue](https://github.com/xtr-dev/payload-feature-flags/issues) for bugs and questions.
