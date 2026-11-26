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
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>Feature Flags Demo - Payload CMS Plugin</title>
      </head>
      <body style={{ 
        backgroundColor: '#f8fafc', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: 0,
        padding: 0
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
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: '1rem 2rem'
        }}>
          <div style={{ 
            alignItems: 'center', 
            display: 'flex',
            justifyContent: 'space-between',
            margin: '0 auto',
            maxWidth: '1200px'
          }}>
            <div>
              <h1 style={{ 
                color: 'white', 
                fontSize: '1.5rem', 
                fontWeight: '600',
                margin: 0
              }}>
                <span aria-hidden="true">🚩</span> Payload Feature Flags
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.9rem', 
                margin: '0.25rem 0 0 0' 
              }}>
                Development & Testing Environment
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a className="nav-link" href="/admin">
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
          fontSize: '0.9rem',
          padding: '1rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{ margin: '0 auto', maxWidth: '1200px' }}>
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