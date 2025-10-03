import React from 'react'
import type { ListViewServerProps } from 'payload'
import FeatureFlagsClient from './FeatureFlagsClient.js'
import type { FeatureFlag } from '../types/index.js'

async function fetchInitialFlags(payload: any, collectionSlug: string): Promise<FeatureFlag[]> {
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

export default async function FeatureFlagsView(props: ListViewServerProps) {
  const { collectionConfig, user, permissions, payload } = props

  // Security check: User must be logged in
  if (!user) {
    return (
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
    )
  }

  // Security check: User must have permissions to access the collection
  const canReadFeatureFlags = permissions?.collections?.[collectionConfig.slug]?.read
  if (!canReadFeatureFlags) {
    return (
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
          Contact your administrator to request access to the {collectionConfig.slug} collection.
        </p>
      </div>
    )
  }

  // Fetch initial data server-side (only if user has access)
  const initialFlags = await fetchInitialFlags(payload, collectionConfig.slug)

  // Check if user can update feature flags
  const canUpdateFeatureFlags = permissions?.collections?.[collectionConfig.slug]?.update || false

  return (
    <FeatureFlagsClient
      initialFlags={initialFlags}
      canUpdate={canUpdateFeatureFlags}
      maxFlags={100}
      collectionSlug={collectionConfig.slug}
    />
  )
}