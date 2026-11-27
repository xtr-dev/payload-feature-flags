# Changelog

## [0.2.1](https://github.com/xtr-dev/payload-feature-flags/compare/v0.2.0...v0.2.1) - 2026-11-27

### Fixes
- **views:** show a 0% rollout as partial in the admin dashboard ([#65](https://github.com/xtr-dev/payload-feature-flags/issues/65)) ([df51a07](https://github.com/xtr-dev/payload-feature-flags/commit/df51a075b4fe0f4f3550c50b6c3cd8ea66883554))
- **client:** return description and tags from client feature flag hooks ([#43](https://github.com/xtr-dev/payload-feature-flags/issues/43)) ([3bd6b62](https://github.com/xtr-dev/payload-feature-flags/commit/3bd6b6294a8fe760ddc82c62285b67c6b0e5b51b))

### Other
- audit README and docs for accuracy and brevity ([#64](https://github.com/xtr-dev/payload-feature-flags/issues/64)) ([377f7ab](https://github.com/xtr-dev/payload-feature-flags/commit/377f7ab515d73e35bc14a77cd319410c15d00ab8))
- run checks on pull requests ([#63](https://github.com/xtr-dev/payload-feature-flags/issues/63)) ([c0b0007](https://github.com/xtr-dev/payload-feature-flags/commit/c0b00076acf17ed9752c2860ccc436e7d00469aa))
- **lint:** lint TypeScript sources and fix the findings ([#62](https://github.com/xtr-dev/payload-feature-flags/issues/62)) ([4713b10](https://github.com/xtr-dev/payload-feature-flags/commit/4713b10dbc4c48b7fa11b9eca1b66ac27838a700))
- bump Payload to 3.90, Next to 15.4.11 and refresh dev dependencies ([#59](https://github.com/xtr-dev/payload-feature-flags/issues/59)) ([208061c](https://github.com/xtr-dev/payload-feature-flags/commit/208061c39022760dd003dfafd736c95588303ca2))
- remove unused devDependencies and the stale package-lock.json ([#58](https://github.com/xtr-dev/payload-feature-flags/issues/58)) ([67222d5](https://github.com/xtr-dev/payload-feature-flags/commit/67222d589c8dee715f8384eaf0241d76981fe04c))
- require Payload 3.56, fix troubleshooting and versioning notes in README ([#28](https://github.com/xtr-dev/payload-feature-flags/issues/28)) ([7b06609](https://github.com/xtr-dev/payload-feature-flags/commit/7b06609f38107922f0d52d41803f22d581838800))
- fix the collectionOverrides spec import after moving it to dev/ ([#57](https://github.com/xtr-dev/payload-feature-flags/issues/57)) ([99c58a1](https://github.com/xtr-dev/payload-feature-flags/commit/99c58a1fd7633b1d7d926dd58d67dab70acbebba))
- cover collectionOverrides pass-through ([#39](https://github.com/xtr-dev/payload-feature-flags/issues/39)) ([cc43f81](https://github.com/xtr-dev/payload-feature-flags/commit/cc43f81eab37270ee2887242d53cb6013fa65f25))
- check flag name is required and unique and enabled is required ([#38](https://github.com/xtr-dev/payload-feature-flags/issues/38)) ([d530ce6](https://github.com/xtr-dev/payload-feature-flags/commit/d530ce67b4cfad04ad5beb2e778f0152eb4029bd))
- check the plugin preserves host collections, views and endpoints ([#37](https://github.com/xtr-dev/payload-feature-flags/issues/37)) ([48cb0b7](https://github.com/xtr-dev/payload-feature-flags/commit/48cb0b7fa4a6d44afbfcb3499faf845b7ea31037))

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
