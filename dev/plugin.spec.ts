import type { Config } from 'payload'

import { describe, expect, test } from 'vitest'

import { payloadFeatureFlags } from '../src/index.js'

const CUSTOM_LIST_VIEW = '@xtr-dev/payload-feature-flags/views#FeatureFlagsView'

const applyPlugin = (options: Parameters<typeof payloadFeatureFlags>[0]) =>
  payloadFeatureFlags(options)({ collections: [] } as unknown as Config)

const featureFlagsCollection = (config: Config) =>
  config.collections!.find((collection) => collection.slug === 'feature-flags')!

describe('enableCustomListView', () => {
  test('registers the custom list view when no collectionOverrides are given', () => {
    const config = applyPlugin({ enableCustomListView: true })

    const collection = featureFlagsCollection(config)
    expect(collection.admin?.components?.views?.list).toEqual({
      Component: CUSTOM_LIST_VIEW,
    })
  })

  test('survives collectionOverrides.admin.components and keeps the override', () => {
    const config = applyPlugin({
      enableCustomListView: true,
      collectionOverrides: {
        admin: {
          components: {
            beforeList: ['./Foo'],
          },
        },
      },
    })

    const components = featureFlagsCollection(config).admin?.components
    expect(components?.beforeList).toEqual(['./Foo'])
    expect(components?.views?.list).toEqual({ Component: CUSTOM_LIST_VIEW })
  })

  test('survives collectionOverrides.admin that sets unrelated admin keys', () => {
    const config = applyPlugin({
      enableCustomListView: true,
      collectionOverrides: {
        admin: {
          group: 'Custom Group',
        },
      },
    })

    const admin = featureFlagsCollection(config).admin
    expect(admin?.group).toBe('Custom Group')
    expect(admin?.components?.views?.list).toEqual({ Component: CUSTOM_LIST_VIEW })
  })

  test('leaves the user components untouched when disabled', () => {
    const config = applyPlugin({
      enableCustomListView: false,
      collectionOverrides: {
        admin: {
          components: {
            beforeList: ['./Foo'],
          },
        },
      },
    })

    const components = featureFlagsCollection(config).admin?.components
    expect(components?.beforeList).toEqual(['./Foo'])
    expect(components?.views?.list).toBeUndefined()
  })

  test('user admin overrides still replace the plugin defaults', () => {
    const config = applyPlugin({
      collectionOverrides: {
        admin: {
          useAsTitle: 'description',
          description: 'Custom description',
        },
      },
    })

    const admin = featureFlagsCollection(config).admin
    expect(admin?.useAsTitle).toBe('description')
    expect(admin?.description).toBe('Custom description')
    // Defaults the user did not touch stay in place
    expect(admin?.group).toBe('Configuration')
  })
})
