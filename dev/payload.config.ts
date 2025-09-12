import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'
import { payloadFeatureFlags } from '../src/index.js'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const buildConfigWithMemoryDB = async () => {
  // Use in-memory MongoDB for both test and development
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production') {
    console.log('🗃️  Starting MongoDB Memory Server...')
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        dbName: 'payload-feature-flags-dev',
      },
    })

    const uri = memoryDB.getUri()
    process.env.DATABASE_URI = `${uri}&retryWrites=true`
    console.log('✅ MongoDB Memory Server started successfully')
  }

  return buildConfig({
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
            options: ['draft', 'published'],
            defaultValue: 'draft',
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
            options: ['default', 'landing', 'sidebar'],
            defaultValue: 'default',
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
            options: ['admin', 'editor', 'user'],
            defaultValue: 'user',
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
    db: mongooseAdapter({
      ensureIndexes: true,
      url: process.env.DATABASE_URI || 'mongodb://localhost/payload-feature-flags-dev',
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
        enableApi: true,
        defaultValue: false,

        // Custom collection configuration
        collectionOverrides: {
          admin: {
            useAsTitle: 'name',
            group: 'Configuration',
            description: 'Manage feature flags for the development environment',
          },
          access: {
            // Only authenticated users can read/manage feature flags
            read: ({ req: { user } }) => !!user,
            create: ({ req: { user } }) => !!user,
            update: ({ req: { user } }) => user?.role === 'admin',
            delete: ({ req: { user } }) => user?.role === 'admin',
          },
          fields: ({ defaultFields }) => [
            ...defaultFields,
            {
              name: 'environment',
              type: 'select',
              options: [
                { label: 'Development', value: 'development' },
                { label: 'Staging', value: 'staging' },
                { label: 'Production', value: 'production' },
              ],
              required: true,
              defaultValue: 'development',
              admin: {
                description: 'Which environment this flag applies to',
              },
            },
            {
              name: 'owner',
              type: 'relationship',
              relationTo: 'users',
              admin: {
                description: 'Team member responsible for this feature flag',
              },
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
            beforeChange: [
              async ({ data, req, operation }) => {
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
            afterChange: [
              async ({ doc, req, operation }) => {
                // Send notification for critical flag changes
                if (doc.environment === 'production' && req.user) {
                  console.log(`🚨 Production feature flag "${doc.name}" was ${operation === 'create' ? 'created' : 'modified'} by ${req.user.email}`)
                }
              },
            ],
          },
        },
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'dev-secret-key-change-in-production',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
