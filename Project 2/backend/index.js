import { createServer } from 'node:http'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { products, seedOrders } from './seed.js'

const backendDirectory = fileURLToPath(new URL('.', import.meta.url))
const dataFile = resolve(backendDirectory, 'data', 'orders.json')
const maxBodyBytes = 64 * 1024
const productById = new Map(products.map((product) => [product.id, product]))
let orders
let nextOrderNumber = 3000
let saveQueue = Promise.resolve()

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

async function loadOrders() {
  try {
    const storedOrders = JSON.parse(await readFile(dataFile, 'utf8'))
    if (!Array.isArray(storedOrders)) throw new TypeError('Persisted orders must be an array.')
    return storedOrders
  } catch (error) {
    if (error.code === 'ENOENT') return structuredClone(seedOrders)
    throw new Error(`Could not load persisted OrderDesk orders from ${dataFile}.`, { cause: error })
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
    if (bytes > maxBodyBytes) throw new HttpError(413, 'Request body exceeds the 64 KB limit.')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (cause) {
    throw new HttpError(400, `Request body must contain valid JSON. ${cause.message}`)
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function createOrder(lines) {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > products.length) {
    throw new HttpError(400, 'Add at least one product to your order.')
  }

  const seen = new Set()
  let subtotal = 0
  for (const line of lines) {
    if (!line || typeof line.id !== 'string' || !Number.isSafeInteger(line.quantity)) {
      throw new HttpError(400, 'Each order line must include a product id and whole-number quantity.')
    }
    if (seen.has(line.id)) throw new HttpError(400, 'Each product can only appear once in an order.')
    seen.add(line.id)
    const product = productById.get(line.id)
    if (!product) throw new HttpError(400, `Product "${line.id}" is not in the catalogue.`)
    if (line.quantity < product.moq || line.quantity % product.moq !== 0) {
      throw new HttpError(400, `${product.name} must be ordered in multiples of ${product.moq}.`)
    }
    if (line.quantity > product.stock) {
      throw new HttpError(400, `Only ${product.stock} units of ${product.name} are available.`)
    }
    subtotal += product.price * line.quantity
  }

  if (subtotal < 5000) throw new HttpError(400, 'The minimum order value is ₹5,000.')

  const discount = subtotal >= 50000 ? Math.round(subtotal * 0.05) : 0
  const today = new Date()
  const deliveryStart = new Date(today)
  const deliveryEnd = new Date(today)
  deliveryStart.setDate(today.getDate() + 5)
  deliveryEnd.setDate(today.getDate() + 7)
  const id = `OD-${nextOrderNumber++}`
  return {
    id,
    placed: formatDate(today),
    status: 'Processing',
    delivery: `${formatDate(deliveryStart)} – ${formatDate(deliveryEnd)}`,
    subtotal,
    discount,
    total: subtotal - discount,
    lines,
    invoice: `INV-${id.slice(3)}`,
  }
}

async function persistOrder(order) {
  const operation = saveQueue.catch(() => {}).then(async () => {
    const nextOrders = [order, ...orders]
    await mkdir(dirname(dataFile), { recursive: true })
    const temporaryFile = `${dataFile}.${process.pid}.tmp`
    try {
      await writeFile(temporaryFile, `${JSON.stringify(nextOrders, null, 2)}\n`, 'utf8')
      await rename(temporaryFile, dataFile)
    } catch (error) {
      try {
        await unlink(temporaryFile)
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') console.error('Could not remove temporary order data file.', cleanupError)
      }
      throw error
    }
    orders = nextOrders
  })
  saveQueue = operation
  await operation
}

orders = await loadOrders()

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost')

  if (requestUrl.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' })
    return
  }
  if (requestUrl.pathname === '/api/products' && request.method === 'GET') {
    sendJson(response, 200, { products })
    return
  }
  if (requestUrl.pathname === '/api/orders') {
    if (request.method === 'GET') {
      try {
        await saveQueue
        sendJson(response, 200, { orders })
      } catch (error) {
        console.error('Could not load persisted OrderDesk orders.', error)
        sendJson(response, 500, { error: 'Could not load orders.' })
      }
      return
    }
    if (request.method === 'POST') {
      try {
        const body = await readJsonBody(request)
        const order = createOrder(body?.lines)
        await persistOrder(order)
        sendJson(response, 201, { order })
      } catch (error) {
        const statusCode = error.statusCode || 500
        if (statusCode === 500) console.error('Could not save OrderDesk order.', error)
        sendJson(response, statusCode, { error: statusCode === 500 ? 'Could not save the order.' : error.message })
      }
      return
    }
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'API route not found.' })
    return
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found.')
})

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '127.0.0.1'

server.listen(port, host, () => {
  console.log(`OrderDesk API listening at http://${host}:${port}`)
})
