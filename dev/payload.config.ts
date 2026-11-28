
import {sqliteAdapter} from "@payloadcms/db-sqlite"
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { payloadFeatureFlags } from '../src/index.js'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: 'posts',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'richText',
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'draft',
          options: ['draft', 'published'],
        },
        {
          name: 'publishedAt',
          type: 'date',
        },
      ],
    },
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'content',
          type: 'richText',
        },
        {
          name: 'layout',
          type: 'select',
          defaultValue: 'default',
          options: ['default', 'landing', 'sidebar'],
        },
      ],
    },
    {
      slug: 'users',
      admin: {
        useAsTitle: 'email',
      },
      auth: true,
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'role',
          type: 'select',
          defaultValue: 'user',
          options: ['admin', 'editor', 'user'],
        },
      ],
    },
    {
      slug: 'media',
      fields: [
        {
          name: 'alt',
          type: 'text',
        },
      ],
      upload: {
        staticDir: path.resolve(dirname, 'media'),
      },
    },
  ],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./dev.db',
    },
  }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    payloadFeatureFlags({
      // Enable all features
      enableRollouts: true,
      enableVariants: true,
      // Cache the RSC helpers across requests; cleared when a flag changes
      cache: true,
      defaultValue: false,

      // Lets the client hooks read flags with `source: 'public'` while the
      // collection's read access below stays limited to logged-in users
      publicEndpoint: true,

      // Custom collection configuration
      collectionOverrides: {
        access: {
          // Only authenticated users can read/manage feature flags
          create: ({ req: { user } }) => !!user,
          delete: ({ req: { user } }) => user?.role === 'admin',
          read: ({ req: { user } }) => !!user,
          update: ({ req: { user } }) => user?.role === 'admin',
        },
        admin: {
          description: 'Manage feature flags for the development environment',
          group: 'Configuration',
          useAsTitle: 'name',
        },
        fields: ({ defaultFields }) => [
          ...defaultFields,
          {
            name: 'environment',
            type: 'select',
            admin: {
              description: 'Which environment this flag applies to',
            },
            defaultValue: 'development',
            options: [
              { label: 'Development', value: 'development' },
              { label: 'Staging', value: 'staging' },
              { label: 'Production', value: 'production' },
            ],
            required: true,
          },
          {
            name: 'owner',
            type: 'relationship',
            admin: {
              description: 'Team member responsible for this feature flag',
            },
            relationTo: 'users',
          },
          {
            name: 'expiresAt',
            type: 'date',
            admin: {
              description: 'Optional expiration date for temporary flags',
            },
          },
          {
            name: 'jiraTicket',
            type: 'text',
            admin: {
              description: 'Related JIRA ticket or issue number',
            },
          },
        ],
        hooks: {
          afterChange: [
            ({ doc, operation, req }) => {
              // Send notification for critical flag changes
              if (doc.environment === 'production' && req.user) {
                console.log(`🚨 Production feature flag "${doc.name}" was ${operation === 'create' ? 'created' : 'modified'} by ${req.user.email}`)
              }
            },
          ],
          beforeChange: [
            ({ data, operation, req }) => {
              // Auto-assign current user as owner for new flags
              if (operation === 'create' && !data.owner && req.user) {
                data.owner = req.user.id
              }

              // Log flag changes for audit trail
              if (req.user) {
                console.log(`Feature flag "${data.name}" ${operation} by ${req.user.email}`)
              }

              return data
            },
          ],
        },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-key-change-in-production',
  sharp,
  typescript: {
    // Types are regenerated on demand with `pnpm generate:types`, so the dev
    // server does not spawn a generator process on every config change.
    autoGenerate: false,
    // Leave out the `declare module 'payload'` block. It would narrow Payload's
    // collection slugs and document types to this app for every file in the
    // program, and the dev app compiles the plugin source directly: that
    // source is written against any config, so it would stop type-checking.
    // Code that wants this app's document types imports them from
    // payload-types.ts instead.
    declare: false,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
