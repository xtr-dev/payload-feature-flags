import type { ListViewServerProps } from 'payload'

import { renderFeatureFlagsOverview } from './renderFeatureFlagsOverview.js'

// Registered as collection.admin.components.views.list (enableCustomListView),
// where Payload supplies user/permissions/collectionConfig directly on props.
// For the root /admin/feature-flags-overview view see FeatureFlagsOverviewView.tsx,
// which gets a different prop shape and derives the same values differently.
export default async function FeatureFlagsView(props: ListViewServerProps) {
  const { collectionConfig, payload, permissions, user } = props

  return renderFeatureFlagsOverview({
    collectionSlug: collectionConfig.slug,
    payload,
    permissions,
    user,
  })
}
