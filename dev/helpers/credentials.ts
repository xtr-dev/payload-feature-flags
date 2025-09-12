export const devUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
  name: 'Development Admin',
  role: 'admin' as const,
}

export const testUsers = [
  {
    email: 'editor@payloadcms.com',
    password: 'test123',
    name: 'Content Editor',
    role: 'editor' as const,
  },
  {
    email: 'user@payloadcms.com',
    password: 'test123',
    name: 'Regular User',
    role: 'user' as const,
  },
]
