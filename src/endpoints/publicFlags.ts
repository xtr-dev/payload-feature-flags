import type { Endpoint, PayloadRequest } from 'payload'

import { isUserInRolloutBucket, selectVariantForUser } from '../bucketing.js'

/** Path of the public endpoint, relative to the feature flags collection. */
export const PUBLIC_FLAGS_PATH = '/evaluate'

/** Most flag names one request may ask for. */
export const MAX_PUBLIC_FLAG_NAMES = 100

/**
 * What the public endpoint returns per flag. Only the name and on/off state
 * leave the server; `variant` and `inRollout` are resolved on the server for
 * the given `userId`, so variant weights, rollout percentages, metadata,
 * descriptions and tags stay private.
 */
export interface PublicFeatureFlag {
  name: string
  enabled: boolean
  /** Variant for `userId`; present only when a `userId` was sent. */
  variant?: string | null
  /** Whether `userId` falls inside the rollout; present only when a `userId` was sent. */
  inRollout?: boolean
}

export interface PublicFeatureFlagsResponse {
  flags: Record<string, PublicFeatureFlag>
}

/**
 * Same bucketing as `isUserInRollout` in the RSC helpers, so a user gets the
 * same answer from the server helpers and from the public endpoint.
 */
export function resolveRollout(
  flagName: string,
  userId: string,
  enabled: boolean,
  rolloutPercentage: unknown,
): boolean {
  return enabled && isUserInRolloutBucket(flagName, userId, rolloutPercentage)
}

/**
 * Same weighted selection as `getUserVariant` in the RSC helpers.
 */
export function resolveVariant(flagName: string, userId: string, enabled: boolean, variants: unknown): string | null {
  return enabled ? selectVariantForUser(flagName, userId, variants) : null
}

/** Reads `names` (comma separated, or repeated) from the query string. */
function readNames(req: PayloadRequest): string[] {
  const url = new URL(req.url ?? '', 'http://localhost')
  const names = url.searchParams
    .getAll('names')
    .flatMap((value) => value.split(','))
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
  return Array.from(new Set(names))
}

function readUserId(req: PayloadRequest): string | undefined {
  const url = new URL(req.url ?? '', 'http://localhost')
  const userId = url.searchParams.get('userId')
  return userId ? userId : undefined
}

/**
 * Builds the public `GET /api/<collection>/evaluate?names=a,b&userId=u`
 * endpoint used by the client hooks. It reads the collection with
 * `overrideAccess`, so the collection's own `read` access can stay closed to
 * visitors. Callers must name the flags they want: the endpoint never lists
 * every flag. Every requested name is answered, and a name with no flag gets
 * `enabled: false`, so the response does not reveal which flags exist.
 */
export function createPublicFlagsEndpoint(collectionSlug: string): Endpoint {
  return {
    path: PUBLIC_FLAGS_PATH,
    method: 'get',
    handler: async (req) => {
      const names = readNames(req)
      if (names.length === 0) {
        return Response.json({ error: 'Pass the flag names to check in `names`.' }, { status: 400 })
      }
      if (names.length > MAX_PUBLIC_FLAG_NAMES) {
        return Response.json(
          { error: `Ask for at most ${MAX_PUBLIC_FLAG_NAMES} flags per request.` },
          { status: 400 },
        )
      }
      const userId = readUserId(req)

      try {
        const result = await req.payload.find({
          collection: collectionSlug,
          where: { name: { in: names } },
          limit: names.length,
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })

        const docsByName = new Map<string, Record<string, unknown>>()
        for (const doc of result.docs as Array<Record<string, unknown>>) {
          if (typeof doc.name === 'string') {
            docsByName.set(doc.name, doc)
          }
        }

        // Answer every requested name the same way whether or not the flag
        // exists: a missing flag looks exactly like a disabled one.
        // Null prototype, so a requested name such as `__proto__` is stored as
        // an ordinary key instead of hitting Object.prototype's setter.
        const flags: Record<string, PublicFeatureFlag> = Object.create(null)
        for (const name of names) {
          const doc = docsByName.get(name)
          const enabled = doc?.enabled === true
          const flag: PublicFeatureFlag = { name, enabled }
          if (userId !== undefined) {
            flag.variant = resolveVariant(name, userId, enabled, doc?.variants)
            flag.inRollout = resolveRollout(name, userId, enabled, doc?.rolloutPercentage)
          }
          flags[name] = flag
        }

        const body: PublicFeatureFlagsResponse = { flags }
        return Response.json(body)
      } catch (error) {
        req.payload.logger.error({ err: error, msg: 'Failed to evaluate public feature flags' })
        return Response.json({ error: 'Could not read feature flags.' }, { status: 500 })
      }
    },
  }
}
