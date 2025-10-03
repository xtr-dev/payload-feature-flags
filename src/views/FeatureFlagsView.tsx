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
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [search, setSearch] = useState('')

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
      
      const response = await fetch(`${config.serverURL}${config.routes.api}/feature-flags`, {
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

  const toggleFlag = useCallback(async (flagId: string, enabled: boolean) => {
    // For now, just show a message that editing isn't available in the custom view
    setError('Toggle functionality coming soon. Please use the standard collection view to edit flags.')
    setTimeout(() => setError(''), 3000)
  }, [])

  const filteredFlags = useMemo(() => {
    return flags.filter(flag => {
      const matchesFilter = filter === 'all' || 
        (filter === 'enabled' && flag.enabled) || 
        (filter === 'disabled' && !flag.enabled)
      
      const matchesSearch = !search || 
        flag.name.toLowerCase().includes(search.toLowerCase()) ||
        flag.description?.toLowerCase().includes(search.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [flags, filter, search])

  const getStatusColor = (flag: FeatureFlag) => {
    if (!flag.enabled) return '#ef4444'
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) return '#f59e0b'
    return '#10b981'
  }

  const getStatusText = (flag: FeatureFlag) => {
    if (!flag.enabled) return 'Disabled'
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) return `${flag.rolloutPercentage}% Rollout`
    return 'Enabled'
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading feature flags...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          padding: '1rem',
          color: '#dc2626'
        }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: '#111827', 
          marginBottom: '0.5rem' 
        }}>
          🚩 Feature Flags
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
          Manage feature toggles, A/B tests, and gradual rollouts
        </p>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            minWidth: '200px'
          }}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'enabled', 'disabled'] as const).map(filterType => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                backgroundColor: filter === filterType ? '#3b82f6' : 'white',
                color: filter === filterType ? 'white' : '#374151',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {filterType}
            </button>
          ))}
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

      {/* Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
            {flags.length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Flags</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
            {flags.filter(f => f.enabled).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Enabled</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
            {flags.filter(f => f.enabled && f.rolloutPercentage && f.rolloutPercentage < 100).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Rolling Out</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#8b5cf6' }}>
            {flags.filter(f => f.variants && f.variants.length > 0).length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>A/B Tests</div>
        </div>
      </div>

      {/* Feature Flags List */}
      {filteredFlags.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {search || filter !== 'all' ? 'No flags match your criteria' : 'No feature flags yet'}
          </div>
          {(!search && filter === 'all') && (
            <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Create your first feature flag to get started
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredFlags.map(flag => (
            <div key={flag.id} style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              {/* Flag Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: '600', 
                    color: '#111827',
                    margin: 0
                  }}>
                    {flag.name}
                  </h3>
                  
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: getStatusColor(flag),
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {getStatusText(flag)}
                  </div>
                  
                  {flag.environment && (
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      fontSize: '0.75rem',
                      textTransform: 'capitalize'
                    }}>
                      {flag.environment}
                    </div>
                  )}
                </div>
                
                {flag.description && (
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '0.875rem', 
                    margin: '0 0 0.75rem 0' 
                  }}>
                    {flag.description}
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {flag.variants && flag.variants.length > 0 && (
                    <span>🧪 {flag.variants.length} variants</span>
                  )}
                  {flag.tags && flag.tags.length > 0 && (
                    <span>🏷️ {flag.tags.map(t => t.tag).join(', ')}</span>
                  )}
                  <span>📅 {new Date(flag.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ 
                  position: 'relative', 
                  display: 'inline-block', 
                  width: '60px', 
                  height: '34px' 
                }}>
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={(e) => toggleFlag(flag.id, e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span 
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: flag.enabled ? '#10b981' : '#ccc',
                      borderRadius: '34px',
                      transition: '0.4s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      display: 'block',
                      height: '26px',
                      width: '26px',
                      left: flag.enabled ? '30px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.4s'
                    }} />
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const FeatureFlagsView = memo(FeatureFlagsViewComponent)