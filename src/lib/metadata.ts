export function pageMeta(title: string, description: string) {
  return { meta: [{ title: `${title} — Materi_ali` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — Materi_ali` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] };
}