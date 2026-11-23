// Writes dist/precache.json and stamps the service-worker version.
import fs from 'node:fs'
import path from 'node:path'
const dist = 'dist'
const files = []
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name)
  if (e.isDirectory()) walk(p)
  else if (!/\.(map)$/.test(e.name) && !['sw.js', 'precache.json', '.nojekyll'].includes(e.name) && !/-1920\.webp$/.test(e.name) && !(/-1200\.webp$/.test(e.name) && !e.name.startsWith('hero')) && !/og\.jpg$/.test(e.name)) files.push(path.relative(dist, p).split(path.sep).join('/'))
})
walk(dist)
fs.writeFileSync(path.join(dist, 'precache.json'), JSON.stringify(files))
const sw = path.join(dist, 'sw.js')
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD__', Date.now().toString(36)))
fs.writeFileSync(path.join(dist, '.nojekyll'), '')
console.log(`precache: ${files.length} files`)
