import type { Payload } from 'payload'

import { devUser, testUsers } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  // Create admin user
  const { totalDocs: adminExists } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  let adminUser
  if (!adminExists) {
    adminUser = await payload.create({
      collection: 'users',
      data: devUser,
    })
    console.log(`✅ Created admin user: ${devUser.email}`)
  } else {
    const adminResult = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: devUser.email,
        },
      },
    })
    adminUser = adminResult.docs[0]
  }

  // Create test users
  for (const user of testUsers) {
    const { totalDocs: userExists } = await payload.count({
      collection: 'users',
      where: {
        email: {
          equals: user.email,
        },
      },
    })

    if (!userExists) {
      await payload.create({
        collection: 'users',
        data: user,
      })
      console.log(`✅ Created user: ${user.email}`)
    }
  }

  // Create sample posts
  const { totalDocs: postsExist } = await payload.count({
    collection: 'posts',
  })

  if (postsExist === 0) {
    const samplePosts = [
      {
        publishedAt: new Date().toISOString(),
        status: 'published' as const,
        title: 'Welcome to Feature Flag Testing',
      },
      {
        status: 'draft' as const, 
        title: 'Beta Feature Showcase',
      },
      {
        publishedAt: new Date().toISOString(),
        status: 'published' as const,
        title: 'A/B Test Content',
      },
    ]

    for (const post of samplePosts) {
      await payload.create({
        collection: 'posts',
        data: post,
      })
    }
    console.log('✅ Created sample posts')
  }

  // Create sample pages
  const { totalDocs: pagesExist } = await payload.count({
    collection: 'pages',
  })

  if (pagesExist === 0) {
    const samplePages = [
      {
        slug: 'home',
        layout: 'landing' as const,
        title: 'Home',
      },
      {
        slug: 'about',
        layout: 'default' as const,
        title: 'About',
      },
      {
        slug: 'beta-dashboard',
        layout: 'sidebar' as const,
        title: 'Beta Dashboard',
      },
    ]

    for (const page of samplePages) {
      await payload.create({
        collection: 'pages',
        data: page,
      })
    }
    console.log('✅ Created sample pages')
  }

  // Create simple feature flag for testing
  const { totalDocs: flagsExist } = await payload.count({
    collection: 'feature-flags',
  })

  if (flagsExist === 0) {
    await payload.create({
      collection: 'feature-flags',
      data: {
        name: 'new-feature',
        description: 'A simple test feature flag',
        enabled: true,
        environment: 'development' as const,
        owner: adminUser.id,
      },
    })
    console.log('✅ Created simple feature flag for testing')
  }

  console.log('🎯 Development environment seeded successfully!')
  console.log('📧 Login with:')
  console.log(`   Admin: ${devUser.email} / ${devUser.password}`)
  console.log(`   Editor: ${testUsers[0].email} / ${testUsers[0].password}`)
  console.log(`   User: ${testUsers[1].email} / ${testUsers[1].password}`)
}
