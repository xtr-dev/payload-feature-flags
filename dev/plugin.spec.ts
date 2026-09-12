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

describe('host configuration', () => {
  test('adds the flags collection and overview without replacing host collections or views', () => {
    const posts = { slug: 'posts', fields: [] }
    const hostView = { Component: './HostDashboard', path: '/host' }

    const config = payloadFeatureFlags()({
      collections: [posts],
      admin: { components: { views: { host: hostView } } },
    } as unknown as Config)

    expect(config.collections).toHaveLength(2)
    expect(config.collections?.[0]).toBe(posts)
    expect(config.collections?.[1]?.slug).toBe('feature-flags')
    expect(config.admin?.components?.views?.host).toBe(hostView)
    expect(config.admin?.components?.views?.['feature-flags-overview']).toEqual({
      Component: '@xtr-dev/payload-feature-flags/views#FeatureFlagsView',
      path: '/feature-flags-overview',
    })
  })

  test('keeps host collections and does not register the overview when disabled', () => {
    const posts = { slug: 'posts', fields: [] }
    const hostView = { Component: './HostDashboard', path: '/host' }

    const config = payloadFeatureFlags({ disabled: true })({
      collections: [posts],
      admin: { components: { views: { host: hostView } } },
    } as unknown as Config)

    expect(config.collections).toHaveLength(2)
    expect(config.collections?.[0]).toBe(posts)
    expect(config.collections?.[1]?.slug).toBe('feature-flags')
    expect(config.admin?.components?.views?.host).toBe(hostView)
    expect(config.admin?.components?.views?.['feature-flags-overview']).toBeUndefined()
  })
})
