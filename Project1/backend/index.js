import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendDirectory = fileURLToPath(new URL('.', import.meta.url))
const frontendDirectory = resolve(backendDirectory, '..', 'frontend')
const dataDirectory = resolve(backendDirectory, 'data')
const dataFile = resolve(dataDirectory, 'operations.json')
const buildDirectory = resolve(frontendDirectory, 'dist')
const maxBodyBytes = 2 * 1024 * 1024
const collections = ['production', 'products', 'movements', 'inspections', 'repairs', 'orders', 'warranties', 'claims']
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

let data = await readStoredData()
let saveQueue = Promise.resolve()
let temporaryFileNumber = 0

async function readStoredData() {
  try {
    const stored = JSON.parse(await readFile(dataFile, 'utf8'))
    validateData(stored)
    return stored
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw new Error(`Could not load persisted dashboard data from ${dataFile}.`, { cause: error })
  }
}

function validateData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Dashboard data must be a JSON object.')
  }
  for (const collection of collections) {
    if (!Array.isArray(value[collection])) {
      throw new TypeError(`Dashboard data must include a "${collection}" array.`)
    }
  }
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(value))
}

async function readJsonBody(request) {
  const chunks = []
  let bytes = 0

  for await (const chunk of request) {
    bytes += chunk.length
    if (bytes > maxBodyBytes) {
      const error = new Error('Request body exceeds the 2 MB limit.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (cause) {
    const error = new Error('Request body must contain valid JSON.', { cause })
    error.statusCode = 400
    throw error
  }
}

async function saveData(nextData) {
  const queuedSave = saveQueue.catch(() => {}).then(async () => {
    await mkdir(dataDirectory, { recursive: true })
    const temporaryFile = `${dataFile}.${process.pid}.${temporaryFileNumber++}.tmp`
    try {
      await writeFile(temporaryFile, `${JSON.stringify(nextData, null, 2)}\n`, 'utf8')
      await rename(temporaryFile, dataFile)
    } catch (error) {
      try {
        await unlink(temporaryFile)
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') console.error('Could not remove temporary dashboard data file.', cleanupError)
      }
      throw error
    }
    data = nextData
  })
  saveQueue = queuedSave
  await queuedSave
}

async function serveFrontend(response, pathname) {
  let relativePath
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, '')
  } catch {
    response.writeHead(400).end('Invalid URL path.')
    return
  }

  let filePath = resolve(buildDirectory, relativePath || 'index.html')
  if (filePath !== buildDirectory && !filePath.startsWith(`${buildDirectory}${sep}`)) {
    response.writeHead(403).end('Forbidden.')
    return
  }

  try {
    if (!(await stat(filePath)).isFile()) filePath = resolve(buildDirectory, 'index.html')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    filePath = resolve(buildDirectory, 'index.html')
  }

  try {
    const fileInfo = await stat(filePath)
    response.writeHead(200, {
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Length': fileInfo.size,
      'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    createReadStream(filePath).pipe(response)
  } catch (error) {
    if (error.code === 'ENOENT') {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Frontend build not found. Run "npm run build" in the frontend folder first.')
      return
    }
    throw error
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost')

  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' })
    return
  }

  if (requestUrl.pathname === '/api/data') {
    if (request.method === 'GET') {
      sendJson(response, 200, { data })
      return
    }
    if (request.method === 'PUT') {
      try {
        const nextData = await readJsonBody(request)
        validateData(nextData)
        await saveData(nextData)
        sendJson(response, 200, { data })
      } catch (error) {
        const statusCode = error.statusCode || (error instanceof TypeError ? 400 : 500)
        if (statusCode === 500) console.error('Could not save dashboard data.', error)
        sendJson(response, statusCode, { error: error.message })
      }
      return
    }
    response.setHeader('Allow', 'GET, PUT')
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'API route not found.' })
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed.')
    return
  }

  try {
    await serveFrontend(response, requestUrl.pathname)
  } catch (error) {
    console.error('Could not serve the frontend.', error)
    if (!response.headersSent) response.writeHead(500).end('Could not serve the frontend.')
    else response.destroy(error)
  }
})

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'

server.listen(port, host, () => {
  console.log(`Workbench backend listening at http://${host}:${port}`)
})
