import type { Payload } from 'payload'

import { describe, expectTypeOf, test } from 'vitest'

import type {
  FeatureFlag as ClientFeatureFlag,
  useFeatureFlag,
  useFeatureFlags,
  useRolloutCheck,
  useSpecificFeatureFlag,
  useVariantSelection,
} from '../src/exports/client.js'
import type { FeatureFlag as RscFeatureFlag } from '../src/exports/rsc.js'
import type { FeatureFlag, FeatureFlagDocument } from '../src/index.js'
import type { FeatureFlag as GeneratedFeatureFlag } from './payload-types.js'

import { getAllFeatureFlags, getFeatureFlag, getFeatureFlagsByTag } from '../src/exports/rsc.js'
import { isPartialRollout } from '../src/utils/rollout.js'

/** Keys of the fields the plugin itself adds to the collection (the dev app adds more). */
type PluginFieldKeys = keyof FeatureFlagDocument

describe('FeatureFlagDocument', () => {
  test('accepts the document type Payload generates for the collection', () => {
    // dev/payload-types.ts is generated from the dev app's config, so this
    // fails when the declared document shape drifts from what Payload stores
    // (a field that became nullable, a renamed field, a changed id type).
    expectTypeOf<GeneratedFeatureFlag>().toExtend<FeatureFlagDocument>()
  })

  test('declares each plugin field exactly as Payload generates it', () => {
    type Generated = Pick<GeneratedFeatureFlag, Extract<keyof GeneratedFeatureFlag, PluginFieldKeys>>

    expectTypeOf<keyof Generated>().toEqualTypeOf<PluginFieldKeys>()
    expectTypeOf<Generated['description']>().toEqualTypeOf<FeatureFlagDocument['description']>()
    expectTypeOf<Generated['rolloutPercentage']>().toEqualTypeOf<
      FeatureFlagDocument['rolloutPercentage']
    >()
    expectTypeOf<Generated['enabled']>().toEqualTypeOf<FeatureFlagDocument['enabled']>()
    expectTypeOf<Generated['name']>().toEqualTypeOf<FeatureFlagDocument['name']>()
    expectTypeOf<Generated['tags']>().toEqualTypeOf<FeatureFlagDocument['tags']>()
    expectTypeOf<Generated['createdAt']>().toEqualTypeOf<FeatureFlagDocument['createdAt']>()
    expectTypeOf<Generated['updatedAt']>().toEqualTypeOf<FeatureFlagDocument['updatedAt']>()
  })

  test('allows null for the optional fields Payload returns as null', () => {
    expectTypeOf<null>().toExtend<FeatureFlagDocument['description']>()
    expectTypeOf<null>().toExtend<FeatureFlagDocument['rolloutPercentage']>()
    expectTypeOf<null>().toExtend<FeatureFlagDocument['tags']>()
    expectTypeOf<null>().toExtend<FeatureFlagDocument['variants']>()
  })

  test('has no fields the plugin does not add to the collection', () => {
    expectTypeOf<FeatureFlagDocument>().not.toHaveProperty('environment')
  })

  test('can be passed to the helpers that take stored values', () => {
    expectTypeOf(isPartialRollout).toBeCallableWith(
      {} as FeatureFlagDocument['rolloutPercentage'],
    )
  })
})

describe('FeatureFlag', () => {
  test('is the same type from every entry point', () => {
    expectTypeOf<FeatureFlag>().toEqualTypeOf<RscFeatureFlag>()
    expectTypeOf<FeatureFlag>().toEqualTypeOf<ClientFeatureFlag>()
  })

  test('is what the RSC helpers return', () => {
    const payload = {} as Payload

    expectTypeOf(getFeatureFlag('flag', payload)).resolves.toEqualTypeOf<FeatureFlag | null>()
    expectTypeOf(getAllFeatureFlags(payload)).resolves.toEqualTypeOf<Record<string, FeatureFlag>>()
    expectTypeOf(getFeatureFlagsByTag('tag', payload)).resolves.toEqualTypeOf<FeatureFlag[]>()
  })

  test('is what the client hooks return', () => {
    expectTypeOf<ReturnType<typeof useSpecificFeatureFlag>['flag']>().toEqualTypeOf<FeatureFlag | null>()
    expectTypeOf<ReturnType<typeof useVariantSelection>['flag']>().toEqualTypeOf<FeatureFlag | null>()
    expectTypeOf<ReturnType<typeof useRolloutCheck>['flag']>().toEqualTypeOf<FeatureFlag | null>()
    expectTypeOf<ReturnType<typeof useFeatureFlag>['flag']>().toEqualTypeOf<null | Partial<FeatureFlag>>()
    expectTypeOf<ReturnType<typeof useFeatureFlags>['flags']>().toEqualTypeOf<Partial<FeatureFlag>[]>()
  })

  test('never holds null and has no document-only fields', () => {
    expectTypeOf<FeatureFlag['description']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FeatureFlag['rolloutPercentage']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<FeatureFlag>().not.toHaveProperty('id')
    expectTypeOf<FeatureFlag>().not.toHaveProperty('createdAt')
    expectTypeOf<FeatureFlag>().not.toHaveProperty('updatedAt')
    expectTypeOf<FeatureFlag>().not.toHaveProperty('environment')
  })
})
