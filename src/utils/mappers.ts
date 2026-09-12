export interface FeatureFlag {
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage?: number
  variants?: Array<{
    name: string
    weight: number
    metadata?: any
  }>
  tags?: Array<{ tag: string }>
  metadata?: any
}

// Payload returns omitted optional fields as null; FeatureFlag advertises them as optional (`?:`).
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
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
      weight: variant.weight as number,
      metadata: nullToUndefined(variant.metadata),
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
    description: nullToUndefined(doc.description as string | null | undefined),
    enabled: doc.enabled as boolean,
    rolloutPercentage: nullToUndefined(doc.rolloutPercentage as number | null | undefined),
    variants: mapVariants(doc.variants),
    tags: mapTags(doc.tags),
    metadata: nullToUndefined(doc.metadata),
  }
}
