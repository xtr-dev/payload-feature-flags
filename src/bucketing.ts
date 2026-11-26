/**
 * Deterministic user bucketing for rollouts and A/B variants.
 *
 * This module is shared by the RSC helpers, the public evaluate endpoint and
 * the client hooks, so a user gets the same answer from all three. It has no
 * imports and is safe to bundle for the browser.
 *
 * Each flag buckets users independently: the hashed key includes the flag
 * name, so being inside one flag's rollout says nothing about another flag's.
 * Rollout and variant selection of the same flag also use different keys, so
 * a 50% rollout combined with a 50/50 split does not put every rolled-out user
 * in the first variant.
 */

/** FNV-1a (32 bit) followed by MurmurHash3's finalizer, as an unsigned 32-bit int. */
function hash32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // The finalizer mixes every input bit into the low bits, so keys that differ
  // only in their last character (user ids '1', '2', '3') land in unrelated buckets.
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return hash >>> 0
}

/** Bucket 0-99 that decides whether `userId` is inside the rollout of `flagName`. */
export function getRolloutBucket(flagName: string, userId: string): number {
  return hash32(`${flagName}:${userId}`) % 100
}

/** Bucket 0-99 that decides which variant of `flagName` `userId` gets. */
export function getVariantBucket(flagName: string, userId: string): number {
  return hash32(`${flagName}:variant:${userId}`) % 100
}

/**
 * Whether `userId` is inside the rollout of an enabled flag. A missing
 * percentage (null or undefined) means no gradual rollout, so everyone is in;
 * 0 means nobody is.
 */
export function isUserInRolloutBucket(flagName: string, userId: string, rolloutPercentage: unknown): boolean {
  if (typeof rolloutPercentage !== 'number' || Number.isNaN(rolloutPercentage)) {
    return true
  }
  if (rolloutPercentage >= 100) {
    return true
  }
  if (rolloutPercentage <= 0) {
    return false
  }
  return getRolloutBucket(flagName, userId) < rolloutPercentage
}

/**
 * Picks a variant by weight (weights are percentages). When the weights add up
 * to less than 100, users in the remaining buckets get the first variant.
 */
export function selectVariantForUser(flagName: string, userId: string, variants: unknown): null | string {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null
  }

  const bucket = getVariantBucket(flagName, userId)
  let cumulative = 0
  for (const variant of variants as Array<{ name?: unknown; weight?: unknown }>) {
    cumulative += typeof variant?.weight === 'number' ? variant.weight : 0
    if (bucket < cumulative) {
      return typeof variant.name === 'string' ? variant.name : null
    }
  }

  const first = (variants[0] as { name?: unknown } | undefined)?.name
  return typeof first === 'string' ? first : null
}
