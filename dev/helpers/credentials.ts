export const devUser = {
  name: 'Development Admin',
  email: 'dev@payloadcms.com',
  password: 'test',
  role: 'admin' as const,
}

export const testUsers = [
  {
    name: 'Content Editor',
    email: 'editor@payloadcms.com',
    password: 'test123',
    role: 'editor' as const,
  },
  {
    name: 'Regular User',
    email: 'user@payloadcms.com',
    password: 'test123',
    role: 'user' as const,
  },
]
