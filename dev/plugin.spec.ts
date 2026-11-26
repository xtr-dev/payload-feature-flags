import type { Config, Endpoint } from 'payload'

import { describe, expect, test } from 'vitest'

import { payloadFeatureFlags } from '../src/index.js'

const CUSTOM_LIST_VIEW = '@xtr-dev/payload-feature-flags/views#FeatureFlagsView'

const applyPlugin = (options: Parameters<typeof payloadFeatureFlags>[0]) =>
  payloadFeatureFlags(options)({ collections: [] } as unknown as Config)

const featureFlagsCollection = (config: Config) =>
  config.collections!.find((collection) => collection.slug === 'feature-flags')!

const hostEndpoint: Endpoint = {
  handler: async () => new Response('host'),
  method: 'get',
  path: '/host-endpoint',
}

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
      collectionOverrides: {
        admin: {
          components: {
            beforeList: ['./Foo'],
          },
        },
      },
      enableCustomListView: true,
    })

    const components = featureFlagsCollection(config).admin?.components
    expect(components?.beforeList).toEqual(['./Foo'])
    expect(components?.views?.list).toEqual({ Component: CUSTOM_LIST_VIEW })
  })

  test('survives collectionOverrides.admin that sets unrelated admin keys', () => {
    const config = applyPlugin({
      collectionOverrides: {
        admin: {
          group: 'Custom Group',
        },
      },
      enableCustomListView: true,
    })

    const admin = featureFlagsCollection(config).admin
    expect(admin?.group).toBe('Custom Group')
    expect(admin?.components?.views?.list).toEqual({ Component: CUSTOM_LIST_VIEW })
  })

  test('leaves the user components untouched when disabled', () => {
    const config = applyPlugin({
      collectionOverrides: {
        admin: {
          components: {
            beforeList: ['./Foo'],
          },
        },
      },
      enableCustomListView: false,
    })

    const components = featureFlagsCollection(config).admin?.components
    expect(components?.beforeList).toEqual(['./Foo'])
    expect(components?.views?.list).toBeUndefined()
  })

  test('user admin overrides still replace the plugin defaults', () => {
    const config = applyPlugin({
      collectionOverrides: {
        admin: {
          description: 'Custom description',
          useAsTitle: 'description',
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
  test('adds the flags collection and overview without replacing host collections, views, or endpoints', () => {
    const posts = { slug: 'posts', fields: [] }
    const hostView = { Component: './HostDashboard', path: '/host' }

    const config = payloadFeatureFlags()({
      admin: { components: { views: { host: hostView } } },
      collections: [posts],
      endpoints: [hostEndpoint],
    } as unknown as Config)

    expect(config.collections).toHaveLength(2)
    expect(config.collections?.[0]).toBe(posts)
    expect(config.collections?.[1]?.slug).toBe('feature-flags')
    expect(config.admin?.components?.views?.host).toBe(hostView)
    expect(config.admin?.components?.views?.['feature-flags-overview']).toMatchObject({
      Component: {
        exportName: 'FeatureFlagsOverviewView',
        path: '@xtr-dev/payload-feature-flags/views',
      },
      path: '/feature-flags-overview',
    })
    expect(config.endpoints).toHaveLength(1)
    expect(config.endpoints?.[0]).toBe(hostEndpoint)
  })

  test('keeps host collections, views, and endpoints and does not register the overview when disabled', () => {
    const posts = { slug: 'posts', fields: [] }
    const hostView = { Component: './HostDashboard', path: '/host' }

    const config = payloadFeatureFlags({ disabled: true })({
      admin: { components: { views: { host: hostView } } },
      collections: [posts],
      endpoints: [hostEndpoint],
    } as unknown as Config)

    expect(config.collections).toHaveLength(2)
    expect(config.collections?.[0]).toBe(posts)
    expect(config.collections?.[1]?.slug).toBe('feature-flags')
    expect(config.admin?.components?.views?.host).toBe(hostView)
    expect(config.admin?.components?.views?.['feature-flags-overview']).toBeUndefined()
    expect(config.endpoints).toHaveLength(1)
    expect(config.endpoints?.[0]).toBe(hostEndpoint)
  })
})
