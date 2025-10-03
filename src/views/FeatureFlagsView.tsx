import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import FeatureFlagsClient from './FeatureFlagsClient.js'

interface FeatureFlag {
  id: string
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage?: number
  variants?: Array<{
    name: string
    weight: number
    metadata?: any
  }>
  environment?: 'development' | 'staging' | 'production'
  tags?: Array<{ tag: string }>
  metadata?: any
  createdAt: string
  updatedAt: string
}

async function fetchInitialFlags(payload: any, searchParams?: Record<string, any>): Promise<FeatureFlag[]> {
  try {
    const limit = Math.min(1000, parseInt(searchParams?.limit as string) || 100)
    const page = Math.max(1, parseInt(searchParams?.page as string) || 1)

    const result = await payload.find({
      collection: 'feature-flags',
      limit,
      page,
      sort: 'name',
    })

    return (result.docs || []).filter((flag: any) => flag && flag.id && flag.name)
  } catch (error) {
    console.error('Error fetching initial feature flags:', error)
    return []
  }
}

export default async function FeatureFlagsView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const {
    req: { user },
    permissions,
  } = initPageResult

  // Security check: User must be logged in
  if (!user) {
    return (
      <DefaultTemplate
        i18n={initPageResult.req.i18n}
        locale={initPageResult.locale}
        params={params}
        payload={initPageResult.req.payload}
        permissions={initPageResult.permissions}
        searchParams={searchParams}
        user={undefined}
        visibleEntities={initPageResult.visibleEntities}
      >
        <Gutter>
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--theme-error-500)',
            backgroundColor: 'var(--theme-error-50)',
            border: '1px solid var(--theme-error-200)',
            borderRadius: '0.5rem',
            margin: '2rem 0'
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--theme-error-600)' }}>
              Authentication Required
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              You must be logged in to view the Feature Flags Dashboard.
            </p>
            <a
              href="/admin/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--theme-error-500)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.375rem',
                fontWeight: '500'
              }}
            >
              Go to Login
            </a>
          </div>
        </Gutter>
      </DefaultTemplate>
    )
  }

  // Security check: User must have permissions to access feature-flags collection
  const canReadFeatureFlags = permissions?.collections?.['feature-flags']?.read
  if (!canReadFeatureFlags) {
    return (
      <DefaultTemplate
        i18n={initPageResult.req.i18n}
        locale={initPageResult.locale}
        params={params}
        payload={initPageResult.req.payload}
        permissions={initPageResult.permissions}
        searchParams={searchParams}
        user={initPageResult.req.user || undefined}
        visibleEntities={initPageResult.visibleEntities}
      >
        <Gutter>
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--theme-warning-600)',
            backgroundColor: 'var(--theme-warning-50)',
            border: '1px solid var(--theme-warning-200)',
            borderRadius: '0.5rem',
            margin: '2rem 0'
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--theme-warning-700)' }}>
              Access Denied
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              You don't have permission to access the Feature Flags Dashboard.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--theme-warning-600)' }}>
              Contact your administrator to request access to the feature-flags collection.
            </p>
          </div>
        </Gutter>
      </DefaultTemplate>
    )
  }

  // Fetch initial data server-side (only if user has access)
  const initialFlags = await fetchInitialFlags(initPageResult.req.payload, searchParams)

  // Check if user can update feature flags
  const canUpdateFeatureFlags = permissions?.collections?.['feature-flags']?.update || false

  // Use DefaultTemplate with proper props structure from initPageResult
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <FeatureFlagsClient
          initialFlags={initialFlags}
          canUpdate={canUpdateFeatureFlags}
        />
      </Gutter>
    </DefaultTemplate>
  )
}