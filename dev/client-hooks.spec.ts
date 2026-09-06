import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFeatureFlags, useSpecificFeatureFlag, type FeatureFlag } from '../src/hooks/client.js'

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

describe('Client feature flag hooks', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('useFeatureFlags normalizes complete flag with description and tags', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedCompleteFlag] }),
    })

    const { result } = renderHook(() => useFeatureFlags([{ name: 'new-homepage' }]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flags).toEqual([completeFlag])
  })

  test('useFeatureFlags maps omitted optional Payload fields to undefined', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedSparseFlag] }),
    })

    const { result } = renderHook(() => useFeatureFlags([{ name: 'sparse-flag' }]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const flag = result.current.flags[0]
    expect(flag?.name).toBe('sparse-flag')
    expect(flag?.enabled).toBe(true)
    expect(flag?.description).toBeUndefined()
    expect(flag?.rolloutPercentage).toBeUndefined()
    expect(flag?.variants).toBeUndefined()
    expect(flag?.tags).toBeUndefined()
    expect(flag?.metadata).toBeUndefined()
  })

  test('useFeatureFlags keeps string tags and drops null nested Payload fields', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedFlagWithNullableNestedFields] }),
    })

    const { result } = renderHook(() =>
      useFeatureFlags([{ name: 'nullable-nested' }])
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const flag = result.current.flags[0]
    expect(flag).toEqual({
      name: 'nullable-nested',
      enabled: true,
      variants: [{ name: 'control', weight: 100 }],
      tags: [{ tag: 'homepage' }],
    })
  })

  test('useSpecificFeatureFlag normalizes flag with description and tags', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedCompleteFlag] }),
    })

    const { result } = renderHook(() => useSpecificFeatureFlag('new-homepage'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flag).toEqual(completeFlag)
  })

  test('useSpecificFeatureFlag maps omitted optional Payload fields to undefined', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedSparseFlag] }),
    })

    const { result } = renderHook(() => useSpecificFeatureFlag('sparse-flag'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const flag = result.current.flag
    expect(flag?.name).toBe('sparse-flag')
    expect(flag?.enabled).toBe(true)
    expect(flag?.description).toBeUndefined()
    expect(flag?.rolloutPercentage).toBeUndefined()
    expect(flag?.variants).toBeUndefined()
    expect(flag?.tags).toBeUndefined()
    expect(flag?.metadata).toBeUndefined()
  })

  test('useSpecificFeatureFlag keeps string tags and drops null nested fields', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [storedFlagWithNullableNestedFields] }),
    })

    const { result } = renderHook(() =>
      useSpecificFeatureFlag('nullable-nested')
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flag).toEqual({
      name: 'nullable-nested',
      enabled: true,
      variants: [{ name: 'control', weight: 100 }],
      tags: [{ tag: 'homepage' }],
    })
  })

  test('useSpecificFeatureFlag returns null when flag not found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ docs: [] }),
    })

    const { result } = renderHook(() => useSpecificFeatureFlag('missing-flag'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flag).toBeNull()
    expect(result.current.error).toBeDefined()
  })

  test('useFeatureFlags handles fetch errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useFeatureFlags([{ name: 'test-flag' }]))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.flags).toEqual([{ name: 'test-flag' }])
  })
})
