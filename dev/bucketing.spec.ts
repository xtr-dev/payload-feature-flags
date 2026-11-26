import type { Payload } from 'payload'

import { describe, expect, test } from 'vitest'

import { resolveRollout, resolveVariant } from '../src/endpoints/publicFlags.js'
import { getUserVariant, isUserInRollout } from '../src/hooks/server.js'

type StoredFlag = { name: string } & Record<string, unknown>

const makePayload = (docs: StoredFlag[]): Payload =>
  ({
    config: { collections: [], custom: { payloadFeatureFlags: { collectionSlug: 'feature-flags' } } },
    find: async ({ where }: { where?: { name?: { equals?: unknown } } }) => ({
      docs: docs.filter((doc) => where?.name?.equals === undefined || doc.name === where.name.equals),
    }),
  }) as unknown as Payload

const halfVariants = [
  { name: 'control', weight: 50 },
  { name: 'treatment', weight: 50 },
]

const payload = makePayload([
  { name: 'rollout-a', enabled: true, rolloutPercentage: 50 },
  { name: 'rollout-b', enabled: true, rolloutPercentage: 50 },
  { name: 'rollout-zero', enabled: true, rolloutPercentage: 0 },
  { name: 'rollout-none', enabled: true, rolloutPercentage: null },
  { name: 'rollout-ten', enabled: true, rolloutPercentage: 10 },
  { name: 'test-a', enabled: true, variants: halfVariants },
  { name: 'test-b', enabled: true, variants: halfVariants },
  { name: 'rollout-and-test', enabled: true, rolloutPercentage: 50, variants: halfVariants },
])

const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}-${(i * 2654435761) % 1000003}`)
const sequentialIds = Array.from({ length: 1000 }, (_, i) => String(i + 1))

describe('rollout and variant bucketing', () => {
  test('two flags with the same rollout percentage include different users', async () => {
    let disagreements = 0
    for (const id of userIds) {
      if ((await isUserInRollout('rollout-a', id, payload)) !== (await isUserInRollout('rollout-b', id, payload))) {
        disagreements++
      }
    }
    // Independent 50% rollouts disagree for about half the users.
    expect(disagreements).toBeGreaterThan(400)
    expect(disagreements).toBeLessThan(600)
  })

  test('two A/B tests with the same weights assign variants independently', async () => {
    let disagreements = 0
    for (const id of userIds) {
      if ((await getUserVariant('test-a', id, payload)) !== (await getUserVariant('test-b', id, payload))) {
        disagreements++
      }
    }
    expect(disagreements).toBeGreaterThan(400)
    expect(disagreements).toBeLessThan(600)
  })

  test('users inside a rollout are still split across the same flag variants', async () => {
    const variants = new Map<string, number>()
    for (const id of userIds) {
      if (await isUserInRollout('rollout-and-test', id, payload)) {
        const variant = (await getUserVariant('rollout-and-test', id, payload)) as string
        variants.set(variant, (variants.get(variant) ?? 0) + 1)
      }
    }
    expect(variants.get('control')).toBeGreaterThan(150)
    expect(variants.get('treatment')).toBeGreaterThan(150)
  })

  test('sequential user ids spread evenly instead of landing in consecutive buckets', async () => {
    let included = 0
    for (const id of sequentialIds) {
      if (await isUserInRollout('rollout-ten', id, payload)) {
        included++
      }
    }
    expect(included).toBeGreaterThan(60)
    expect(included).toBeLessThan(140)
  })

  test('the public endpoint resolves the same answers as the RSC helpers', async () => {
    for (const id of userIds.slice(0, 200)) {
      expect(resolveRollout('rollout-a', id, true, 50)).toBe(await isUserInRollout('rollout-a', id, payload))
      expect(resolveVariant('test-a', id, true, halfVariants)).toBe(await getUserVariant('test-a', id, payload))
    }
  })
})

describe('rollout percentage edge cases', () => {
  test('rolloutPercentage 0 includes nobody', async () => {
    for (const id of userIds.slice(0, 200)) {
      expect(await isUserInRollout('rollout-zero', id, payload)).toBe(false)
      expect(resolveRollout('rollout-zero', id, true, 0)).toBe(false)
    }
  })

  test('a missing rolloutPercentage includes everybody', async () => {
    for (const id of userIds.slice(0, 200)) {
      expect(await isUserInRollout('rollout-none', id, payload)).toBe(true)
      expect(resolveRollout('rollout-none', id, true, null)).toBe(true)
      expect(resolveRollout('rollout-none', id, true, undefined)).toBe(true)
    }
  })

  test('100 includes everybody and a disabled flag includes nobody', () => {
    expect(resolveRollout('any', 'u', true, 100)).toBe(true)
    expect(resolveRollout('any', 'u', false, 100)).toBe(false)
    expect(resolveVariant('any', 'u', false, halfVariants)).toBeNull()
  })
})
