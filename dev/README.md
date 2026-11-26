# Demo app

Next.js + Payload app for trying the plugin and running its tests. It uses SQLite at `file:./dev.db` (or `DATABASE_URI`), so there is no database server to start.

```bash
pnpm install
pnpm dev
```

- Home: http://localhost:3000 (shows the `new-feature` flag's state)
- Admin: http://localhost:3000/admin
- Dashboard: http://localhost:3000/admin/feature-flags-overview
- Public endpoint: http://localhost:3000/api/feature-flags/evaluate?names=new-feature

## Users

The seed creates these users:

| Email | Password | Role |
| --- | --- | --- |
| `dev@payloadcms.com` | `test` | admin |
| `editor@payloadcms.com` | `test123` | editor |
| `user@payloadcms.com` | `test123` | user |

Any logged-in user can read and create flags; only admins can update or delete them.

## Plugin config

`dev/payload.config.ts` turns on rollouts, variants, `cache` and `publicEndpoint`, and uses `collectionOverrides` to add `environment`, `owner`, `expiresAt` and `jiraTicket` fields, the access rules above, and an audit-log hook.

The REST API needs a logged-in user here, because `read` access is limited to logged-in users:

```bash
curl 'http://localhost:3000/api/feature-flags?where[name][equals]=new-feature'   # 403 without a session
curl 'http://localhost:3000/api/feature-flags/evaluate?names=new-feature'        # public
```
