import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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
      collection: 'feature-flags',
      id: created.id,
    })

    expect(found.name).toBe(name)
    expect(found.enabled).toBe(true)
    expect(found.environment).toBe('staging')
    expect(found.rolloutPercentage).toBe(25)
    expect(found.variants).toHaveLength(2)
    expect(found.variants[0].name).toBe('control')
    expect(found.variants[0].weight).toBe(50)

    await payload.delete({ collection: 'feature-flags', id: created.id })
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
