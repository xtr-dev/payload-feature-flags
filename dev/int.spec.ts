import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import type { FeatureFlagDocument } from '../src/index.js'
import type { FeatureFlag as GeneratedFeatureFlag } from './payload-types.js'

import { getFeatureFlag } from '../src/hooks/server.js'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  await payload.destroy()
})

describe('feature flags plugin', () => {
  test('registers the feature-flags collection', () => {
    expect(payload.collections['feature-flags']).toBeDefined()
  })

  test('collection carries the plugin fields and the override fields together', () => {
    const fieldNames = payload.collections['feature-flags'].config.fields
      .map((field) => ('name' in field ? field.name : null))
      .filter(Boolean)

    // Plugin defaults, with rollouts and variants enabled in dev/payload.config.ts
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'name',
        'description',
        'enabled',
        'rolloutPercentage',
        'variants',
        'tags',
        'metadata',
      ]),
    )
    // Fields added through collectionOverrides.fields must survive alongside the defaults
    expect(fieldNames).toEqual(
      expect.arrayContaining(['environment', 'owner', 'expiresAt', 'jiraTicket']),
    )
  })

  test('the seeded flag is readable back from the database', async () => {
    const { docs } = await payload.find({
      collection: 'feature-flags',
      where: { name: { equals: 'new-feature' } },
    })

    expect(docs).toHaveLength(1)
    expect(docs[0].enabled).toBe(true)
    expect(docs[0].environment).toBe('development')
  })

  test('a flag with rollout and variants round-trips through a real adapter', async () => {
    // Unique per run: the sqlite file persists between local runs and `name` is unique
    const name = `int-test-${Date.now()}`

    const created = await payload.create({
      collection: 'feature-flags',
      data: {
        name,
        description: 'created by dev/int.spec.ts',
        enabled: true,
        environment: 'staging',
        rolloutPercentage: 25,
        variants: [
          { name: 'control', weight: 50 },
          { name: 'variant-a', weight: 50 },
        ],
      },
    })

    const found = await payload.findByID({
      id: created.id,
      collection: 'feature-flags',
    })

    expect(found.name).toBe(name)
    expect(found.enabled).toBe(true)
    expect(found.environment).toBe('staging')
    expect(found.rolloutPercentage).toBe(25)
    expect(found.variants).toHaveLength(2)
    expect(found.variants[0].name).toBe('control')
    expect(found.variants[0].weight).toBe(50)

    await payload.delete({ id: created.id, collection: 'feature-flags' })
  })

  test('optional fields left empty are stored as null and reach the helpers as undefined', async () => {
    const name = `int-sparse-${Date.now()}`

    const created = await payload.create({
      collection: 'feature-flags',
      // rolloutPercentage has a default of 100, so it is cleared explicitly
      data: { name, enabled: true, environment: 'staging', rolloutPercentage: null },
    })

    try {
      // FeatureFlagDocument is the declared shape of what Payload returns here:
      // the optional scalar fields come back as null, not as missing keys.
      // The Local API is not typed against this app's collections (the dev
      // config turns off the `declare module 'payload'` block), so the result
      // is first given the generated document type, which must then be
      // assignable to FeatureFlagDocument.
      const found = (await payload.findByID({
        id: created.id,
        collection: 'feature-flags',
      })) as GeneratedFeatureFlag
      const stored: FeatureFlagDocument = found

      expect(stored.id).toBe(created.id)
      expect(typeof stored.createdAt).toBe('string')
      expect(typeof stored.updatedAt).toBe('string')
      expect(stored.description).toBeNull()
      expect(stored.rolloutPercentage).toBeNull()
      expect(stored.metadata).toBeNull()
      expect(stored.variants ?? []).toEqual([])
      expect(stored.tags ?? []).toEqual([])

      // FeatureFlag, the helpers' return type, never holds null and has no
      // document-only fields.
      const flag = await getFeatureFlag(name, payload)
      expect(flag).not.toBeNull()
      expect(flag).toMatchObject({ name, enabled: true })
      expect(flag?.description).toBeUndefined()
      expect(flag?.rolloutPercentage).toBeUndefined()
      expect(flag?.metadata).toBeUndefined()
      expect(Object.values(flag ?? {})).not.toContain(null)
      expect(flag).not.toHaveProperty('id')
      expect(flag).not.toHaveProperty('createdAt')
      expect(flag).not.toHaveProperty('updatedAt')
    } finally {
      await payload.delete({ id: created.id, collection: 'feature-flags' })
    }
  })

  test('the unique constraint on name reaches the adapter', async () => {
    await expect(
      payload.create({
        collection: 'feature-flags',
        data: {
          name: 'new-feature', // already created by the seed
          enabled: false,
          environment: 'development',
        },
      }),
    ).rejects.toThrow()
  })
})
