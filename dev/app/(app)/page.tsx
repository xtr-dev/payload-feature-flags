import { getPayload } from 'payload'
import config from '@payload-config'
import { getAllFeatureFlags, isFeatureEnabled } from 'payload-feature-flags/rsc'

export default async function HomePage() {
  const payload = await getPayload({ config })
  
  const allFlags = await getAllFeatureFlags(payload)
  const activeCount = Object.keys(allFlags).length
  const isNewFeatureEnabled = await isFeatureEnabled('new-feature', payload)

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        Feature Flags Demo
      </h1>
      
      <p style={{ 
        fontSize: '1.1rem', 
        color: '#64748b', 
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        Simple demonstration of the Payload CMS Feature Flags plugin
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚩</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Active Flags
          </div>
        </div>
        
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {isNewFeatureEnabled ? '✅' : '❌'}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
            New Feature
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {isNewFeatureEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {isNewFeatureEnabled && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0369a1' }}>
            🎉 Feature Flag Active
          </h3>
          <p style={{ margin: 0, color: '#0369a1' }}>
            The "new-feature" flag is enabled! This content is only visible when the flag is active.
          </p>
        </div>
      )}

      <div style={{
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>
          Manage Feature Flags
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: '#64748b' }}>
          Use the Payload admin panel to create and manage feature flags.
        </p>
        <a 
          href="/admin/collections/feature-flags"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '500'
          }}
        >
          Open Admin Panel
        </a>
      </div>
    </div>
  )
}