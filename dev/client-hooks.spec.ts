import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useFeatureFlags, useSpecificFeatureFlag } from '../src/hooks/client.js'
import { toFeatureFlag } from '../src/utils/mappers.js'

const stateUpdates: unknown[] = []

beforeEach(() => {
  stateUpdates.length = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

vi.mock('react', () => ({
  default: {},
  useCallback: (callback: () => unknown) => callback,
  useEffect: () => undefined,
  useRef: (current: unknown) => ({ current }),
  useState: (initialValue: unknown) => [initialValue, (value: unknown) => stateUpdates.push(value)],
}))

const completeFlag = {
  name: 'new-homepage',
  description: 'Shows the redesigned homepage',
  enabled: true,
  metadata: { owner: 'growth' },
  rolloutPercentage: 50,
  tags: [{ tag: 'homepage' }, { tag: 'experiment' }],
  variants: [
    { name: 'control', weight: 50 },
    { name: 'variant-a', weight: 50 },
  ],
}

const storedCompleteFlag = {
  ...completeFlag,
  id: 'flag-1',
  createdAt: '2026-08-23T00:00:00.000Z',
  environment: 'production',
  updatedAt: '2026-08-23T00:00:00.000Z',
}

const sparseFlag = {
  name: 'sparse-flag',
  enabled: true,
}

const storedSparseFlag = {
  id: 'flag-2',
  name: 'sparse-flag',
  createdAt: '2026-08-23T00:00:00.000Z',
  description: null,
  enabled: true,
  environment: 'production',
  metadata: null,
  rolloutPercentage: null,
  tags: null,
  updatedAt: '2026-08-23T00:00:00.000Z',
  variants: null,
}

const storedFlagWithNullableNestedFields = {
  id: 'flag-3',
  name: 'nullable-nested',
  createdAt: '2026-08-23T00:00:00.000Z',
  description: null,
  enabled: true,
  environment: 'production',
  metadata: null,
  rolloutPercentage: null,
  tags: [
    { id: 't1', tag: null },
    { id: 't2', tag: 'homepage' },
  ],
  updatedAt: '2026-08-23T00:00:00.000Z',
  variants: [{ id: 'v1', name: 'control', metadata: null, weight: 100 }],
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
      tags: [{ tag: 'homepage' }],
      variants: [{ name: 'control', weight: 100 }],
    })
  })

  test('useFeatureFlags maps the fetched REST document before updating hook state', async () => {
    const responseDocument = {
      ...storedCompleteFlag,
      description: 'Fetched description',
      tags: [{ tag: 'fetched' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ docs: [responseDocument] }),
      ok: true,
    }))

    const hook = useFeatureFlags([{ name: responseDocument.name }], { serverURL: 'https://flags.test' })
    await hook.refetch()

    expect(stateUpdates).toContainEqual([toFeatureFlag(responseDocument)])
  })

  test('useSpecificFeatureFlag maps the fetched REST document before updating hook state', async () => {
    const responseDocument = {
      ...storedCompleteFlag,
      description: 'Fetched description',
      tags: [{ tag: 'fetched' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ docs: [responseDocument] }),
      ok: true,
    }))

    const hook = useSpecificFeatureFlag(responseDocument.name, { serverURL: 'https://flags.test' })
    await hook.refetch()

    expect(stateUpdates).toContainEqual({
      name: responseDocument.name,
      description: 'Fetched description',
      enabled: true,
      metadata: responseDocument.metadata,
      rolloutPercentage: 50,
      tags: [{ tag: 'fetched' }],
      variants: responseDocument.variants,
    })
  })
})
