import type { Config, Endpoint, Payload, PayloadRequest } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import { buildPublicFlagsURL } from '../src/hooks/client.js'
import { getUserVariant, isUserInRollout } from '../src/hooks/server.js'
import { payloadFeatureFlags } from '../src/index.js'

const storedFlags = [
  {
    id: 1,
    name: 'new-homepage',
    description: 'secret description',
    enabled: true,
    rolloutPercentage: 50,
    variants: [
      { name: 'control', weight: 50, metadata: { secret: true } },
      { name: 'variant-a', weight: 50 },
    ],
    tags: [{ tag: 'internal' }],
    metadata: { owner: 'growth' },
  },
  { id: 2, name: 'disabled-flag', enabled: false, rolloutPercentage: 100, variants: [] },
]

const applyPlugin = (options: Parameters<typeof payloadFeatureFlags>[0]) =>
  payloadFeatureFlags(options)({ collections: [] } as unknown as Config)

const flagsCollection = (config: Config, slug = 'feature-flags') =>
  config.collections!.find((collection) => collection.slug === slug)!

const findEndpoint = (config: Config, slug = 'feature-flags'): Endpoint | undefined => {
  const endpoints = flagsCollection(config, slug).endpoints
  return endpoints ? endpoints.find((endpoint) => endpoint.path === '/evaluate') : undefined
}

const makeReq = (query: string) => {
  const find = vi.fn(async ({ where }: { where: { name: { in: string[] } } }) => ({
    docs: storedFlags.filter((flag) => where.name.in.includes(flag.name)),
  }))
  const req = {
    url: `http://localhost/api/feature-flags/evaluate${query}`,
    payload: { find, logger: { error: vi.fn() } },
  } as unknown as PayloadRequest
  return { req, find }
}

describe('publicEndpoint option', () => {
  test('is off by default', () => {
    expect(findEndpoint(applyPlugin({}))).toBeUndefined()
  })

  test('adds the endpoint and keeps endpoints from collectionOverrides', () => {
    const hostEndpoint: Endpoint = { path: '/host', method: 'get', handler: () => Response.json({}) }
    const config = applyPlugin({
      publicEndpoint: true,
      collectionOverrides: { slug: 'flags', endpoints: [hostEndpoint] },
    })

    const endpoints = flagsCollection(config, 'flags').endpoints as Endpoint[]
    expect(endpoints.map((endpoint) => endpoint.path)).toEqual(['/host', '/evaluate'])
  })

  test('is not added when the plugin is disabled or overrides set endpoints to false', () => {
    expect(findEndpoint(applyPlugin({ publicEndpoint: true, disabled: true }))).toBeUndefined()
    expect(
      flagsCollection(applyPlugin({ publicEndpoint: true, collectionOverrides: { endpoints: false } }))
        .endpoints,
    ).toBe(false)
  })
})

describe('public endpoint handler', () => {
  const handler = findEndpoint(applyPlugin({ publicEndpoint: true }))!.handler

  test('returns only name and enabled for the named flags, bypassing collection access', async () => {
    const { req, find } = makeReq('?names=new-homepage,disabled-flag,missing')
    const response = await handler(req)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      flags: {
        'new-homepage': { name: 'new-homepage', enabled: true },
        'disabled-flag': { name: 'disabled-flag', enabled: false },
      },
    })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'feature-flags',
        overrideAccess: true,
        where: { name: { in: ['new-homepage', 'disabled-flag', 'missing'] } },
      }),
    )
  })

  test('resolves variant and rollout for a userId like the RSC helpers do', async () => {
    const serverPayload = {
      config: { collections: [] },
      find: vi.fn(async () => ({ docs: [storedFlags[0]] })),
    } as unknown as Payload

    for (const userId of ['user-1', 'user-2', 'user-3', 'abc', 'zzz']) {
      const { req } = makeReq(`?names=new-homepage,disabled-flag&userId=${userId}`)
      const body = await (await handler(req)).json()

      expect(body.flags['new-homepage']).toEqual({
        name: 'new-homepage',
        enabled: true,
        variant: await getUserVariant('new-homepage', userId, serverPayload),
        inRollout: await isUserInRollout('new-homepage', userId, serverPayload),
      })
      expect(body.flags['disabled-flag']).toEqual({
        name: 'disabled-flag',
        enabled: false,
        variant: null,
        inRollout: false,
      })
    }
  })

  test('rejects a request without names', async () => {
    const { req, find } = makeReq('')
    const response = await handler(req)

    expect(response.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })
})

describe('buildPublicFlagsURL', () => {
  test('encodes names and userId', () => {
    expect(
      buildPublicFlagsURL(
        { serverURL: 'https://example.com', apiPath: '/api', collectionSlug: 'feature-flags' },
        ['a b', 'c&d'],
        'user 1',
      ),
    ).toBe('https://example.com/api/feature-flags/evaluate?names=a+b%2Cc%26d&userId=user+1')
  })
})
