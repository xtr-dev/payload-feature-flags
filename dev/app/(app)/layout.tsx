import React from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Feature Flags Demo - Payload CMS Plugin</title>
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc'
      }}>
        <style dangerouslySetInnerHTML={{
          __html: `
            .nav-link {
              color: white;
              text-decoration: none;
              padding: 0.5rem 1rem;
              background-color: rgba(255,255,255,0.2);
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.3);
              font-size: 0.9rem;
              transition: all 0.2s ease;
            }
            .nav-link:hover {
              background-color: rgba(255,255,255,0.3);
            }
          `
        }} />
        <nav style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '1rem 2rem',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            maxWidth: '1200px', 
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{ 
                color: 'white', 
                margin: 0, 
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                🚩 Payload Feature Flags
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                margin: '0.25rem 0 0 0', 
                fontSize: '0.9rem' 
              }}>
                Development & Testing Environment
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="/admin" className="nav-link">
                Admin Panel
              </a>
            </div>
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 100px)' }}>
          {children}
        </main>
        <footer style={{
          background: '#2d3748',
          color: 'white',
          padding: '1rem 2rem',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <p style={{ margin: 0 }}>
              Built with <strong>@xtr-dev/payload-feature-flags</strong> • 
              <a 
                href="https://payloadcms.com" 
                style={{ color: '#a0aec0', marginLeft: '0.5rem' }}
              >
                Powered by Payload CMS
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}