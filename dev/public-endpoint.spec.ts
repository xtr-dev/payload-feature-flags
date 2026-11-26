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
    metadata: { owner: 'growth' },
    rolloutPercentage: 50,
    tags: [{ tag: 'internal' }],
    variants: [
      { name: 'control', metadata: { secret: true }, weight: 50 },
      { name: 'variant-a', weight: 50 },
    ],
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
    payload: { find, logger: { error: vi.fn() } },
    url: `http://localhost/api/feature-flags/evaluate${query}`,
  } as unknown as PayloadRequest
  return { find, req }
}

describe('publicEndpoint option', () => {
  test('is off by default', () => {
    expect(findEndpoint(applyPlugin({}))).toBeUndefined()
  })

  test('adds the endpoint and keeps endpoints from collectionOverrides', () => {
    const hostEndpoint: Endpoint = { handler: () => Response.json({}), method: 'get', path: '/host' }
    const config = applyPlugin({
      collectionOverrides: { slug: 'flags', endpoints: [hostEndpoint] },
      publicEndpoint: true,
    })

    const endpoints = flagsCollection(config, 'flags').endpoints as Endpoint[]
    expect(endpoints.map((endpoint) => endpoint.path)).toEqual(['/host', '/evaluate'])
  })

  test('is not added when the plugin is disabled or overrides set endpoints to false', () => {
    expect(findEndpoint(applyPlugin({ disabled: true, publicEndpoint: true }))).toBeUndefined()
    expect(
      flagsCollection(applyPlugin({ collectionOverrides: { endpoints: false }, publicEndpoint: true }))
        .endpoints,
    ).toBe(false)
  })
})

describe('public endpoint handler', () => {
  const handler = findEndpoint(applyPlugin({ publicEndpoint: true }))!.handler

  test('returns only name and enabled for every named flag, bypassing collection access', async () => {
    const { find, req } = makeReq('?names=new-homepage,disabled-flag,missing')
    const response = await handler(req)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      flags: {
        'disabled-flag': { name: 'disabled-flag', enabled: false },
        'new-homepage': { name: 'new-homepage', enabled: true },
        // A missing flag is answered like a disabled one, so existence cannot be probed
        missing: { name: 'missing', enabled: false },
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
        inRollout: await isUserInRollout('new-homepage', userId, serverPayload),
        variant: await getUserVariant('new-homepage', userId, serverPayload),
      })
      expect(body.flags['disabled-flag']).toEqual({
        name: 'disabled-flag',
        enabled: false,
        inRollout: false,
        variant: null,
      })
    }
  })

  test('answers names that clash with Object.prototype', async () => {
    const { req } = makeReq('?names=__proto__,constructor')
    const body = await (await handler(req)).json()

    expect(Object.keys(body.flags)).toEqual(['__proto__', 'constructor'])
    expect(body.flags['__proto__']).toEqual({ name: '__proto__', enabled: false })
    expect(body.flags.constructor).toEqual({ name: 'constructor', enabled: false })
  })

  test('rejects a request without names', async () => {
    const { find, req } = makeReq('')
    const response = await handler(req)

    expect(response.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })
})

describe('buildPublicFlagsURL', () => {
  test('encodes names and userId', () => {
    expect(
      buildPublicFlagsURL(
        { apiPath: '/api', collectionSlug: 'feature-flags', serverURL: 'https://example.com' },
        ['a b', 'c&d'],
        'user 1',
      ),
    ).toBe('https://example.com/api/feature-flags/evaluate?names=a+b%2Cc%26d&userId=user+1')
  })
})
