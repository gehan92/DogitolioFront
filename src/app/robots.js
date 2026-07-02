export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/superadmin', '/owner', '/profile', '/auth'],
    },
    sitemap: 'https://mealhere.com/sitemap.xml',
  }
}
