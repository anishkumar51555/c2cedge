import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const categories = ['All products', 'Kitchen', 'Home & living']
const money = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`
const readStored = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch (error) {
    console.error(`Could not read ${key} from local storage.`, error)
    return fallback
  }
}

async function requestJson(path, options) {
  const response = await fetch(path, options)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}.`)
  return payload
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12v9" /></>,
    invoice: <><path d="M7 3h8l4 4v14l-2-1.3L15 21l-3-1.3L9 21l-2-1.3L5 21V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    truck: <><path d="M3 6h11v12H3zM14 10h4l3 3v5h-7" /><circle cx="7.5" cy="18" r="1.8" /><circle cx="17.5" cy="18" r="1.8" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 20h16" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1.2 1.1-1.9 1.4-1.9 3M12 17.5v.1" /></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function ProductArt({ product, compact = false }) {
  return (
    <div className={`product-art art-${product.tone}${compact ? ' compact' : ''}`} aria-hidden="true">
      {product.shape === 'purifier' && <div className="purifier"><span /><i /><b /></div>}
      {product.shape === 'kettle' && <div className="kettle"><span /><i /><b /></div>}
      {product.shape === 'mixer' && <div className="mixer"><span /><i /><b /></div>}
      {product.shape === 'linen' && <div className="linen"><span /><i /></div>}
      {product.shape === 'mugs' && <div className="mugs"><span /><i /><b /></div>}
      {product.shape === 'lamp' && <div className="lamp"><span /><i /><b /></div>}
    </div>
  )
}

function Status({ value }) {
  const className = value.toLowerCase().replaceAll(' ', '-')
  return <span className={`status status-${className}`}><i />{value}</span>
}

function App() {
  const [page, setPage] = useState('catalog')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All products')
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => readStored('orderdesk-cart-v1', {}))
  const [orders, setOrders] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [notice, setNotice] = useState('')
  const [orderFilter, setOrderFilter] = useState('All orders')
  const [apiReady, setApiReady] = useState(false)
  const [backendLoading, setBackendLoading] = useState(true)
  const [backendError, setBackendError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadPortalData = useCallback(async () => {
    setBackendLoading(true)
    setBackendError('')
    try {
      const [productPayload, orderPayload] = await Promise.all([
        requestJson('/api/products'),
        requestJson('/api/orders'),
      ])
      if (!Array.isArray(productPayload.products) || !Array.isArray(orderPayload.orders)) {
        throw new Error('The backend returned an invalid catalogue or order list.')
      }
      setProducts(productPayload.products)
      setOrders(orderPayload.orders)
      setApiReady(true)
    } catch (error) {
      console.error('Could not load OrderDesk data from the backend.', error)
      setApiReady(false)
      setBackendError(error.message)
    } finally {
      setBackendLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortalData()
  }, [loadPortalData])

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'All products' || product.category === category
    const search = `${product.name} ${product.subtitle} ${product.category}`.toLowerCase()
    return matchesCategory && search.includes(query.toLowerCase())
  }), [category, products, query])

  const cartItems = products.filter((product) => cart[product.id] > 0)
  const cartCount = cartItems.reduce((sum, product) => sum + cart[product.id], 0)
  const cartTotal = cartItems.reduce((sum, product) => sum + product.price * cart[product.id], 0)
  const cartDiscount = cartTotal >= 50000 ? Math.round(cartTotal * 0.05) : 0
  const orderTotal = cartTotal - cartDiscount
  const setQuantity = (product, quantity) => {
    const next = { ...cart }
    if (quantity <= 0) delete next[product.id]
    else next[product.id] = Math.min(product.stock, Math.max(product.moq, Math.ceil(quantity / product.moq) * product.moq))
    setCart(next)
    localStorage.setItem('orderdesk-cart-v1', JSON.stringify(next))
  }

  const submitOrder = async () => {
    if (!cartItems.length || !apiReady || isSubmitting) return
    setIsSubmitting(true)
    try {
      const payload = await requestJson('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: cartItems.map((product) => ({ id: product.id, quantity: cart[product.id] })) }),
      })
      if (!payload.order) throw new Error('The backend did not return the created order.')
      setOrders((current) => [payload.order, ...current])
      setCart({})
      localStorage.setItem('orderdesk-cart-v1', JSON.stringify({}))
      setShowCheckout(false)
      setPage('orders')
      setNotice(`Order ${payload.order.id} placed successfully`)
      window.setTimeout(() => setNotice(''), 3500)
    } catch (error) {
      console.error('Could not place OrderDesk order.', error)
      setBackendError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openInvoice = (order) => setSelectedInvoice(order)
  const filteredOrders = orderFilter === 'All orders' ? orders : orders.filter((order) => order.status === orderFilter)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('catalog') }}>
          <span className="brand-mark"><span /><span /><span /></span>
          <span className="brand-name">order<span>desk</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="store-switcher">
          <div className="store-avatar">G</div>
          <div className="store-info"><strong>Green Basket</strong><span>Retail partner</span></div>
          <span className="switcher-dots">···</span>
        </div>
        <div className="nav-label">PORTAL</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={page === 'catalog' ? 'active' : ''} onClick={() => setPage('catalog')}><Icon name="grid" />Product catalogue</button>
          <button className={page === 'orders' ? 'active' : ''} onClick={() => setPage('orders')}><Icon name="package" />My orders<span className="nav-count">{orders.length}</span></button>
          <button className={page === 'invoices' ? 'active' : ''} onClick={() => setPage('invoices')}><Icon name="invoice" />Invoices</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="rep-card">
            <div className="rep-avatar">AM</div>
            <div><strong>Need a hand?</strong><span>Your rep, Ananya is here</span></div>
            <button aria-label="Contact support"><Icon name="arrow" size={16} /></button>
          </div>
          <div className="profile">
            <div className="profile-avatar">RK</div>
            <div className="profile-info"><strong>Anish</strong><span>Store owner</span></div>
            <button className="more-button" aria-label="More profile options">···</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Green Basket Stores</span><Icon name="chevron" size={13} /><strong>{page === 'catalog' ? 'Catalogue' : page === 'orders' ? 'My orders' : 'Invoices'}</strong></div>
          <div className="topbar-right">
            <span className="delivery-label"><Icon name="truck" size={16} />Delivering to <strong>Koramangala, Bengaluru</strong></span>
            <button className="help-button"><Icon name="help" size={17} />Help</button>
          </div>
        </header>

        {backendError && <div className="backend-alert" role="alert"><div><strong>Backend connection issue</strong><span>{backendError} Start the backend with <code>npm run server</code>, then retry.</span></div><button onClick={loadPortalData} disabled={backendLoading}>{backendLoading ? 'Connecting…' : 'Retry connection'}</button></div>}

        {page === 'catalog' && (
          <div className="page-wrap catalog-page">
            <section className="welcome-row">
              <div><div className="eyebrow"><span className="live-dot" />YOUR WHOLESALE CATALOGUE</div><h1>Good morning, Anish <span className="wave">✳</span></h1><p>Stock up on the good stuff. Your store's next bestseller is in here.</p></div>
              <div className="welcome-meta"><span className="credit-label">AVAILABLE CREDIT</span><strong>₹2,50,000</strong><button>View account <Icon name="arrow" size={14} /></button></div>
            </section>

            <section className="promo-banner">
              <div className="promo-copy"><span className="promo-kicker">A LITTLE SOMETHING EXTRA</span><h2>More in your cart.<br /><em>More in your pocket.</em></h2><p>Get 5% off orders above ₹50,000 this week.</p><button onClick={() => document.getElementById('products-heading')?.scrollIntoView({ behavior: 'smooth' })}>Shop the offer <Icon name="arrow" size={15} /></button></div>
              <div className="promo-art" aria-hidden="true"><div className="promo-sun" /><div className="promo-plant"><i /><i /><i /><b /></div><div className="promo-box"><span>5%</span><small>FOR YOU</small></div><div className="promo-blob" /></div>
              <div className="promo-note">A good week<br />to restock <span>↗</span></div>
            </section>

            <section className="catalog-heading" id="products-heading">
              <div><div className="section-eyebrow">MADE FOR YOUR SHELVES</div><h2>Shop the catalogue <span className="product-total">{products.length} products</span></h2></div>
              <label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, brands..." /><kbd>⌘ K</kbd></label>
            </section>
            <div className="catalog-toolbar">
              <div className="category-tabs">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}{item === 'All products' && <span>{products.length}</span>}</button>)}</div>
              <button className="filter-button"><Icon name="filter" size={16} />Filters <span className="filter-caret">⌄</span></button>
            </div>

            <div className="catalog-layout">
              <div className="product-grid">
                {visibleProducts.length ? visibleProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <div className="product-visual">
                      <ProductArt product={product} />
                      {product.tag && <span className={`product-tag ${product.tag === 'New arrival' ? 'tag-new' : ''}`}>{product.tag}</span>}
                      <button className="quick-add" onClick={() => setQuantity(product, (cart[product.id] || 0) + product.moq)} aria-label={`Add ${product.name} to cart`}><Icon name="plus" size={17} /></button>
                    </div>
                    <div className="product-details">
                      <div className="product-brand">{product.subtitle.split(' · ')[0]} <span>·</span> {product.category}</div>
                      <h3>{product.name}</h3>
                      <div className="product-bottom"><div><strong>{money(product.price)}</strong><span> / unit</span></div><span className="stock-label"><i />{product.stock} in stock</span></div>
                      <div className="product-order-row"><span>{product.pack} <b>·</b> MOQ {product.moq}</span>{cart[product.id] ? <div className="mini-stepper"><button onClick={() => setQuantity(product, cart[product.id] - product.moq)} aria-label={`Remove one case of ${product.name}`}><Icon name="minus" size={13} /></button><b>{cart[product.id]}</b><button onClick={() => setQuantity(product, cart[product.id] + product.moq)} aria-label={`Add one case of ${product.name}`}><Icon name="plus" size={13} /></button></div> : <button className="add-link" onClick={() => setQuantity(product, product.moq)}>Add <Icon name="plus" size={13} /></button>}</div>
                    </div>
                  </article>
                )) : <div className="empty-products"><div className="empty-icon"><Icon name="search" size={24} /></div><h3>No products found</h3><p>Try a different search or category.</p><button onClick={() => { setQuery(''); setCategory('All products') }}>Clear filters</button></div>}
              </div>
              <aside className="cart-panel">
                <div className="cart-head"><div><span className="cart-icon"><Icon name="bag" size={17} /></span><h3>Your order</h3></div><span className="cart-items-count">{cartCount} items</span></div>
                {cartItems.length ? <>
                  <div className="cart-product-list">{cartItems.map((product) => <div className="cart-product" key={product.id}><ProductArt product={product} compact /><div className="cart-product-info"><strong>{product.name}</strong><span>{cart[product.id]} units · {money(product.price)} ea.</span></div><div className="cart-product-total">{money(product.price * cart[product.id])}<button aria-label={`Remove ${product.name}`} onClick={() => setQuantity(product, 0)}><Icon name="close" size={13} /></button></div></div>)}</div>
                  <div className="cart-summary-line"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div>{cartDiscount > 0 && <div className="cart-summary-line discount-line"><span>Weekly restock offer (5%)</span><strong>−{money(cartDiscount)}</strong></div>}<div className="cart-summary-line muted"><span>Shipping</span><span>Included</span></div>
                  {cartTotal < 50000 && <div className="cart-progress"><div className="progress-copy"><span>Add <b>{money(50000 - cartTotal)}</b> for 5% off</span><span>{Math.min(100, Math.round(cartTotal / 50000 * 100))}%</span></div><div className="progress-track"><span style={{ width: `${Math.min(100, cartTotal / 50000 * 100)}%` }} /></div></div>}
                  <div className="cart-total"><span>Estimated total</span><strong>{money(orderTotal)}</strong></div>
                  <button className="checkout-button" onClick={() => setShowCheckout(true)} disabled={!apiReady}>Continue to checkout <Icon name="arrow" size={16} /></button>
                  <p className="cart-footnote"><Icon name="check" size={13} />No payment due today</p>
                </> : <div className="cart-empty"><div className="cart-empty-illustration"><Icon name="bag" size={24} /></div><strong>Your order starts here</strong><p>Add products to build your wholesale order.</p><span>Minimum order · ₹5,000</span></div>}
              </aside>
            </div>
            <footer className="page-footer"><span>© 2026 OrderDesk</span><span>Thoughtful goods, delivered better.</span><a href="mailto:hello@orderdesk.example">Get in touch <Icon name="arrow" size={12} /></a></footer>
          </div>
        )}

        {page === 'orders' && (
          <div className="page-wrap inner-page">
            <div className="inner-heading"><div><div className="section-eyebrow">YOUR STORE, AT A GLANCE</div><h1>My orders</h1><p>Keep an eye on everything coming your way.</p></div><button className="primary-button" onClick={() => setPage('catalog')}><Icon name="plus" size={16} />Start a new order</button></div>
            <div className="stats-row"><div className="stat-card"><span>Open orders</span><strong>{orders.filter((order) => order.status !== 'Delivered').length.toString().padStart(2, '0')}</strong><small><Icon name="truck" size={14} />On their way to you</small></div><div className="stat-card"><span>Delivered this month</span><strong>{orders.filter((order) => order.status === 'Delivered').length.toString().padStart(2, '0')}</strong><small><Icon name="check" size={14} />All caught up</small></div><div className="stat-card"><span>Total ordered</span><strong>{money(orders.reduce((sum, order) => sum + order.total, 0))}</strong><small><Icon name="package" size={14} />Across {orders.length} orders</small></div></div>
            <div className="table-card"><div className="table-heading"><div><h2>Order history</h2><span>{orders.length} orders total</span></div><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} aria-label="Filter orders"><option>All orders</option><option>Processing</option><option>In transit</option><option>Delivered</option></select></div>
              <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>ORDER</th><th>DATE PLACED</th><th>STATUS</th><th>EST. DELIVERY</th><th>ORDER TOTAL</th><th /></tr></thead><tbody>{filteredOrders.map((order) => <tr key={order.id}><td><button className="order-id" onClick={() => openInvoice(order)}>{order.id}<Icon name="chevron" size={13} /></button><span className="order-line-count">{order.lines.length} items</span></td><td>{order.placed}</td><td><Status value={order.status} /></td><td>{order.delivery}</td><td className="order-total">{money(order.total)}</td><td><button className="row-action" onClick={() => openInvoice(order)}>View details <Icon name="arrow" size={13} /></button></td></tr>)}</tbody></table>
              {filteredOrders.length === 0 && <div className="table-empty">No orders match this filter.</div>}</div>
            </div>
            <div className="help-strip"><div className="help-strip-icon"><Icon name="truck" size={20} /></div><div><strong>Need to make a change?</strong><span>Orders can be edited within 2 hours of placing them. Reach out to your account rep.</span></div><button>Contact Ananya <Icon name="arrow" size={14} /></button></div>
          </div>
        )}

        {page === 'invoices' && (
          <div className="page-wrap inner-page">
            <div className="inner-heading"><div><div className="section-eyebrow">ALL YOUR PAPERWORK, SORTED</div><h1>Invoices</h1><p>Every order, every invoice, right where you need it.</p></div><div className="invoice-period"><Icon name="calendar" size={16} />Last 90 days <span>⌄</span></div></div>
            <div className="invoice-summary"><div className="invoice-summary-icon"><Icon name="invoice" size={21} /></div><div><span>OUTSTANDING BALANCE</span><strong>₹0</strong><small>You're all paid up. Nice one!</small></div><div className="invoice-summary-decoration">✳</div></div>
            <div className="table-card invoice-table-card"><div className="table-heading"><div><h2>All invoices</h2><span>{orders.length} invoices</span></div><button className="filter-button"><Icon name="filter" size={16} />Filter <span className="filter-caret">⌄</span></button></div>
              <div className="orders-table-wrap"><table className="orders-table invoice-table"><thead><tr><th>INVOICE</th><th>ORDER</th><th>ISSUED</th><th>AMOUNT</th><th>PAYMENT</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.invoice}><td><button className="order-id invoice-id" onClick={() => openInvoice(order)}><span className="invoice-file"><Icon name="invoice" size={16} /></span>{order.invoice}</button></td><td>{order.id}</td><td>{order.placed}</td><td className="order-total">{money(order.total)}</td><td><span className="paid-label"><Icon name="check" size={13} />Paid</span></td><td><button className="download-button" onClick={() => openInvoice(order)}><Icon name="download" size={15} />View</button></td></tr>)}</tbody></table></div>
            </div>
            <div className="invoice-help"><span>Need an invoice for an older order?</span><a href="mailto:accounts@orderdesk.example">Talk to our accounts team <Icon name="arrow" size={13} /></a></div>
          </div>
        )}
      </main>

      {notice && <div className="toast"><span><Icon name="check" size={15} /></span>{notice}</div>}

      {showCheckout && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCheckout(false) }}><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="modal-top"><span className="modal-icon"><Icon name="bag" size={19} /></span><button className="modal-close" onClick={() => setShowCheckout(false)} aria-label="Close"><Icon name="close" /></button></div><div className="section-eyebrow">LOOKING GOOD</div><h2 id="checkout-title">Ready to place your order?</h2><p className="modal-description">Here's a quick look before we send it your way.</p><div className="checkout-lines">{cartItems.map((product) => <div key={product.id}><span>{product.name} <i>× {cart[product.id]}</i></span><strong>{money(product.price * cart[product.id])}</strong></div>)}{cartDiscount > 0 && <div className="discount-line"><span>Weekly restock offer (5%)</span><strong>−{money(cartDiscount)}</strong></div>}</div><div className="checkout-delivery"><Icon name="truck" size={17} /><div><strong>Delivering to Green Basket Stores</strong><span>Koramangala, Bengaluru · Est. 5–7 business days</span></div></div><div className="checkout-grand-total"><span>Order total</span><strong>{money(orderTotal)}</strong></div><button className="checkout-button modal-submit" onClick={submitOrder} disabled={!apiReady || isSubmitting}>{isSubmitting ? 'Placing order…' : 'Place order'} {!isSubmitting && <Icon name="arrow" size={16} />}</button><div className="secure-note"><Icon name="check" size={13} />No payment due now. Invoice follows dispatch.</div></section></div>}

      {selectedInvoice && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedInvoice(null) }}><section className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-title"><div className="invoice-modal-head"><div className="brand mini-brand"><span className="brand-mark"><span /><span /><span /></span><span className="brand-name">order<span>desk</span></span></div><button className="modal-close" onClick={() => setSelectedInvoice(null)} aria-label="Close"><Icon name="close" /></button></div><div className="invoice-overline">TAX INVOICE <span>·</span> {selectedInvoice.invoice}</div><h2 id="invoice-title">Order {selectedInvoice.id}</h2><div className="invoice-modal-meta"><div><span>BILLED TO</span><strong>Green Basket Stores</strong><small>Koramangala, Bengaluru</small></div><div><span>ISSUED ON</span><strong>{selectedInvoice.placed}</strong><small><Status value={selectedInvoice.status === 'Processing' ? 'Processing' : 'Paid'} /></small></div></div><div className="invoice-lines"><div className="invoice-lines-head"><span>ITEM</span><span>QTY</span><span>AMOUNT</span></div>{selectedInvoice.lines.map((line) => { const product = products.find((item) => item.id === line.id); return <div className="invoice-line" key={line.id}><span><strong>{product?.name || line.id}</strong><small>{line.id} · {money(product?.price || 0)} / unit</small></span><span>{line.quantity}</span><strong>{money((product?.price || 0) * line.quantity)}</strong></div> })}</div><div className="invoice-total-line"><span>Subtotal</span><strong>{money(selectedInvoice.subtotal ?? selectedInvoice.lines.reduce((sum, line) => sum + (products.find((product) => product.id === line.id)?.price || 0) * line.quantity, 0))}</strong></div>{selectedInvoice.discount > 0 && <div className="invoice-total-line discount-line"><span>Weekly restock offer (5%)</span><strong>−{money(selectedInvoice.discount)}</strong></div>}<div className="invoice-total-line"><span>Shipping</span><span>Included</span></div><div className="invoice-grand"><span>Total due</span><strong>{money(selectedInvoice.total)}</strong></div><button className="download-invoice" onClick={() => window.print()}><Icon name="download" size={16} />Print / save invoice</button><p className="invoice-thanks">Thanks for growing with us. <span>✳</span></p></section></div>}
    </div>
  )
}

export default App
