import type { SanitizedPermissions } from 'payload'

import React from 'react'

import type { FeatureFlagDocument } from '../types/index.js'

import FeatureFlagsClient from './FeatureFlagsClient.js'

async function fetchInitialFlags(payload: any, collectionSlug: string): Promise<FeatureFlagDocument[]> {
  try {
    const result = await payload.find({
      collection: collectionSlug,
      limit: 1000,
      sort: 'name',
    })

    return (result.docs || []).filter((flag: any) => flag && flag.id && flag.name)
  } catch (error) {
    console.error('Error fetching initial feature flags:', error)
    return []
  }
}

export type RenderFeatureFlagsOverviewArgs = {
  collectionSlug: string
  payload: any
  permissions: SanitizedPermissions | undefined
  user: unknown
}

// Shared by the collection list view and the root admin view: the two entry
// points receive user/permissions/payload through completely different prop
// shapes (see FeatureFlagsView.tsx and FeatureFlagsOverviewView.tsx), but once
// those values are pulled out the access checks and markup are identical.
export async function renderFeatureFlagsOverview({
  collectionSlug,
  payload,
  permissions,
  user,
}: RenderFeatureFlagsOverviewArgs) {
  // Security check: User must be logged in
  if (!user) {
    return (
      <div style={{
        backgroundColor: 'var(--theme-error-50)',
        border: '1px solid var(--theme-error-200)',
        borderRadius: '0.5rem',
        color: 'var(--theme-error-500)',
        margin: '2rem 0',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: 'var(--theme-error-600)', marginBottom: '1rem' }}>
          Authentication Required
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          You must be logged in to view the Feature Flags Dashboard.
        </p>
        <a
          href="/admin/login"
          style={{
            backgroundColor: 'var(--theme-error-500)',
            borderRadius: '0.375rem',
            color: 'white',
            display: 'inline-block',
            fontWeight: '500',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none'
          }}
        >
          Go to Login
        </a>
      </div>
    )
  }

  // Security check: User must have permissions to access the collection
  const canReadFeatureFlags = permissions?.collections?.[collectionSlug]?.read
  if (!canReadFeatureFlags) {
    return (
      <div style={{
        backgroundColor: 'var(--theme-warning-50)',
        border: '1px solid var(--theme-warning-200)',
        borderRadius: '0.5rem',
        color: 'var(--theme-warning-600)',
        margin: '2rem 0',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: 'var(--theme-warning-700)', marginBottom: '1rem' }}>
          Access Denied
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          You don't have permission to access the Feature Flags Dashboard.
        </p>
        <p style={{ color: 'var(--theme-warning-600)', fontSize: '0.875rem' }}>
          Contact your administrator to request access to the {collectionSlug} collection.
        </p>
      </div>
    )
  }

  // Fetch initial data server-side (only if user has access)
  const initialFlags = await fetchInitialFlags(payload, collectionSlug)

  // Check if user can update feature flags
  const canUpdateFeatureFlags = permissions?.collections?.[collectionSlug]?.update || false

  return (
    <FeatureFlagsClient
      canUpdate={canUpdateFeatureFlags}
      collectionSlug={collectionSlug}
      initialFlags={initialFlags}
      maxFlags={100}
    />
  )
}
