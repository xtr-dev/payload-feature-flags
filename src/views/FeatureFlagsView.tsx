'use client'
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useConfig } from '@payloadcms/ui'

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

const FeatureFlagsViewComponent = () => {
  const { config } = useConfig()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'name' | 'enabled' | 'rolloutPercentage' | 'updatedAt'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [saving, setSaving] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const abortController = new AbortController()

    const loadFlags = async () => {
      await fetchFlags(abortController.signal)
    }

    loadFlags()

    return () => {
      abortController.abort()
    }
  }, [config.serverURL])

  const fetchFlags = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${config.serverURL}${config.routes.api}/feature-flags?limit=1000`, {
        credentials: 'include',
        signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch feature flags: ${response.statusText}`)
      }

      const result = await response.json()

      // Extract docs array from Payload API response
      const flagsArray = result.docs || []

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
  }

  const updateFlag = useCallback(async (flagId: string, updates: Partial<FeatureFlag>) => {
    setSaving(flagId)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${config.serverURL}${config.routes.api}/feature-flags/${flagId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update feature flag: ${response.statusText}`)
      }

      const updatedFlag = await response.json()

      // Update local state
      setFlags(prev => prev.map(flag =>
        flag.id === flagId ? { ...flag, ...updatedFlag } : flag
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
  }, [config.serverURL, config.routes.api])

  const handleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField])

  const filteredAndSortedFlags = useMemo(() => {
    let filtered = flags

    // Filter by search
    if (search) {
      filtered = flags.filter(flag =>
        flag.name.toLowerCase().includes(search.toLowerCase()) ||
        flag.description?.toLowerCase().includes(search.toLowerCase()) ||
        flag.tags?.some(t => t.tag.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'updatedAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [flags, search, sortField, sortDirection])

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3 }}>⇅</span>
    }
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading feature flags...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '0.5rem'
        }}>
          Feature Flags Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Manage all feature flags in a spreadsheet view
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <input
          type="text"
          placeholder="Search flags by name, description, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            width: '300px'
          }}
        />

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {filteredAndSortedFlags.length} of {flags.length} flags
          </div>
          <button
            onClick={() => fetchFlags()}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: '#f9fafb',
                  minWidth: '50px'
                }}>
                  Status
                </th>
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    minWidth: '200px',
                    userSelect: 'none'
                  }}
                >
                  Name <SortIcon field="name" />
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: '300px'
                }}>
                  Description
                </th>
                <th
                  onClick={() => handleSort('enabled')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    minWidth: '80px',
                    userSelect: 'none'
                  }}
                >
                  Enabled <SortIcon field="enabled" />
                </th>
                <th
                  onClick={() => handleSort('rolloutPercentage')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    minWidth: '120px',
                    userSelect: 'none'
                  }}
                >
                  Rollout % <SortIcon field="rolloutPercentage" />
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: '100px'
                }}>
                  Variants
                </th>
                <th style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  borderBottom: '1px solid #e5e7eb',
                  minWidth: '150px'
                }}>
                  Tags
                </th>
                <th
                  onClick={() => handleSort('updatedAt')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    minWidth: '150px',
                    userSelect: 'none'
                  }}
                >
                  Last Updated <SortIcon field="updatedAt" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFlags.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    {search ? 'No flags match your search' : 'No feature flags yet'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedFlags.map(flag => (
                  <tr key={flag.id} style={{
                    borderBottom: '1px solid #e5e7eb',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{
                      padding: '0.75rem 1rem',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'inherit'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: flag.enabled ?
                          (flag.rolloutPercentage && flag.rolloutPercentage < 100 ? '#f59e0b' : '#10b981')
                          : '#ef4444'
                      }} />
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontWeight: '500',
                      color: '#111827'
                    }}>
                      {flag.name}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      color: '#6b7280'
                    }}>
                      {flag.description || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center'
                    }}>
                      <input
                        type="checkbox"
                        checked={flag.enabled}
                        onChange={(e) => updateFlag(flag.id, { enabled: e.target.checked })}
                        disabled={saving === flag.id}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: saving === flag.id ? 'wait' : 'pointer',
                          accentColor: '#10b981'
                        }}
                      />
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          value={flag.rolloutPercentage || 100}
                          onChange={(e) => {
                            const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            updateFlag(flag.id, { rolloutPercentage: value })
                          }}
                          disabled={!flag.enabled || saving === flag.id}
                          min="0"
                          max="100"
                          style={{
                            width: '60px',
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            cursor: saving === flag.id ? 'wait' : 'text',
                            opacity: flag.enabled ? 1 : 0.5
                          }}
                        />
                        <span style={{ color: '#6b7280' }}>%</span>
                      </div>
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      {flag.variants && flag.variants.length > 0 ? (
                        <span style={{
                          backgroundColor: '#f3f4f6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem'
                        }}>
                          {flag.variants.length} variants
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem'
                    }}>
                      {flag.tags && flag.tags.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {flag.tags.map((t, i) => (
                            <span key={i} style={{
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem'
                            }}>
                              {t.tag}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      color: '#6b7280',
                      fontSize: '0.75rem'
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
        marginTop: '2rem',
        display: 'flex',
        gap: '2rem',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        <div>
          <span style={{ fontWeight: '600' }}>Total:</span> {flags.length} flags
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Enabled:</span> {flags.filter(f => f.enabled).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Disabled:</span> {flags.filter(f => !f.enabled).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>Rolling out:</span> {flags.filter(f => f.enabled && f.rolloutPercentage && f.rolloutPercentage < 100).length}
        </div>
        <div>
          <span style={{ fontWeight: '600' }}>A/B Tests:</span> {flags.filter(f => f.variants && f.variants.length > 0).length}
        </div>
      </div>
    </div>
  )
}

export const FeatureFlagsView = memo(FeatureFlagsViewComponent)