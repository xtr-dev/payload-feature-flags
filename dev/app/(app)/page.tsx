import config from '@payload-config'
import { getPayload } from 'payload'
import { getAllFeatureFlags, isFeatureEnabled } from 'payload-feature-flags/rsc'

// The page shows the flags' current state, so it is rendered on every request.
// Prerendering it would also make `next build` query the database, which has
// no tables yet in a fresh checkout (the schema is only pushed in dev mode).
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  
  const allFlags = await getAllFeatureFlags(payload)
  const activeCount = Object.keys(allFlags).length
  const isNewFeatureEnabled = await isFeatureEnabled('new-feature', payload)

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      margin: '0 auto', 
      maxWidth: '800px',
      padding: '2rem'
    }}>
      <h1 style={{ 
        color: '#1e293b', 
        fontSize: '2.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        Feature Flags Demo
      </h1>
      
      <p style={{ 
        color: '#64748b', 
        fontSize: '1.1rem', 
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        Simple demonstration of the Payload CMS Feature Flags plugin
      </p>

      <div style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><span aria-hidden="true">🚩</span></div>
          <div style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: '600' }}>
            {activeCount}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Active Flags
          </div>
        </div>
        
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {isNewFeatureEnabled ? '✅' : '❌'}
          </div>
          <div style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '600' }}>
            New Feature
          </div>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {isNewFeatureEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {isNewFeatureEnabled && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          marginBottom: '2rem',
          padding: '1rem'
        }}>
          <h3 style={{ color: '#0369a1', margin: '0 0 0.5rem 0' }}>
            <span aria-hidden="true">🎉</span> Feature Flag Active
          </h3>
          <p style={{ color: '#0369a1', margin: 0 }}>
            The "new-feature" flag is enabled! This content is only visible when the flag is active.
          </p>
        </div>
      )}

      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h3 style={{ color: '#1e293b', margin: '0 0 1rem 0' }}>
          Manage Feature Flags
        </h3>
        <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>
          Use the Payload admin panel to create and manage feature flags.
        </p>
        <a 
          href="/admin/collections/feature-flags"
          style={{
            background: '#3b82f6',
            borderRadius: '6px',
            color: 'white',
            display: 'inline-block',
            fontWeight: '500',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none'
          }}
        >
          Open Admin Panel
        </a>
      </div>
    </div>
  )
}