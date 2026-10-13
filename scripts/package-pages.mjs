import { mkdir, readFile, writeFile } from 'node:fs/promises'

// Vite has already resolved every resource against the selected --base path.
// Keep the regular local app entry, and also provide the public site's /app/ URL.
const output = new URL('../dist/', import.meta.url)
const app = await readFile(new URL('index.html', output), 'utf8')
const site = await readFile(new URL('site/index.html', output), 'utf8')
await mkdir(new URL('app/', output), { recursive: true })
await writeFile(new URL('app/index.html', output), app)
await writeFile(new URL('index.html', output), site)
await writeFile(new URL('.nojekyll', output), '')
console.log('Pages ready: / = project homepage, /app/ = gallery')
