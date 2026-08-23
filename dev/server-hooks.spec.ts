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
    const payload = makePayload([completeFlag])

    await expect(getFeatureFlag('new-homepage', payload)).resolves.toEqual(completeFlag)
  })

  test('getAllFeatureFlags returns description and tags for each active flag', async () => {
    const payload = makePayload([completeFlag])

    await expect(getAllFeatureFlags(payload)).resolves.toEqual({
      'new-homepage': completeFlag,
    })
  })

  test('getFeatureFlagsByTag returns description and tags for matching flags', async () => {
    const payload = makePayload([completeFlag])

    await expect(getFeatureFlagsByTag('homepage', payload)).resolves.toEqual([completeFlag])
  })

  test('getFeatureFlag returns null when the name does not exist', async () => {
    const payload = makePayload([])

    await expect(getFeatureFlag('missing-flag', payload)).resolves.toBeNull()
  })
})
