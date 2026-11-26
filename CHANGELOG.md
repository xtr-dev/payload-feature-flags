# Changelog

## [0.2.0](https://github.com/xtr-dev/payload-feature-flags/compare/v0.1.0...v0.2.0) - 2026-11-26

### Breaking
- bucket rollouts and variants per flag and treat rolloutPercentage 0 as nobody ([#54](https://github.com/xtr-dev/payload-feature-flags/issues/54)) ([e74fbe5](https://github.com/xtr-dev/payload-feature-flags/commit/e74fbe548ab90a0012bcf5728df09203ff897a65))

### Fixes
- **views:** render /admin/feature-flags-overview as a root view (Payload 3.56 to 3.94) ([#40](https://github.com/xtr-dev/payload-feature-flags/issues/40)) ([3096620](https://github.com/xtr-dev/payload-feature-flags/commit/3096620ad9ecca1ed2ed16b1b73682951344b4db))
- **cache:** pass an immediate-expiry profile to revalidateTag ([#55](https://github.com/xtr-dev/payload-feature-flags/issues/55)) ([418f163](https://github.com/xtr-dev/payload-feature-flags/commit/418f1638ee3d5fe958729a946d8109cfd62584af))

### Other
- **lint:** add @eslint/js so pnpm lint runs ([#56](https://github.com/xtr-dev/payload-feature-flags/issues/56)) ([bc18625](https://github.com/xtr-dev/payload-feature-flags/commit/bc1862515f7983e7b66ce380d032a9560bd52d52))

## [0.1.0] - 2026-11-25

### Fixes
- align React peer dependency floor ([7ff2cd9](https://github.com/xtr-dev/payload-feature-flags/commit/7ff2cd92f99bbbae9a467f23e31255dd1ff19e14))
- declare runtime peer dependencies ([01dfa5f](https://github.com/xtr-dev/payload-feature-flags/commit/01dfa5f5d4a18e187158ff9765846fd3ffd097ab))

### Other
- **package:** declare the repository for npm trusted publishing ([#53](https://github.com/xtr-dev/payload-feature-flags/issues/53)) ([b15670d](https://github.com/xtr-dev/payload-feature-flags/commit/b15670df2399699154d8db9d73cd1e11c3b9ad25))
- make pnpm test run the Vitest suite instead of exit 0 ([#23](https://github.com/xtr-dev/payload-feature-flags/issues/23)) ([86fe535](https://github.com/xtr-dev/payload-feature-flags/commit/86fe535529058464865de58c63c9638c80298675))
- release through the shared workflow with xtr-dev/changelog ([#51](https://github.com/xtr-dev/payload-feature-flags/issues/51)) ([251e2cf](https://github.com/xtr-dev/payload-feature-flags/commit/251e2cfe06de475d79c9b9800ebca100e37d8522))
- check the version only when a PR releases ([#44](https://github.com/xtr-dev/payload-feature-flags/issues/44)) ([1b4b729](https://github.com/xtr-dev/payload-feature-flags/commit/1b4b7296bdfa42404e3ba6350533cd580d00ada5))
