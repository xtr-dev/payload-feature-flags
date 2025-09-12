import type { PayloadHandler } from 'payload'

export const customEndpointHandler = (collectionSlug: string): PayloadHandler => 
  async (req) => {
    const { payload } = req
    const url = new URL(req.url || '')
    const pathParts = url.pathname.split('/').filter(Boolean)
    const flagName = pathParts[pathParts.length - 1]
    
    // Check if we're fetching a specific flag
    if (flagName && flagName !== 'feature-flags') {
      try {
        const result = await payload.find({
          collection: collectionSlug,
          where: {
            name: {
              equals: flagName,
            },
          },
          limit: 1,
        })

        if (result.docs.length === 0) {
          return Response.json(
            { error: 'Feature flag not found' },
            { status: 404 }
          )
        }

        const flag = result.docs[0]
        
        // Return simplified flag data
        return Response.json({
          name: flag.name,
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
          variants: flag.variants,
          metadata: flag.metadata,
        })
      } catch (error) {
        return Response.json(
          { error: 'Failed to fetch feature flag' },
          { status: 500 }
        )
      }
    }

    // Fetch all feature flags
    try {
      const result = await payload.find({
        collection: collectionSlug,
        limit: 1000, // Adjust as needed
        where: {
          enabled: {
            equals: true,
          },
        },
      })

      // Return simplified flag data
      const flags = result.docs.reduce((acc: any, flag: any) => {
        acc[flag.name] = {
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
          variants: flag.variants,
          metadata: flag.metadata,
        }
        return acc
      }, {})

      return Response.json(flags)
    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch feature flags' },
        { status: 500 }
      )
    }
  }