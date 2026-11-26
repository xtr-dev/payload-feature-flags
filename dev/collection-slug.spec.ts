import type { Config, Payload } from 'payload'

import { describe, expect, test } from 'vitest'

import { getCollectionSlug } from '../src/hooks/server.js'
import { FEATURE_FLAGS_CUSTOM_KEY, payloadFeatureFlags } from '../src/index.js'

const flagLikeFields = [
  { name: 'name', type: 'text', unique: true },
  { name: 'enabled', type: 'checkbox' },
]

const makePayload = (config: Partial<Config>): Payload => ({ config }) as unknown as Payload

describe('config.custom collection slug', () => {
  test('the plugin records the default slug', () => {
    const config = payloadFeatureFlags()({ collections: [] } as unknown as Config)

    expect(config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]).toEqual({ collectionSlug: 'feature-flags' })
  })

  test('the plugin records a slug from collectionOverrides and keeps other custom keys', () => {
    const config = payloadFeatureFlags({ collectionOverrides: { slug: 'flags' } })({
      collections: [],
      custom: { host: true },
    } as unknown as Config)

    expect(config.custom).toEqual({
      [FEATURE_FLAGS_CUSTOM_KEY]: { collectionSlug: 'flags' },
      host: true,
    })
  })

  test('the plugin merges into an existing entry under the same key', () => {
    const config = payloadFeatureFlags({ collectionOverrides: { slug: 'flags' } })({
      collections: [],
      custom: { [FEATURE_FLAGS_CUSTOM_KEY]: { collectionSlug: 'stale', other: 'kept' } },
    } as unknown as Config)

    expect(config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]).toEqual({ collectionSlug: 'flags', other: 'kept' })
  })

  test('the plugin records the slug when it is disabled', () => {
    const config = payloadFeatureFlags({ collectionOverrides: { slug: 'flags' }, disabled: true })({
      collections: [],
    } as unknown as Config)

    expect(config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]).toEqual({ collectionSlug: 'flags' })
  })

  test('getCollectionSlug prefers the configured slug over a look-alike collection', () => {
    const payload = makePayload({
      collections: [
        { slug: 'look-alike', fields: flagLikeFields },
        { slug: 'flags', fields: flagLikeFields },
      ] as unknown as Config['collections'],
      custom: { [FEATURE_FLAGS_CUSTOM_KEY]: { collectionSlug: 'flags' } },
    })

    expect(getCollectionSlug(payload)).toBe('flags')
  })

  test('getCollectionSlug falls back to the field search without a configured slug', () => {
    const payload = makePayload({
      collections: [
        { slug: 'posts', fields: [{ name: 'title', type: 'text' }] },
        { slug: 'flags', fields: flagLikeFields },
      ] as unknown as Config['collections'],
    })

    expect(getCollectionSlug(payload)).toBe('flags')
  })

  test('getCollectionSlug falls back to feature-flags when nothing matches', () => {
    expect(getCollectionSlug(makePayload({ collections: [] }))).toBe('feature-flags')
  })
})
