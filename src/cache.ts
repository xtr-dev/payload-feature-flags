/**
 * Cross-request cache for the RSC feature flag helpers.
 *
 * The helpers in `hooks/server.ts` are wrapped in React `cache()`, which only
 * dedupes calls within one request. A `FeatureFlagsCache` keeps the results
 * between requests; the plugin clears it from the flags collection's
 * `afterChange` and `afterDelete` hooks, so a changed flag is picked up on the
 * next request.
 */
export interface FeatureFlagsCache {
  /**
   * Return the cached result for `key`, or run `load`, store and return its
   * result. `load` may throw; a thrown error must not be cached.
   */
  wrap<T>(key: string[], load: () => Promise<T>): Promise<T>
  /** Drop everything this cache holds. Called after a flag is changed or deleted. */
  invalidate(): Promise<void> | void
}

export type NextCacheOptions = {
  /**
   * Cache tag for every flag lookup; `revalidateTag(tag)` clears them.
   * @default 'payload-feature-flags'
   */
  tag?: string
  /**
   * Seconds before a cached lookup is refreshed even without a change, or
   * `false` to keep it until the tag is revalidated. The finite default is a
   * safety net for changes the plugin cannot clear right away, such as a
   * write from another server instance or a direct database edit.
   * @default 60
   */
  revalidate?: number | false
}

export const DEFAULT_CACHE_TAG = 'payload-feature-flags'

/** Default `revalidate` for `createNextCache`, in seconds. */
export const DEFAULT_CACHE_REVALIDATE = 60

/**
 * The incremental cache a Next.js server registers on `globalThis`. It is what
 * `unstable_cache` falls back to outside a request, so clearing a tag on it
 * also works outside a request (Payload jobs, `onInit`, local API scripts run
 * inside the Next.js process).
 */
type GlobalIncrementalCache = {
  revalidateTag?: (tags: string | string[]) => Promise<void> | void
}

type NextCacheModule = typeof import('next/cache.js')

// Imported lazily so the plugin keeps working where Next.js is not installed
// (for example in a standalone Payload script); lookups then go uncached. The
// .js suffix matches how @payloadcms/next imports next/* modules: next has no
// exports map, so NodeNext resolution needs the file name.
let nextCacheModule: Promise<NextCacheModule | null> | undefined
function loadNextCache(): Promise<NextCacheModule | null> {
  if (!nextCacheModule) {
    nextCacheModule = import('next/cache.js').catch(() => null)
  }
  return nextCacheModule
}

/**
 * A `FeatureFlagsCache` backed by Next.js `unstable_cache`, tagged so the
 * plugin can clear it with `revalidateTag`. Outside a Next.js server (no
 * incremental cache available) lookups fall back to reading the database.
 */
export function createNextCache(options: NextCacheOptions = {}): FeatureFlagsCache {
  const tag = options.tag ?? DEFAULT_CACHE_TAG
  const revalidate = options.revalidate ?? DEFAULT_CACHE_REVALIDATE

  return {
    async wrap<T>(key: string[], load: () => Promise<T>): Promise<T> {
      const next = await loadNextCache()
      if (!next) {
        return load()
      }

      // Remember an error thrown by `load` itself, so it is rethrown as is and
      // not mistaken for `unstable_cache` failing outside a Next.js server.
      let loadFailure: { error: unknown } | undefined
      const guardedLoad = async () => {
        try {
          return await load()
        } catch (error) {
          loadFailure = { error }
          throw error
        }
      }

      try {
        return await next.unstable_cache(guardedLoad, [tag, ...key], { tags: [tag], revalidate })()
      } catch (error) {
        if (loadFailure) {
          throw loadFailure.error
        }
        return load()
      }
    },
    async invalidate() {
      const next = await loadNextCache()
      if (!next) {
        return
      }
      try {
        next.revalidateTag(tag)
        return
      } catch (error) {
        // revalidateTag throws without a request context ("static generation
        // store missing"), for example when a flag changes from a Payload job,
        // onInit or a script. Clear the tag on the global incremental cache
        // instead, which is the same cache unstable_cache uses there.
        const incrementalCache = (globalThis as { __incrementalCache?: GlobalIncrementalCache })
          .__incrementalCache
        if (typeof incrementalCache?.revalidateTag === 'function') {
          await incrementalCache.revalidateTag(tag)
          return
        }
        console.warn(
          `[payload-feature-flags] Could not clear the feature flags cache (tag "${tag}"); ` +
            `cached flags refresh after the revalidate interval instead.`,
          error,
        )
      }
    },
  }
}

/** Resolves the plugin's `cache` option to a cache, or `undefined` for none. */
export function resolveCacheOption(
  option: boolean | NextCacheOptions | FeatureFlagsCache | undefined,
): FeatureFlagsCache | undefined {
  if (!option) {
    return undefined
  }
  if (option === true) {
    return createNextCache()
  }
  if (typeof (option as FeatureFlagsCache).wrap === 'function') {
    return option as FeatureFlagsCache
  }
  return createNextCache(option as NextCacheOptions)
}
