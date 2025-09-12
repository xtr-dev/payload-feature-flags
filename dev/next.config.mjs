import { withPayload } from '@payloadcms/next/withPayload'

import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Add webpack aliases for local plugin development
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      'payload-feature-flags/views': path.resolve(dirname, '../src/exports/views.ts'),
      'payload-feature-flags/client': path.resolve(dirname, '../src/exports/client.ts'),
      'payload-feature-flags/rsc': path.resolve(dirname, '../src/exports/rsc.ts'),
      'payload-feature-flags': path.resolve(dirname, '../src/index.ts'),
    }

    return webpackConfig
  },
  serverExternalPackages: ['mongodb-memory-server'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
