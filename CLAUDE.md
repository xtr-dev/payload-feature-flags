# CLAUDE.md

Guidance for AI agents working in this repository.

## Project

`@xtr-dev/payload-feature-flags`: a Payload CMS v3 plugin that adds a feature flags collection (toggles, percentage rollouts, weighted A/B variants), RSC helpers, React client hooks, an admin dashboard, an optional public evaluate endpoint and an optional cross-request cache.

## Commands

- `pnpm dev`: demo app (Next.js + Payload, SQLite) at http://localhost:3000
- `pnpm test`: Vitest suite (`dev/*.spec.ts`). `pnpm test:e2e` runs Playwright separately.
- `pnpm lint` / `pnpm lint:fix`: ESLint (`@payloadcms/eslint-config`, type-aware)
- `pnpm build`: copy assets, emit types with `tsc`, compile with SWC into `dist/`
- `npx tsc --noEmit`: type check
- `pnpm generate:types` / `pnpm generate:importmap`: regenerate `dev/payload-types.ts` and the dev admin import map. Run `generate:importmap` after changing admin component paths.

## Architecture

Entry points (package.json `exports`), all built from `src/`:

- `.` (`src/index.ts`): `payloadFeatureFlags(options)`, option types, `createNextCache`, `DEFAULT_CACHE_TAG`, `isUserInRolloutBucket`, `selectVariantForUser`, public endpoint types.
- `./rsc` (`src/exports/rsc.ts` → `src/hooks/server.ts`): `getFeatureFlag`, `isFeatureEnabled`, `getAllFeatureFlags`, `isUserInRollout`, `getUserVariant`, `getFeatureFlagsByTag`. Wrapped in React `cache()`; use the cross-request cache when configured.
- `./client` (`src/exports/client.ts` → `src/hooks/client.ts`): React hooks and `withFeatureFlag`, plus the bucketing helpers.
- `./views` (`src/exports/views.ts`): `FeatureFlagsView` (collection list view, `enableCustomListView`) and `FeatureFlagsOverviewView` (root view at `/admin/feature-flags-overview`). Both render `src/views/renderFeatureFlagsOverview.tsx`; they get different props (`ListViewServerProps` vs `AdminViewServerProps` + `serverProps.collectionSlug`).

Other modules:

- `src/bucketing.ts`: per-flag deterministic hashing shared by the RSC helpers, the endpoint and the client hooks. Keep them in sync through this module only. `rolloutPercentage` null/undefined means everyone, 0 means nobody.
- `src/endpoints/publicFlags.ts`: `GET /api/<collection>/evaluate?names=..&userId=..` (`publicEndpoint`). Reads with `overrideAccess`, returns only name/enabled (+ variant/inRollout), answers unknown names as disabled.
- `src/cache.ts`: `FeatureFlagsCache` interface and the Next.js `unstable_cache` implementation; invalidated from the collection's `afterChange`/`afterDelete` hooks via `revalidateTag(tag, { expire: 0 })`.
- `src/utils/mappers.ts`: `toFeatureFlag`, shared by client and server.
- The plugin stores its settings under `config.custom.payloadFeatureFlags` (`collectionSlug`, `cache`); the server helpers read them from there. With `disabled: true` the collection is still added (schema stays stable) but the root view and endpoint are not.

Tests live in `dev/` next to the demo app (`dev/payload.config.ts`, SQLite).

## Conventions

- PR titles use conventional commits (`feat:`, `fix:`, `docs:`, `deps:`, `ci:`, ...); a `!` or a `BREAKING CHANGE` footer marks breaking changes.
- Never bump `package.json` versions or edit `CHANGELOG.md` in PRs.
- CI (`.github/workflows/ci.yml`) runs `pnpm test`, `pnpm lint`, `tsc --noEmit` and `pnpm build` on every PR.
- Releases are manual: Actions → Release → Run workflow (`.github/workflows/release.yml`, the shared xtr-dev workflow using xtr-dev/changelog). It derives the version and changelog from commits since the last tag and runs `pnpm test` and `pnpm lint` first.
