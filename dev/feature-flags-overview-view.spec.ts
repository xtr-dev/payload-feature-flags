import type { AdminViewServerProps } from 'payload'

import { describe, expect, test, vi } from 'vitest'

// FeatureFlagsClient pulls in @payloadcms/ui, whose bundle statically imports CSS
// that vitest's node environment can't load. Stub it out so this stays a test of
// the auth/permission branching in renderFeatureFlagsOverview, not of the client bundle.
vi.mock('../src/views/FeatureFlagsClient.js', () => ({
  default: (props: Record<string, unknown>) => ({
    $$typeof: Symbol.for('react.element'),
    type: 'mock-feature-flags-client',
    props,
  }),
}))

const { default: FeatureFlagsOverviewView } = await import('../src/views/FeatureFlagsOverviewView.js')

const mockPayload = {
  find: async () => ({ docs: [{ id: 'flag-1', name: 'new-homepage', enabled: true }] }),
}

const makeProps = (overrides: {
  user?: unknown
  read?: boolean
  update?: boolean
}): AdminViewServerProps & { collectionSlug: string } =>
  ({
    initPageResult: {
      req: { user: 'user' in overrides ? overrides.user : { id: 'admin-1' } },
      permissions: {
        collections: {
          'feature-flags': { read: overrides.read ?? true, update: overrides.update ?? false },
        },
      },
    },
    payload: mockPayload,
    collectionSlug: 'feature-flags',
  }) as unknown as AdminViewServerProps & { collectionSlug: string }

// Root admin views (config.admin.components.views['feature-flags-overview']) receive
// AdminViewServerProps, not ListViewServerProps: Payload only fills in user/permissions
// directly on props for /admin/collections/:slug routes. Before this fix, reusing the
// list-view component here meant `props.user` was always undefined, so a logged-in
// admin hitting /admin/feature-flags-overview always saw "Authentication Required".
describe('FeatureFlagsOverviewView (root admin view props)', () => {
  test('renders the dashboard for a logged-in user with read access', async () => {
    const element: any = await FeatureFlagsOverviewView(makeProps({}))

    expect(typeof element.type).toBe('function')
    expect(element.props.collectionSlug).toBe('feature-flags')
  })

  test('does not show Authentication Required for a logged-in user', async () => {
    const element: any = await FeatureFlagsOverviewView(makeProps({}))

    expect(element.type).not.toBe('div')
  })

  test('shows Authentication Required only when initPageResult carries no user', async () => {
    const element: any = await FeatureFlagsOverviewView(makeProps({ user: null }))

    expect(element.type).toBe('div')
    expect(JSON.stringify(element)).toContain('Authentication Required')
  })

  test('shows Access Denied for a logged-in user without read permission', async () => {
    const element: any = await FeatureFlagsOverviewView(makeProps({ read: false }))

    expect(element.type).toBe('div')
    expect(JSON.stringify(element)).toContain('Access Denied')
  })
})
