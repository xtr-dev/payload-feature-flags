import { describe, expect, test } from 'vitest'
import { toFeatureFlag } from '../src/utils/mappers.js'

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

describe('Client and server feature flag mapper', () => {
  test('toFeatureFlag normalizes complete flag with description and tags', () => {
    expect(toFeatureFlag(storedCompleteFlag)).toEqual(completeFlag)
  })

  test('toFeatureFlag maps omitted optional Payload fields to undefined', () => {
    const flag = toFeatureFlag(storedSparseFlag)

    expect(flag).toEqual(sparseFlag)
    expect(flag.description).toBeUndefined()
    expect(flag.rolloutPercentage).toBeUndefined()
    expect(flag.variants).toBeUndefined()
    expect(flag.tags).toBeUndefined()
    expect(flag.metadata).toBeUndefined()
  })

  test('toFeatureFlag keeps string tags and drops null nested Payload fields', () => {
    expect(toFeatureFlag(storedFlagWithNullableNestedFields)).toEqual({
      name: 'nullable-nested',
      enabled: true,
      variants: [{ name: 'control', weight: 100 }],
      tags: [{ tag: 'homepage' }],
    })
  })
})
