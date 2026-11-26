export interface FeatureFlag {
  description?: string
  enabled: boolean
  metadata?: any
  name: string
  rolloutPercentage?: number
  tags?: Array<{ tag: string }>
  variants?: Array<{
    metadata?: any
    name: string
    weight: number
  }>
}

// Payload returns omitted optional fields as null; FeatureFlag advertises them as optional (`?:`).
export function nullToUndefined<T>(value: null | T | undefined): T | undefined {
  return value ?? undefined
}

export function mapVariants(value: unknown): FeatureFlag['variants'] {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.map((entry) => {
    const variant = (entry ?? {}) as Record<string, unknown>
    return {
      name: variant.name as string,
      metadata: nullToUndefined(variant.metadata),
      weight: variant.weight as number,
    }
  })
}

export function mapTags(value: unknown): FeatureFlag['tags'] {
  if (!Array.isArray(value)) {
    return undefined
  }

  const tags: Array<{ tag: string }> = []
  for (const entry of value) {
    const tag = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).tag : undefined
    if (typeof tag === 'string') {
      tags.push({ tag })
    }
  }
  return tags
}

export function toFeatureFlag(doc: Record<string, unknown>): FeatureFlag {
  return {
    name: doc.name as string,
    description: nullToUndefined(doc.description as null | string | undefined),
    enabled: doc.enabled as boolean,
    metadata: nullToUndefined(doc.metadata),
    rolloutPercentage: nullToUndefined(doc.rolloutPercentage as null | number | undefined),
    tags: mapTags(doc.tags),
    variants: mapVariants(doc.variants),
  }
}
