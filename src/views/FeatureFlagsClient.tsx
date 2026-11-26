'use client'
import type { ListViewClientProps } from 'payload'

import {
  useConfig,
  useTheme
} from '@payloadcms/ui'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'

import type { FeatureFlag, PayloadID } from '../types/index.js'

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface FeatureFlagsClientProps {
  canUpdate?: boolean
  collectionSlug?: string // Configurable collection slug for URLs
  initialFlags?: FeatureFlag[]
  maxFlags?: number // Configurable limit for API requests
}

type SortField = 'enabled' | 'name' | 'rolloutPercentage' | 'updatedAt'

/** Column header arrow: faded when the table is sorted by another column. */
const SortIcon = ({ direction, field, sortField }: { direction: 'asc' | 'desc'; field: SortField; sortField: SortField }) => {
  if (sortField !== field) {
    return <span style={{ opacity: 0.3 }}>⇅</span>
  }
  return <span>{direction === 'asc' ? '↑' : '↓'}</span>
}

const FeatureFlagsClientComponent = ({
  canUpdate = true,
  collectionSlug = 'feature-flags',
  initialFlags = [],
  maxFlags = 100
}: FeatureFlagsClientProps) => {
  const { config } = useConfig()
  const { theme } = useTheme()
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [saving, setSaving] = useState<null | PayloadID>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Debounce search to reduce re-renders
  const debouncedSearch = useDebounce(search, 300)

  const fetchFlags = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError('')

      // Use configurable limit, capped at 1000 for performance
      const limit = Math.min(1000, maxFlags)
      const response = await fetch(`${config.serverURL}${config.routes.api}/${collectionSlug}?limit=${limit}`, {
        credentials: 'include',
        signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
      }

      const result = await response.json()

      // Extract docs array from Payload API response and filter out null/invalid entries
      const flagsArray = (result.docs || []).filter((flag: any) => flag && flag.id && flag.name)

      // Only update state if the component is still mounted (signal not aborted)
      if (!signal?.aborted) {
        setFlags(flagsArray as FeatureFlag[])
      }
    } catch (err) {
      // Don't show error if request was aborted (component unmounting)
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Error fetching feature flags:', err)
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch feature flags')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [config.serverURL, config.routes.api, collectionSlug, maxFlags])

  useEffect(() => {
    const abortController = new AbortController()

    const loadFlags = async () => {
      await fetchFlags(abortController.signal)
    }

    void loadFlags()

    return () => {
      abortController.abort()
    }
  }, [fetchFlags]) // Re-fetch if fetchFlags function changes

  const updateFlag = useCallback(async (flagId: PayloadID, updates: Partial<FeatureFlag>) => {
    // Security check: Don't allow updates if user doesn't have permission
    if (!canUpdate) {
      setError('You do not have permission to update feature flags')
      setTimeout(() => setError(''), 5000)
      return
    }

    setSaving(flagId)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/${collectionSlug}/${flagId}`, {
        body: JSON.stringify(updates),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied: You do not have permission to update this feature flag')
        }
        if (response.status === 401) {
          throw new Error('Authentication required: Please log in again')
        }
        throw new Error(`Failed to update feature flag: ${response.statusText}`)
      }

      const updatedFlag = await response.json()

      // Update local state - merge only the specific updates we sent
      setFlags(prev => prev.map(flag =>
        flag.id === flagId ? { ...flag, ...updates, updatedAt: updatedFlag.updatedAt || new Date().toISOString() } : flag
      ))

      setSuccessMessage('✓ Saved')
      setTimeout(() => setSuccessMessage(''), 2000)
    } catch (err) {
      console.error('Error updating feature flag:', err)
      setError(err instanceof Error ? err.message : 'Failed to update feature flag')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(null)
    }
  }, [config.serverURL, config.routes.api, canUpdate, collectionSlug])

  const handleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  const filteredAndSortedFlags = useMemo(() => {
    // Filter out null/undefined entries first
    let filtered = flags.filter(flag => flag && flag.name)

    // Filter by debounced search
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(flag =>
        flag.name?.toLowerCase().includes(searchLower) ||
        flag.description?.toLowerCase().includes(searchLower) ||
        flag.tags?.some(t => t.tag?.toLowerCase().includes(searchLower))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'updatedAt') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      }

      if (aVal < bVal) {return sortDirection === 'asc' ? -1 : 1}
      if (aVal > bVal) {return sortDirection === 'asc' ? 1 : -1}
      return 0
    })

    return filtered
  }, [flags, debouncedSearch, sortField, sortDirection])


  // Theme-aware styles
  const getThemeStyles = () => ({
    background: 'var(--theme-bg)',
    border: 'var(--theme-elevation-150)',
    error: 'var(--theme-error-500)',
    headerBg: 'var(--theme-elevation-100)',
    info: 'var(--theme-info-500)',
    inputBg: 'var(--theme-elevation-0)',
    inputBorder: 'var(--theme-elevation-250)',
    primary: 'var(--theme-success-500)',
    surface: 'var(--theme-elevation-50)',
    surfaceHover: 'var(--theme-elevation-100)',
    text: 'var(--theme-text)',
    textMuted: 'var(--theme-text-400)',
    textSubdued: 'var(--theme-text-600)',
    warning: 'var(--theme-warning-500)',
  })

  const styles = getThemeStyles()

  return (
    <div style={{
      maxWidth: '100%',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          color: styles.text,
          fontSize: '2rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0'
        }}>
          Feature Flags
        </h1>
        <p style={{
          color: styles.textMuted,
          fontSize: '1rem',
          margin: '0 0 1rem 0'
        }}>
          Manage all feature flags in a spreadsheet view with inline editing capabilities
        </p>
        {!canUpdate && (
          <div
            role="alert"
            style={{
              backgroundColor: styles.info + '20',
              border: `1px solid ${styles.info}`,
              borderRadius: '0.5rem',
              color: styles.info,
              fontSize: '0.875rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem'
            }}
          >
            <strong>Read-Only Access:</strong> You can view feature flags but cannot edit them. Contact your administrator to request update permissions.
          </div>
        )}
      </div>

      {loading ? (
        <div style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ color: styles.textMuted, fontSize: '1.125rem' }}>Loading feature flags...</div>
        </div>
      ) : (
        <>
          {/* Success/Error Messages */}
          {successMessage && (
            <div style={{
              backgroundColor: styles.primary,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              position: 'fixed',
              right: '20px',
              top: '20px',
              zIndex: 1000,
            }}>
              {successMessage}
            </div>
          )}

          {error && (
            <div
              role="alert"
              style={{
                backgroundColor: styles.error + '20',
                border: `1px solid ${styles.error}`,
                borderRadius: '0.5rem',
                color: styles.error,
                marginBottom: '1rem',
                padding: '1rem'
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

      {/* Controls */}
      <div style={{
        alignItems: 'center',
        display: 'flex',
        gap: '1rem',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <input
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flags by name, description, or tags..."
          style={{
            backgroundColor: styles.inputBg,
            border: `1px solid ${styles.inputBorder}`,
            borderRadius: '0.5rem',
            color: styles.text,
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            width: '300px'
          }}
          type="text"
          value={search}
        />

        <div style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
          <div style={{ color: styles.textMuted, fontSize: '0.875rem' }}>
            {filteredAndSortedFlags.length} of {flags.filter(f => f && f.name).length} flags
          </div>
          <button
            onClick={() => fetchFlags()}
            style={{
              backgroundColor: styles.surface,
              border: `1px solid ${styles.inputBorder}`,
              borderRadius: '0.5rem',
              color: styles.text,
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0.5rem 1rem'
            }}
          >
            <span aria-hidden="true">🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div style={{
        backgroundColor: styles.surface,
        border: `1px solid ${styles.border}`,
        borderRadius: '0.75rem',
        marginBottom: '2rem',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            width: '100%'
          }}>
            <thead>
              <tr style={{ backgroundColor: styles.headerBg }}>
                <th style={{
                  backgroundColor: styles.headerBg,
                  borderBottom: `1px solid ${styles.border}`,
                  color: styles.text,
                  fontWeight: '600',
                  left: 0,
                  minWidth: '50px',
                  padding: '0.75rem 1rem',
                  position: 'sticky',
                  textAlign: 'left'
                }}>
                  Status
                </th>
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    borderBottom: `1px solid ${styles.border}`,
                    color: styles.text,
                    cursor: 'pointer',
                    fontWeight: '600',
                    minWidth: '200px',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    userSelect: 'none'
                  }}
                >
                  Name <SortIcon direction={sortDirection} field="name" sortField={sortField} />
                </th>
                <th style={{
                  borderBottom: `1px solid ${styles.border}`,
                  color: styles.text,
                  fontWeight: '600',
                  minWidth: '300px',
                  padding: '0.75rem 1rem',
                  textAlign: 'left'
                }}>
                  Description
                </th>
                <th
                  onClick={() => handleSort('enabled')}
                  style={{
                    borderBottom: `1px solid ${styles.border}`,
                    color: styles.text,
                    cursor: 'pointer',
                    fontWeight: '600',
                    minWidth: '80px',
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    userSelect: 'none'
                  }}
                >
                  Enabled <SortIcon direction={sortDirection} field="enabled" sortField={sortField} />
                </th>
                <th
                  onClick={() => handleSort('rolloutPercentage')}
                  style={{
                    borderBottom: `1px solid ${styles.border}`,
                    color: styles.text,
                    cursor: 'pointer',
                    fontWeight: '600',
                    minWidth: '120px',
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    userSelect: 'none'
                  }}
                >
                  Rollout % <SortIcon direction={sortDirection} field="rolloutPercentage" sortField={sortField} />
                </th>
                <th style={{
                  borderBottom: `1px solid ${styles.border}`,
                  color: styles.text,
                  fontWeight: '600',
                  minWidth: '100px',
                  padding: '0.75rem 1rem',
                  textAlign: 'center'
                }}>
                  Variants
                </th>
                <th style={{
                  borderBottom: `1px solid ${styles.border}`,
                  color: styles.text,
                  fontWeight: '600',
                  minWidth: '150px',
                  padding: '0.75rem 1rem',
                  textAlign: 'left'
                }}>
                  Tags
                </th>
                <th
                  onClick={() => handleSort('updatedAt')}
                  style={{
                    borderBottom: `1px solid ${styles.border}`,
                    color: styles.text,
                    cursor: 'pointer',
                    fontWeight: '600',
                    minWidth: '150px',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    userSelect: 'none'
                  }}
                >
                  Last Updated <SortIcon direction={sortDirection} field="updatedAt" sortField={sortField} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFlags.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    color: styles.textMuted,
                    padding: '2rem',
                    textAlign: 'center'
                  }}>
                    {debouncedSearch ? 'No flags match your search' : 'No feature flags yet'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedFlags.map(flag => (
                  <tr key={flag.id} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  style={{
                    borderBottom: `1px solid ${styles.border}`,
                    transition: 'background-color 0.15s',
                  }}
                  >
                    <td style={{
                      backgroundColor: 'inherit',
                      left: 0,
                      padding: '0.75rem 1rem',
                      position: 'sticky'
                    }}>
                      <div style={{
                        backgroundColor: flag.enabled ?
                          (flag.rolloutPercentage && flag.rolloutPercentage < 100 ? styles.warning : styles.primary)
                          : styles.error,
                        borderRadius: '50%',
                        height: '8px',
                        width: '8px'
                      }} />
                    </td>
                    <td style={{
                      color: styles.text,
                      fontWeight: '500',
                      padding: '0.75rem 1rem'
                    }}>
                      <a
                        href={`${config.routes.admin}/collections/${collectionSlug}/${flag.id}`}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        style={{
                          color: styles.info,
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                      >
                        {flag.name}
                      </a>
                    </td>
                    <td style={{
                      color: styles.textMuted,
                      padding: '0.75rem 1rem'
                    }}>
                      {flag.description || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center'
                    }}>
                      <input
                        checked={flag.enabled}
                        disabled={!canUpdate || saving === flag.id}
                        onChange={(e) => updateFlag(flag.id, { enabled: e.target.checked })}
                        style={{
                          accentColor: styles.primary,
                          cursor: (!canUpdate || saving === flag.id) ? 'not-allowed' : 'pointer',
                          height: '18px',
                          opacity: canUpdate ? 1 : 0.6,
                          width: '18px'
                        }}
                        type="checkbox"
                      />
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ alignItems: 'center', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <input
                          disabled={!canUpdate || saving === flag.id}
                          max="100"
                          min="0"
                          onChange={(e) => {
                            const value = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                            void updateFlag(flag.id, { rolloutPercentage: Math.round(value) })
                          }}
                          style={{
                            backgroundColor: styles.inputBg,
                            border: `1px solid ${styles.inputBorder}`,
                            borderRadius: '0.25rem',
                            color: styles.text,
                            cursor: (!canUpdate || saving === flag.id) ? 'not-allowed' : 'text',
                            fontSize: '0.875rem',
                            opacity: canUpdate ? 1 : 0.5,
                            padding: '0.25rem 0.5rem',
                            textAlign: 'center',
                            width: '60px'
                          }}
                          type="number"
                          value={flag.rolloutPercentage || 100}
                        />
                        <span style={{ color: styles.textMuted }}>%</span>
                      </div>
                    </td>
                    <td style={{
                      color: styles.textMuted,
                      padding: '0.75rem 1rem',
                      textAlign: 'center'
                    }}>
                      {flag.variants && flag.variants.length > 0 ? (
                        <span style={{
                          backgroundColor: styles.surface,
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem'
                        }}>
                          {flag.variants.length} variants
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem'
                    }}>
                      {flag.tags && flag.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {flag.tags.map((t, i) => (
                            <span key={i} style={{
                              backgroundColor: styles.info + '20',
                              borderRadius: '0.25rem',
                              color: styles.info,
                              fontSize: '0.75rem',
                              padding: '0.125rem 0.5rem'
                            }}>
                              {t.tag}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{
                      color: styles.textMuted,
                      fontSize: '0.75rem',
                      padding: '0.75rem 1rem'
                    }}>
                      {new Date(flag.updatedAt).toLocaleDateString()} {new Date(flag.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        color: styles.textMuted,
        display: 'flex',
        fontSize: '0.875rem',
        gap: '2rem',
        marginTop: '2rem'
      }}>
        <div>
          <span style={{ fontWeight: '600' }}>Total:</span> {flags.filter(f => f && f.name).length} flags
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Enabled:</span> {flags.filter(f => f && f.enabled).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Disabled:</span> {flags.filter(f => f && !f.enabled).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Rolling out:</span> {flags.filter(f => f && f.enabled && f.rolloutPercentage && f.rolloutPercentage < 100).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>A/B Tests:</span> {flags.filter(f => f && f.variants && f.variants.length > 0).length}
        </div>
      </div>
        </>
      )}
    </div>
  )
}

export const FeatureFlagsClient = memo(FeatureFlagsClientComponent)
export default FeatureFlagsClient
