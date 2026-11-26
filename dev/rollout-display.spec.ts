import { describe, expect, test } from 'vitest'

import { isPartialRollout } from '../src/utils/rollout.js'

describe('isPartialRollout', () => {
  test('treats 0% as a partial rollout, not as fully on', () => {
    expect(isPartialRollout(0)).toBe(true)
  })

  test('treats values below 100 as partial', () => {
    expect(isPartialRollout(1)).toBe(true)
    expect(isPartialRollout(99)).toBe(true)
  })

  test('treats 100% and a missing percentage as fully on', () => {
    expect(isPartialRollout(100)).toBe(false)
    expect(isPartialRollout(undefined)).toBe(false)
    expect(isPartialRollout(null)).toBe(false)
  })
})
