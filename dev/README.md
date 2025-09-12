# Demo Environment

Simple demo for testing the feature flags plugin.

## Quick Start

```bash
pnpm install
pnpm dev
# Visit http://localhost:3000
```

**URLs:**
- **Home:** http://localhost:3000
- **Admin:** http://localhost:3000/admin  
- **API:** http://localhost:3000/api/feature-flags

## Login

**Admin:** `dev@payloadcms.com` / `test` (full access)  
**Editor:** `editor@payloadcms.com` / `test123` (limited access)  
**User:** `user@payloadcms.com` / `test123` (read-only)

## What's included

**Homepage:** Shows feature flag status and demo content  
**Admin Panel:** Manage feature flags and users  
**Sample Data:** One test feature flag ready to use

## Testing the Plugin

1. **Check the homepage** - See the feature flag in action
2. **Login to admin** - Use admin credentials above  
3. **Toggle the flag** - Go to Feature Flags collection
4. **Refresh homepage** - See content appear/disappear

## Plugin Config

```typescript
payloadFeatureFlags({
  enableRollouts: true,    // Percentage rollouts  
  enableVariants: true,    // A/B testing
  enableApi: true,         // REST endpoints
  defaultValue: false,     // New flags start disabled
  // + custom fields and permissions
})
```

## API Testing

```bash
# Get all flags
curl http://localhost:3000/api/feature-flags

# Get specific flag  
curl http://localhost:3000/api/feature-flags/new-feature
```


## Database

Uses in-memory MongoDB - no setup needed! Data resets on each restart.

## Creating New Flags

1. Login to `/admin/collections/feature-flags`
2. Click "Create New"  
3. Add name, description, and toggle enabled/disabled
4. Check the homepage to see it working

## Need Help?

- Check the console for error messages
- Make sure port 3000 is available  
- Try logging in as admin user

## Next Steps

Ready to use this in your project?

1. **Add to your project:** Copy the plugin config
2. **Customize:** Add your own fields and permissions  
3. **Go live:** Use a real MongoDB database
4. **Monitor:** Track how your flags perform

---

This demo gives you everything needed to test feature flags with zero setup.
