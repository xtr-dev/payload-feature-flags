import type { CollectionAfterChangeHook, Config, Payload } from 'payload'

import { afterEach, describe, expect, test, vi } from 'vitest'

import type { FeatureFlagsCache } from '../src/cache.js'

import { createNextCache } from '../src/cache.js'
import { getAllFeatureFlags, getFeatureFlag, getFeatureFlagsByTag } from '../src/hooks/server.js'
import { FEATURE_FLAGS_CUSTOM_KEY, payloadFeatureFlags } from '../src/index.js'

/** An in-memory FeatureFlagsCache, standing in for Next.js in these tests. */
const makeMemoryCache = () => {
  const store = new Map<string, unknown>()
  const cache: FeatureFlagsCache = {
    wrap: vi.fn(async <T>(key: string[], load: () => Promise<T>): Promise<T> => {
      const id = JSON.stringify(key)
      if (store.has(id)) {
        return store.get(id) as T
      }
      const value = await load()
      store.set(id, value)
      return value
    }),
    invalidate: vi.fn(() => {
      store.clear()
    }),
  }
  return { cache, store }
}

const applyPlugin = (options: Parameters<typeof payloadFeatureFlags>[0], base: Partial<Config> = {}) =>
  payloadFeatureFlags(options)({ collections: [], ...base } as unknown as Config)

const flagsCollection = (config: Config) =>
  config.collections!.find((collection) => collection.slug === 'feature-flags')!

/** A Payload stub whose flag documents can be changed between calls. */
const makePayload = (config: Config, docs: Array<Record<string, unknown>>) => {
  const find = vi.fn(async ({ where }: { where: Record<string, { equals?: unknown }> }) => {
    let filtered = docs
    if (where.name?.equals !== undefined) {
      filtered = filtered.filter((doc) => doc.name === where.name.equals)
    }
    if (where.enabled?.equals !== undefined) {
      filtered = filtered.filter((doc) => doc.enabled === where.enabled.equals)
    }
    if (where['tags.tag']?.equals !== undefined) {
      const tag = where['tags.tag'].equals
      filtered = filtered.filter((doc) =>
        (doc.tags as Array<{ tag: string }>).some((entry) => entry.tag === tag),
      )
    }
    return { docs: filtered.map((doc) => ({ ...doc })) }
  })
  return { payload: { config, find } as unknown as Payload, find }
}

describe('cache option wiring', () => {
  test('without cache, hooks and config.custom are left alone', () => {
    const hostHook = vi.fn()
    const config = applyPlugin({ collectionOverrides: { hooks: { afterChange: [hostHook] } } })

    expect(flagsCollection(config).hooks).toEqual({ afterChange: [hostHook] })
    expect(config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]).toBeUndefined()
  })

  test('a custom cache is stored in config.custom and cleared after the host hooks', () => {
    const { cache } = makeMemoryCache()
    const hostAfterChange = vi.fn()
    const hostBeforeChange = vi.fn()
    const config = applyPlugin(
      {
        cache,
        collectionOverrides: {
          hooks: { afterChange: [hostAfterChange], beforeChange: [hostBeforeChange] },
        },
      },
      { custom: { host: true } },
    )

    expect(config.custom).toEqual({ host: true, [FEATURE_FLAGS_CUSTOM_KEY]: { cache } })

    const hooks = flagsCollection(config).hooks!
    expect(hooks.beforeChange).toEqual([hostBeforeChange])
    expect(hooks.afterChange).toHaveLength(2)
    expect(hooks.afterChange![0]).toBe(hostAfterChange)
    expect(hooks.afterDelete).toHaveLength(1)
  })

  test('cache: true uses the Next.js cache', () => {
    const config = applyPlugin({ cache: true })
    const stored = config.custom?.[FEATURE_FLAGS_CUSTOM_KEY]?.cache as FeatureFlagsCache

    expect(typeof stored.wrap).toBe('function')
    expect(typeof stored.invalidate).toBe('function')
  })
})

describe('cross-request caching in the RSC helpers', () => {
  test('lookups are served from the cache until a flag changes', async () => {
    const { cache } = makeMemoryCache()
    const config = applyPlugin({ cache })
    const docs: Array<Record<string, unknown>> = [
      { id: 1, name: 'new-homepage', enabled: true, tags: [{ tag: 'home' }] },
    ]
    const { payload, find } = makePayload(config, docs)

    await expect(getFeatureFlag('new-homepage', payload)).resolves.toMatchObject({ enabled: true })
    await getFeatureFlag('new-homepage', payload)
    await getAllFeatureFlags(payload)
    await getAllFeatureFlags(payload)
    await getFeatureFlagsByTag('home', payload)
    await getFeatureFlagsByTag('home', payload)
    expect(find).toHaveBeenCalledTimes(3)

    // An admin turns the flag off; the plugin's afterChange hook clears the cache.
    docs[0].enabled = false
    const afterChange = flagsCollection(config).hooks!.afterChange!.at(-1) as CollectionAfterChangeHook
    await afterChange({ doc: docs[0] } as unknown as Parameters<CollectionAfterChangeHook>[0])
    expect(cache.invalidate).toHaveBeenCalledTimes(1)

    await expect(getFeatureFlag('new-homepage', payload)).resolves.toMatchObject({ enabled: false })
    await expect(getAllFeatureFlags(payload)).resolves.toEqual({})
    expect(find).toHaveBeenCalledTimes(5)
  })

  test('a failed lookup is not cached', async () => {
    const { cache, store } = makeMemoryCache()
    const config = applyPlugin({ cache })
    const { payload, find } = makePayload(config, [{ id: 1, name: 'flag', enabled: true, tags: [] }])
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    find.mockRejectedValueOnce(new Error('database down'))

    await expect(getFeatureFlag('flag', payload)).resolves.toBeNull()
    expect(store.size).toBe(0)
    await expect(getFeatureFlag('flag', payload)).resolves.toMatchObject({ name: 'flag' })
    errorSpy.mockRestore()
  })
})

describe('createNextCache outside a Next.js server', () => {
  test('falls back to loading directly and rethrows load errors', async () => {
    const cache = createNextCache()

    await expect(cache.wrap(['k'], async () => 'value')).resolves.toBe('value')
    await expect(
      cache.wrap(['k'], async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    await expect(Promise.resolve(cache.invalidate())).resolves.toBeUndefined()
  })
})

describe('createNextCache invalidation without a request context', () => {
  const globalWithCache = globalThis as { __incrementalCache?: unknown }

  afterEach(() => {
    delete globalWithCache.__incrementalCache
    vi.restoreAllMocks()
  })

  test('clears the tag on the global incremental cache when revalidateTag throws', async () => {
    // Outside a request (a Payload job, onInit), next's revalidateTag throws
    // "static generation store missing"; this test process has no request either.
    const revalidateTag = vi.fn(async () => {})
    globalWithCache.__incrementalCache = { revalidateTag }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await createNextCache({ tag: 'my-flags' }).invalidate()

    expect(revalidateTag).toHaveBeenCalledWith('my-flags')
    expect(warn).not.toHaveBeenCalled()
  })

  test('warns instead of failing silently when there is no cache to clear', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await createNextCache().invalidate()

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('payload-feature-flags')
  })
})

describe('createNextCache invalidation error handling', () => {
  afterEach(() => {
    delete (globalThis as { __incrementalCache?: unknown }).__incrementalCache
    vi.restoreAllMocks()
  })

  test('rethrows errors other than a missing request context', async () => {
    const fallback = vi.fn()
    ;(globalThis as { __incrementalCache?: unknown }).__incrementalCache = { revalidateTag: fallback }
    const dynamicError = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' })
    // A fresh copy of src/cache.js that sees a mocked next/cache.js
    vi.resetModules()
    vi.doMock('next/cache.js', () => ({
      revalidateTag: () => {
        throw dynamicError
      },
      unstable_cache: vi.fn(),
    }))
    const { createNextCache: createMockedNextCache } = await import('../src/cache.js')

    await expect(createMockedNextCache().invalidate()).rejects.toBe(dynamicError)
    expect(fallback).not.toHaveBeenCalled()
    vi.doUnmock('next/cache.js')
  })

  test("the plugin's hook rethrows Next.js control-flow errors and logs others", async () => {
    const dynamicError = Object.assign(new Error('Dynamic server usage'), { digest: 'DYNAMIC_SERVER_USAGE' })
    const invalidate = vi.fn<() => Promise<void>>()
    const config = applyPlugin({ cache: { wrap: (_key, load) => load(), invalidate } })
    const afterDelete = flagsCollection(config).hooks!.afterDelete!.at(-1)!
    const args = {} as Parameters<typeof afterDelete>[0]
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    invalidate.mockRejectedValueOnce(dynamicError)
    await expect(afterDelete(args)).rejects.toBe(dynamicError)

    invalidate.mockRejectedValueOnce(new Error('redis down'))
    await expect(afterDelete(args)).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })
})
