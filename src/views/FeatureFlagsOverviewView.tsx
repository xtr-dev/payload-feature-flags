import type { AdminViewServerProps } from 'payload'
import { renderFeatureFlagsOverview } from './renderFeatureFlagsOverview.js'

// Registered as a root admin view (config.admin.components.views['feature-flags-overview'],
// path /admin/feature-flags-overview). Root views get AdminViewServerProps, not
// ListViewServerProps: Payload's RootPage only fills in serverProps.user,
// .permissions and .collectionConfig for /collections/:slug routes (see
// @payloadcms/next Root/getViewFromConfig.js) so a plain FeatureFlagsView here
// always read undefined user and rendered "Authentication Required" for every
// visitor, logged in or not. user/permissions live on initPageResult instead,
// and collectionSlug has to be threaded in via the Component's serverProps
// (src/index.ts) since a root view is never told which collection it is for.
export default async function FeatureFlagsOverviewView(
  props: AdminViewServerProps & { collectionSlug: string },
) {
  const { initPageResult, payload, collectionSlug } = props

  return renderFeatureFlagsOverview({
    user: initPageResult?.req?.user,
    permissions: initPageResult?.permissions,
    collectionSlug,
    payload,
  })
}
