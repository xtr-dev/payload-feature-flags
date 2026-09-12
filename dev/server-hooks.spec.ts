import type { Payload } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import {
  getAllFeatureFlags,
  getFeatureFlag,
  getFeatureFlagsByTag,
} from '../src/hooks/server.js'

const completeFlag = {
  name: 'new-homepage',
  description: 'Shows the redesigned homepage',
  enabled: true,
  rolloutPercentage: 50,
  variants: [
    { name: 'control', weight: 50 },
    { name: 'variant-a', weight: 50 },
  ],
  tags: [{ tag: 'homepage' }, { tag: 'experiment' }],
  metadata: { owner: 'growth' },
}

const storedCompleteFlag = {
  ...completeFlag,
  id: 'flag-1',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  environment: 'production',
}

const sparseFlag = {
  name: 'sparse-flag',
  enabled: true,
}

const storedSparseFlag = {
  name: 'sparse-flag',
  description: null,
  enabled: true,
  rolloutPercentage: null,
  variants: null,
  tags: null,
  metadata: null,
  id: 'flag-2',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  environment: 'production',
}

const storedFlagWithNullableNestedFields = {
  name: 'nullable-nested',
  description: null,
  enabled: true,
  rolloutPercentage: null,
  variants: [{ name: 'control', weight: 100, metadata: null, id: 'v1' }],
  tags: [
    { tag: null, id: 't1' },
    { tag: 'homepage', id: 't2' },
  ],
  metadata: null,
  id: 'flag-3',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  environment: 'production',
}

const makePayload = (docs: Array<typeof completeFlag | Record<string, unknown>>): Payload =>
  ({
    config: {
      collections: [
        {
          slug: 'feature-flags',
          fields: [
            { name: 'name', type: 'text', unique: true },
            { name: 'enabled', type: 'checkbox' },
          ],
        },
      ],
    },
    find: vi.fn(async ({ where }: { where?: Record<string, { equals?: unknown }> }) => {
      let filtered = docs
      if (where?.name?.equals !== undefined) {
        filtered = filtered.filter((doc) => doc.name === where.name.equals)
      }
      if (where?.enabled?.equals !== undefined) {
        filtered = filtered.filter((doc) => doc.enabled === where.enabled.equals)
      }
      if (where?.['tags.tag']?.equals !== undefined) {
        const tag = where['tags.tag'].equals
        filtered = filtered.filter((doc) =>
          Array.isArray(doc.tags) && doc.tags.some((entry: { tag?: string }) => entry.tag === tag),
        )
      }
      return { docs: filtered }
    }),
  }) as unknown as Payload

describe('RSC feature flag mappers', () => {
  test('getFeatureFlag returns description and tags with the rest of the flag', async () => {
    const payload = makePayload([storedCompleteFlag])

    await expect(getFeatureFlag('new-homepage', payload)).resolves.toEqual(completeFlag)
  })

  test('getAllFeatureFlags returns description and tags for each active flag', async () => {
    const payload = makePayload([storedCompleteFlag])

    await expect(getAllFeatureFlags(payload)).resolves.toEqual({
      'new-homepage': completeFlag,
    })
  })

  test('getFeatureFlagsByTag returns description and tags for matching flags', async () => {
    const payload = makePayload([storedCompleteFlag])

    await expect(getFeatureFlagsByTag('homepage', payload)).resolves.toEqual([completeFlag])
  })

  test('getFeatureFlag returns null when the name does not exist', async () => {
    const payload = makePayload([])

    await expect(getFeatureFlag('missing-flag', payload)).resolves.toBeNull()
  })

  test('getFeatureFlag maps omitted optional Payload fields to undefined', async () => {
    const payload = makePayload([storedSparseFlag])
    const flag = await getFeatureFlag('sparse-flag', payload)

    expect(flag).toEqual(sparseFlag)
    expect(flag?.description).toBeUndefined()
    expect(flag?.rolloutPercentage).toBeUndefined()
    expect(flag?.variants).toBeUndefined()
    expect(flag?.tags).toBeUndefined()
    expect(flag?.metadata).toBeUndefined()
  })

  test('getAllFeatureFlags maps omitted optional Payload fields to undefined', async () => {
    const payload = makePayload([storedSparseFlag])
    const flags = await getAllFeatureFlags(payload)

    expect(flags).toEqual({ 'sparse-flag': sparseFlag })
    expect(flags['sparse-flag']?.description).toBeUndefined()
    expect(flags['sparse-flag']?.tags).toBeUndefined()
  })

  test('getFeatureFlag keeps string tags and drops null nested Payload fields', async () => {
    const payload = makePayload([storedFlagWithNullableNestedFields])

    await expect(getFeatureFlag('nullable-nested', payload)).resolves.toEqual({
      name: 'nullable-nested',
      enabled: true,
      variants: [{ name: 'control', weight: 100 }],
      tags: [{ tag: 'homepage' }],
    })
  })
})
