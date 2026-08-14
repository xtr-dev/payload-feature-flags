import type { Config } from 'payload'
import { describe, expect, test } from 'vitest'

import { payloadFeatureFlags } from './index.js'

describe('payloadFeatureFlags collectionOverrides pass-through', () => {
  test('access, hooks and slug reach the collection unchanged', () => {
    const cfg = { collections: [] } as unknown as Config
    const readFn = () => true
    const beforeFn = () => {}

    payloadFeatureFlags({
      collectionOverrides: {
        slug: 'flags',
        access: { read: readFn },
        hooks: { beforeChange: [beforeFn] },
      },
    })(cfg)

    expect(cfg.collections).toHaveLength(1)
    const collection = cfg.collections![0]

    expect(collection.slug).toBe('flags')
    expect(collection.access?.read).toBe(readFn)
    expect(collection.hooks?.beforeChange?.[0]).toBe(beforeFn)
  })

  test('with no collectionOverrides, the collection has no access control of its own', () => {
    const cfg = { collections: [] } as unknown as Config

    payloadFeatureFlags()(cfg)

    const collection = cfg.collections![0]
    expect(collection.access).toBeUndefined()
  })

  test('a fields override function does not leak into the spread and clobber collection.fields', () => {
    const cfg = { collections: [] } as unknown as Config

    payloadFeatureFlags({
      collectionOverrides: {
        fields: ({ defaultFields }) => defaultFields,
      },
    })(cfg)

    const collection = cfg.collections![0]
    expect(Array.isArray(collection.fields)).toBe(true)
  })
})
