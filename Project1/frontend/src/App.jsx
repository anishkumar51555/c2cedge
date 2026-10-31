import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const storeKey = 'workbench-operations-v1'

const modules = [
  { id: 'production', name: 'FactoryPulse', subtitle: 'Production monitoring', icon: '◫' },
  { id: 'inventory', name: 'StockPilot', subtitle: 'Inventory & reorder', icon: '▦' },
  { id: 'quality', name: 'QualityCheck', subtitle: 'Product inspections', icon: '✓' },
  { id: 'repairs', name: 'ServicePro', subtitle: 'Appliance repairs', icon: '⌁' },
  { id: 'orders', name: 'OrderDesk', subtitle: 'Distributor orders', icon: '▤' },
  { id: 'warranty', name: 'WarrantyHub', subtitle: 'Product warranty', icon: '◇' },
]

const initialData = {
  production: [
    { id: 'p-1', date: today, line: 'Assembly A', product: 'Air purifier', planned: 120, completed: 96, issue: 'Delay', notes: 'Motor delivery arrived late.' },
    { id: 'p-2', date: today, line: 'Assembly B', product: 'Smart kettle', planned: 80, completed: 80, issue: 'None', notes: '' },
  ],
  products: [
    { id: 'sku-1', name: 'Air purifier', sku: 'AP-100', stock: 18, reorder: 20, price: 7999 },
    { id: 'sku-2', name: 'Smart kettle', sku: 'SK-200', stock: 45, reorder: 15, price: 2499 },
    { id: 'sku-3', name: 'Mixer grinder', sku: 'MG-300', stock: 9, reorder: 12, price: 3999 },
  ],
  movements: [],
  inspections: [
    { id: 'q-1', date: today, product: 'Air purifier', batch: 'AP-2408', inspector: 'M. Sharma', result: 'Fail', defects: 3, notes: 'Loose filter housing.', action: 'Retighten housing and recheck batch.', actionStatus: 'In progress' },
    { id: 'q-2', date: today, product: 'Smart kettle', batch: 'SK-118', inspector: 'A. Das', result: 'Pass', defects: 0, notes: '', action: '', actionStatus: 'Resolved' },
  ],
  repairs: [
    { id: 's-1', customer: 'Riya Patel', phone: '98765 43210', appliance: 'Mixer grinder', issue: 'Motor stops after a few minutes', visit: today, estimate: 850, status: 'Visit booked' },
  ],
  orders: [
    { id: 'o-1', retailer: 'Green Basket Stores', product: 'Smart kettle', quantity: 12, total: 29988, date: today, status: 'Confirmed' },
  ],
  warranties: [
    { id: 'w-1', customer: 'Arjun Mehta', product: 'Air purifier', serial: 'AP-88291', purchaseDate: '2026-09-10', months: 24 },
  ],
  claims: [],
}

function loadData() {
  try {
    const saved = localStorage.getItem(storeKey)
    return saved ? { ...initialData, ...JSON.parse(saved) } : initialData
  } catch (error) {
    console.error('Could not load dashboard data from this browser.', error)
    return initialData
  }
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)
}

function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}</label>
}

function Metric({ label, value, note, tone = '' }) {
  return <div className="metric-card"><span className="metric-label">{label}</span><strong className={tone}>{value}</strong>{note && <small>{note}</small>}</div>
}

function Empty({ children = 'Nothing here yet. Add your first record above.' }) {
  return <div className="empty-state">{children}</div>
}

function Table({ headers, children }) {
  return <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

function Status({ children }) {
  const value = String(children || 'Open')
  const tone = /fail|delay|low|open|issue/i.test(value) ? 'danger' : /progress|booked|new|pending/i.test(value) ? 'warning' : /pass|resolved|delivered|dispatched/i.test(value) ? 'success' : 'neutral'
  return <span className={`status ${tone}`}>{value}</span>
}

function App() {
  const [data, setData] = useState(loadData)
  const [active, setActive] = useState('overview')
  const [saveError, setSaveError] = useState('')
  const [backendStatus, setBackendStatus] = useState('connecting')
  const dataRef = useRef(data)
  const changeRevision = useRef(0)
  const unsyncedChanges = useRef(false)
  const saveQueue = useRef(Promise.resolve())

  const saveRemote = useCallback((nextData) => {
    const queuedSave = saveQueue.current.catch(() => {}).then(async () => {
      const response = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextData),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Backend returned HTTP ${response.status}.`)
    })
    saveQueue.current = queuedSave
    return queuedSave
  }, [])

  const connectBackend = useCallback(async () => {
    const revisionAtStart = changeRevision.current
    try {
      const response = await fetch('/api/data')
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `Backend returned HTTP ${response.status}.`)

      if (unsyncedChanges.current || changeRevision.current !== revisionAtStart || !result.data) {
        const revisionBeforeSave = changeRevision.current
        await saveRemote(dataRef.current)
        if (changeRevision.current === revisionBeforeSave) unsyncedChanges.current = false
      } else {
        dataRef.current = result.data
        setData(result.data)
        try {
          localStorage.setItem(storeKey, JSON.stringify(result.data))
          setSaveError('')
        } catch (error) {
          console.error('Could not cache backend data in this browser.', error)
          setSaveError('Backend data loaded, but could not be cached in this browser.')
        }
      }
      setBackendStatus('connected')
    } catch (error) {
      console.error('Could not connect to the Workbench backend.', error)
      setBackendStatus('offline')
    }
  }, [saveRemote])

  useEffect(() => {
    const timer = window.setTimeout(() => void connectBackend(), 0)
    return () => window.clearTimeout(timer)
  }, [connectBackend])

  const persist = (nextData) => {
    dataRef.current = nextData
    changeRevision.current += 1
    unsyncedChanges.current = true
    setData(nextData)
    try {
      localStorage.setItem(storeKey, JSON.stringify(nextData))
      setSaveError('')
    } catch (error) {
      console.error('Could not save dashboard data in this browser.', error)
      setSaveError('Could not save changes in this browser. Check available storage and try again.')
    }
    const revisionAtSave = changeRevision.current
    void saveRemote(nextData).then(
      () => {
        if (changeRevision.current === revisionAtSave) unsyncedChanges.current = false
        setBackendStatus('connected')
      },
      (error) => {
        console.error('Could not save dashboard data to the backend.', error)
        setBackendStatus('offline')
      },
    )
  }

  const update = (key, records) => persist({ ...data, [key]: records })
  const updateMany = (changes) => persist({ ...data, ...changes })
  const module = modules.find((item) => item.id === active)
  const totalUnits = data.production.reduce((sum, item) => sum + Number(item.completed || 0), 0)
  const lowStock = data.products.filter((item) => Number(item.stock) <= Number(item.reorder)).length
  const openRepairs = data.repairs.filter((item) => !['Completed', 'Cancelled'].includes(item.status)).length
  const openClaims = data.claims.filter((item) => !['Resolved', 'Rejected'].includes(item.status)).length

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActive('overview') }}>
          <span className="brand-mark">W</span><span>workbench<small>OPERATIONS SUITE</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <button className={`nav-item ${active === 'overview' ? 'selected' : ''}`} onClick={() => setActive('overview')}>
          <span className="nav-icon">⌂</span><span>Overview</span>
        </button>
        <div className="nav-caption module-caption">YOUR MODULES</div>
        <nav className="module-nav" aria-label="Operations modules">
          {modules.map((item) => (
            <button key={item.id} className={`nav-item ${active === item.id ? 'selected' : ''}`} onClick={() => setActive(item.id)}>
              <span className="nav-icon">{item.icon}</span><span className="nav-copy">{item.name}<small>{item.subtitle}</small></span>
            </button>
          ))}
        </nav>
        <button className={`offline-card ${backendStatus}`} onClick={() => { setBackendStatus('connecting'); void connectBackend() }} disabled={backendStatus === 'connecting'}><span className="online-dot" /><span><strong>{backendStatus === 'connected' ? 'Backend connected' : backendStatus === 'connecting' ? 'Connecting to backend…' : 'Working offline'}</strong><small>{backendStatus === 'connected' ? 'Shared data saved to server' : backendStatus === 'connecting' ? 'Checking local server' : 'Saved on this device · click to retry'}</small></span></button>
        <div className="sidebar-footer">HACKATHON EDITION <span>v1.0</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {module?.name || 'Overview'}</div><div className="topbar-right"><span className="today-label">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="avatar">OP</span></div></header>
        <div className="page-content">
          {saveError && <div className="error-banner" role="alert">{saveError}</div>}
          {active === 'overview' ? <Overview data={data} metrics={{ totalUnits, lowStock, openRepairs, openClaims }} onNavigate={setActive} /> : null}
          {active === 'production' ? <Production data={data} update={update} /> : null}
          {active === 'inventory' ? <Inventory data={data} update={update} updateMany={updateMany} /> : null}
          {active === 'quality' ? <Quality data={data} update={update} /> : null}
          {active === 'repairs' ? <Repairs data={data} update={update} /> : null}
          {active === 'orders' ? <Orders data={data} update={update} /> : null}
          {active === 'warranty' ? <Warranty data={data} update={update} /> : null}
          <footer className="page-footer"><span>WORKBENCH OPERATIONS</span><span>Everything saved locally on this device</span></footer>
        </div>
      </main>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, children }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children}</div>
}

function Overview({ data, metrics, onNavigate }) {
  const cards = [
    { id: 'production', eyebrow: 'MANUFACTURING', title: 'Production today', value: `${metrics.totalUnits} units`, detail: `${data.production.length} production entries`, icon: '◫', accent: 'blue' },
    { id: 'inventory', eyebrow: 'INVENTORY', title: 'Reorder alerts', value: metrics.lowStock, detail: 'products at or below reorder level', icon: '▦', accent: 'orange' },
    { id: 'repairs', eyebrow: 'CUSTOMER SERVICE', title: 'Active repairs', value: metrics.openRepairs, detail: 'service requests in progress', icon: '⌁', accent: 'purple' },
    { id: 'warranty', eyebrow: 'CUSTOMER SUPPORT', title: 'Open claims', value: metrics.openClaims, detail: 'warranty claims to resolve', icon: '◇', accent: 'green' },
  ]
  return <>
    <PageHeading eyebrow={`${new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()} · ON THE FLOOR`} title="Good morning, Operator" description="Your operations at a glance. Pick a workspace to get started." />
    <section className="welcome-banner"><div><span className="banner-tag">YOUR OPERATIONS, CONNECTED</span><h2>One simple workspace.<br />Six ways to keep work moving.</h2><p>Track production, stock, quality and customer service—even without internet.</p></div><div className="banner-art"><div className="banner-ring" /><span>↗</span><i /><i /><i /></div></section>
    <div className="section-title"><div><h2>Today at a glance</h2><p>Your latest operational snapshot</p></div><span className="live-tag"><i /> LOCAL DATA</span></div>
    <div className="metric-grid overview-metrics">{cards.map((card) => <button className="overview-card" key={card.id} onClick={() => onNavigate(card.id)}><div className="card-top"><span className={`card-icon ${card.accent}`}>{card.icon}</span><span className="card-arrow">↗</span></div><span className="card-eyebrow">{card.eyebrow}</span><strong className="overview-value">{card.value}</strong><span className="overview-title">{card.title}</span><small>{card.detail}</small></button>)}</div>
    <div className="section-title modules-title"><div><h2>All workspaces</h2><p>Jump into any part of your operation</p></div></div>
    <div className="workspace-grid">{modules.map((item) => <button key={item.id} className="workspace-card" onClick={() => onNavigate(item.id)}><span className="workspace-icon">{item.icon}</span><span><strong>{item.name}</strong><small>{item.subtitle}</small></span><span className="card-arrow">↗</span></button>)}</div>
  </>
}

function Production({ data, update }) {
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    update('production', [{ ...values, id: newId('p'), planned: Number(values.planned), completed: Number(values.completed) }, ...data.production])
    form.reset()
  }
  const planned = data.production.reduce((sum, item) => sum + Number(item.planned), 0)
  const completed = data.production.reduce((sum, item) => sum + Number(item.completed), 0)
  const flagged = data.production.filter((item) => item.issue !== 'None' || Number(item.completed) < Number(item.planned)).length
  return <>
    <PageHeading eyebrow="MANUFACTURING · FACTORYPULSE" title="Production monitoring" description="Log daily output, compare it to plan and flag anything holding the line back." />
    <div className="metric-grid"><Metric label="Planned today" value={planned.toLocaleString()} note="units across all lines" /><Metric label="Completed" value={completed.toLocaleString()} note={planned ? `${Math.round(completed / planned * 100)}% of planned output` : 'units logged'} tone="metric-green" /><Metric label="Lines flagged" value={flagged} note="delay or quality issue" tone={flagged ? 'metric-red' : 'metric-green'} /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Record production</h2><p>Capture a shift or production line update</p></div><span className="panel-mark">01</span></div><form className="form-grid" onSubmit={submit}>
      <Field label="Production date"><input name="date" type="date" defaultValue={today} required /></Field><Field label="Production line"><input name="line" placeholder="e.g. Assembly A" required /></Field><Field label="Product"><input name="product" placeholder="e.g. Smart kettle" required /></Field><Field label="Planned units"><input name="planned" type="number" min="1" placeholder="120" required /></Field><Field label="Completed units"><input name="completed" type="number" min="0" placeholder="110" required /></Field><Field label="Flag an issue"><select name="issue" defaultValue="None"><option>None</option><option>Delay</option><option>Quality issue</option><option>Both</option></select></Field><Field label="Notes" className="wide-field"><input name="notes" placeholder="What should the next shift know?" /></Field><div className="form-actions"><button className="primary-button">Save production entry <span>→</span></button></div>
    </form></section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Production log</h2><p>Daily output and line exceptions</p></div><span className="record-count">{data.production.length} ENTRIES</span></div>{data.production.length ? <Table headers={['DATE', 'LINE / PRODUCT', 'PLAN', 'COMPLETED', 'PROGRESS', 'FLAG']}><>{data.production.map((item) => <tr key={item.id}><td>{item.date}</td><td><strong>{item.line}</strong><small className="cell-subtitle">{item.product}{item.notes ? ` · ${item.notes}` : ''}</small></td><td>{item.planned}</td><td><strong>{item.completed}</strong></td><td><div className="progress-cell"><div className="progress-track"><span style={{ width: `${Math.min(100, Math.round(item.completed / Math.max(1, item.planned) * 100))}%` }} /></div><small>{Math.round(item.completed / Math.max(1, item.planned) * 100)}%</small></div></td><td><Status>{item.issue !== 'None' ? item.issue : item.completed < item.planned ? 'Behind plan' : 'On track'}</Status></td></tr>)}</></Table> : <Empty />}</section>
  </>
}

function Inventory({ data, update, updateMany }) {
  function addProduct(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    if (data.products.some((product) => product.sku.toLowerCase() === values.sku.trim().toLowerCase())) {
      window.alert('That SKU already exists. Use a unique SKU for each product.')
      return
    }
    update('products', [{ ...values, id: newId('sku'), name: values.name.trim(), sku: values.sku.trim(), stock: Number(values.stock), reorder: Number(values.reorder), price: Number(values.price) }, ...data.products])
    form.reset()
  }
  function recordMovement(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const product = data.products.find((item) => item.id === values.productId)
    if (!product) return
    const quantity = Number(values.quantity)
    if (values.movement === 'Outgoing' && quantity > product.stock) {
      window.alert(`Only ${product.stock} units of ${product.name} are in stock.`)
      return
    }
    updateMany({
      products: data.products.map((item) => item.id === product.id ? { ...item, stock: item.stock + (values.movement === 'Incoming' ? quantity : -quantity) } : item),
      movements: [{ id: newId('m'), date: today, product: product.name, sku: product.sku, movement: values.movement, quantity }, ...data.movements],
    })
    form.reset()
  }
  const low = data.products.filter((item) => item.stock <= item.reorder)
  return <>
    <PageHeading eyebrow="INVENTORY · STOCKPILOT" title="Inventory & reorder" description="Keep stock accurate, log movements and spot products that need a reorder." />
    <div className="metric-grid"><Metric label="Products tracked" value={data.products.length} note="active catalogue items" /><Metric label="Units on hand" value={data.products.reduce((sum, item) => sum + item.stock, 0).toLocaleString()} note="across all products" /><Metric label="Low-stock alerts" value={low.length} note="at or below reorder level" tone={low.length ? 'metric-red' : 'metric-green'} /></div>
    <div className="split-panels"><section className="panel"><div className="panel-heading"><div><h2>Stock movement</h2><p>Receive new stock or record an issue</p></div></div><form className="form-grid compact-form" onSubmit={recordMovement}><Field label="Product"><select name="productId" required defaultValue=""><option value="" disabled>Select a product</option>{data.products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} on hand</option>)}</select></Field><Field label="Movement"><select name="movement"><option>Incoming</option><option>Outgoing</option></select></Field><Field label="Quantity"><input name="quantity" type="number" min="1" placeholder="10" required /></Field><div className="form-actions"><button className="primary-button">Record movement <span>→</span></button></div></form></section>
    <section className="panel"><div className="panel-heading"><div><h2>Add a product</h2><p>Set an opening balance and reorder point</p></div></div><form className="form-grid compact-form" onSubmit={addProduct}><Field label="Product name"><input name="name" placeholder="e.g. Toaster" required /></Field><Field label="SKU"><input name="sku" placeholder="TS-400" required /></Field><Field label="Opening stock"><input name="stock" type="number" min="0" placeholder="20" required /></Field><Field label="Reorder level"><input name="reorder" type="number" min="0" placeholder="10" required /></Field><Field label="Unit price (₹)"><input name="price" type="number" min="0" placeholder="1999" required /></Field><div className="form-actions"><button className="secondary-button">Add to catalogue <span>+</span></button></div></form></section></div>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Product stock</h2><p>Current availability and reorder thresholds</p></div><span className={`record-count ${low.length ? 'alert-count' : ''}`}>{low.length} LOW STOCK</span></div>{data.products.length ? <Table headers={['PRODUCT', 'SKU', 'ON HAND', 'REORDER AT', 'UNIT PRICE', 'STOCK STATUS']}><>{data.products.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.sku}</td><td><strong>{item.stock}</strong></td><td>{item.reorder}</td><td>{money(item.price)}</td><td><Status>{item.stock <= item.reorder ? 'Reorder' : 'In stock'}</Status></td></tr>)}</></Table> : <Empty>No products yet. Add a product to get started.</Empty>}</section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Stock movement history</h2><p>Incoming receipts and outgoing stock issues</p></div><span className="record-count">{data.movements.length} MOVEMENTS</span></div>{data.movements.length ? <Table headers={['DATE', 'PRODUCT', 'SKU', 'MOVEMENT', 'QUANTITY']}><>{data.movements.map((item) => <tr key={item.id}><td>{item.date}</td><td><strong>{item.product}</strong></td><td>{item.sku}</td><td><Status>{item.movement}</Status></td><td><strong>{item.quantity}</strong></td></tr>)}</></Table> : <Empty>No movements recorded yet. Use Stock movement above to log incoming or outgoing items.</Empty>}</section>
  </>
}

function Quality({ data, update }) {
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    update('inspections', [{ ...values, id: newId('q'), defects: Number(values.defects) }, ...data.inspections])
    form.reset()
  }
  function setActionStatus(id, actionStatus) {
    update('inspections', data.inspections.map((item) => item.id === id ? { ...item, actionStatus } : item))
  }
  const failed = data.inspections.filter((item) => item.result === 'Fail').length
  const actionsOpen = data.inspections.filter((item) => item.action && item.actionStatus !== 'Resolved').length
  return <>
    <PageHeading eyebrow="QUALITY · QUALITYCHECK" title="Product inspections" description="Record inspection results, report defects and keep corrective actions moving." />
    <div className="metric-grid"><Metric label="Inspections logged" value={data.inspections.length} note="all recorded batches" /><Metric label="Failed inspections" value={failed} note="batches that need attention" tone={failed ? 'metric-red' : 'metric-green'} /><Metric label="Actions in progress" value={actionsOpen} note="corrective actions to close" tone={actionsOpen ? 'metric-orange' : 'metric-green'} /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Log an inspection</h2><p>Record batch results and assign corrective action</p></div></div><form className="form-grid" onSubmit={submit}><Field label="Inspection date"><input name="date" type="date" defaultValue={today} required /></Field><Field label="Product"><input name="product" placeholder="e.g. Air purifier" required /></Field><Field label="Batch / lot number"><input name="batch" placeholder="AP-2408" required /></Field><Field label="Inspector"><input name="inspector" placeholder="Inspector name" required /></Field><Field label="Result"><select name="result"><option>Pass</option><option>Fail</option></select></Field><Field label="Defects found"><input name="defects" type="number" min="0" defaultValue="0" required /></Field><Field label="Inspection notes" className="wide-field"><input name="notes" placeholder="Describe findings or defect details" /></Field><Field label="Corrective action" className="wide-field"><input name="action" placeholder="Action owner / next step, if required" /></Field><div className="form-actions"><button className="primary-button">Save inspection <span>→</span></button></div></form></section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Inspection records</h2><p>Results, defect notes and corrective-action status</p></div><span className="record-count">{data.inspections.length} RECORDS</span></div>{data.inspections.length ? <Table headers={['DATE / BATCH', 'PRODUCT', 'INSPECTOR', 'RESULT', 'DEFECTS / NOTES', 'CORRECTIVE ACTION']}><>{data.inspections.map((item) => <tr key={item.id}><td>{item.date}<small className="cell-subtitle">{item.batch}</small></td><td><strong>{item.product}</strong></td><td>{item.inspector}</td><td><Status>{item.result}</Status></td><td>{item.defects}{item.notes && <small className="cell-subtitle">{item.notes}</small>}</td><td>{item.action ? <><small className="action-text">{item.action}</small><select className="inline-select" aria-label={`Corrective action status for ${item.batch}`} value={item.actionStatus} onChange={(event) => setActionStatus(item.id, event.target.value)}><option>Open</option><option>In progress</option><option>Resolved</option></select></> : '—'}</td></tr>)}</></Table> : <Empty />}</section>
  </>
}

function Repairs({ data, update }) {
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    update('repairs', [{ ...values, id: newId('s'), estimate: Number(values.estimate), status: 'New request' }, ...data.repairs])
    form.reset()
  }
  function setStatus(id, status) {
    update('repairs', data.repairs.map((item) => item.id === id ? { ...item, status } : item))
  }
  const pendingEstimate = data.repairs.filter((item) => !['Completed', 'Cancelled'].includes(item.status)).reduce((sum, item) => sum + item.estimate, 0)
  return <>
    <PageHeading eyebrow="CUSTOMER SERVICE · SERVICEPRO" title="Appliance repairs" description="Register customer complaints, book visits, share estimates and follow each repair." />
    <div className="metric-grid"><Metric label="Active requests" value={data.repairs.filter((item) => !['Completed', 'Cancelled'].includes(item.status)).length} note="not yet completed" /><Metric label="Visits booked" value={data.repairs.filter((item) => item.status === 'Visit booked').length} note="upcoming service visits" /><Metric label="Open estimates" value={money(pendingEstimate)} note="estimated active repair value" /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Register a service request</h2><p>Capture the complaint and schedule a service visit</p></div></div><form className="form-grid" onSubmit={submit}><Field label="Customer name"><input name="customer" placeholder="Customer name" required /></Field><Field label="Phone number"><input name="phone" type="tel" placeholder="Mobile number" required /></Field><Field label="Appliance"><input name="appliance" placeholder="e.g. Mixer grinder" required /></Field><Field label="Preferred visit date"><input name="visit" type="date" defaultValue={today} required /></Field><Field label="Repair estimate (₹)"><input name="estimate" type="number" min="0" placeholder="850" required /></Field><Field label="Complaint" className="wide-field"><input name="issue" placeholder="Describe the issue reported by the customer" required /></Field><div className="form-actions"><button className="primary-button">Create service request <span>→</span></button></div></form></section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Service requests</h2><p>Customer updates and repair progress</p></div><span className="record-count">{data.repairs.length} REQUESTS</span></div>{data.repairs.length ? <Table headers={['CUSTOMER', 'APPLIANCE / COMPLAINT', 'VISIT', 'ESTIMATE', 'STATUS']}><>{data.repairs.map((item) => <tr key={item.id}><td><strong>{item.customer}</strong><small className="cell-subtitle">{item.phone}</small></td><td><strong>{item.appliance}</strong><small className="cell-subtitle">{item.issue}</small></td><td>{item.visit}</td><td>{money(item.estimate)}</td><td><select className="inline-select" aria-label={`Service status for ${item.customer}`} value={item.status} onChange={(event) => setStatus(item.id, event.target.value)}><option>New request</option><option>Visit booked</option><option>Diagnosing</option><option>Estimate shared</option><option>Repair in progress</option><option>Completed</option><option>Cancelled</option></select></td></tr>)}</></Table> : <Empty />}</section>
  </>
}

function Orders({ data, update }) {
  function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const product = data.products.find((item) => item.id === values.productId)
    if (!product) return
    const quantity = Number(values.quantity)
    update('orders', [{ id: newId('o'), retailer: values.retailer, product: product.name, quantity, total: product.price * quantity, date: today, status: 'New order' }, ...data.orders])
    form.reset()
  }
  function setStatus(id, status) {
    update('orders', data.orders.map((item) => item.id === id ? { ...item, status } : item))
  }
  const totalValue = data.orders.reduce((sum, item) => sum + item.total, 0)
  return <>
    <PageHeading eyebrow="DISTRIBUTION · ORDERDESK" title="Distributor orders" description="Browse your product catalogue, place bulk orders, follow fulfilment and review invoices." />
    <div className="metric-grid"><Metric label="Orders placed" value={data.orders.length} note="all-time orders" /><Metric label="Order value" value={money(totalValue)} note="total order value" /><Metric label="Catalogue items" value={data.products.length} note="available to order" /></div>
    <section className="panel"><div className="panel-heading"><div><h2>Place a retailer order</h2><p>Choose a catalogue item and enter the bulk quantity</p></div></div>{data.products.length ? <form className="form-grid" onSubmit={submit}><Field label="Retailer / business"><input name="retailer" placeholder="Retailer name" required /></Field><Field label="Product catalogue"><select name="productId" required defaultValue=""><option value="" disabled>Select a product</option>{data.products.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price)} each</option>)}</select></Field><Field label="Bulk quantity"><input name="quantity" type="number" min="1" placeholder="12" required /></Field><div className="form-actions"><button className="primary-button">Place order <span>→</span></button></div></form> : <Empty>No products in the catalogue. Add products in StockPilot first.</Empty>}</section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Orders & invoices</h2><p>Order status, quantities and invoice totals</p></div><span className="record-count">{data.orders.length} ORDERS</span></div>{data.orders.length ? <Table headers={['ORDER', 'RETAILER', 'PRODUCT', 'QUANTITY', 'INVOICE TOTAL', 'ORDER STATUS']}><>{data.orders.map((item) => <tr key={item.id}><td><strong>{item.id.slice(0, 10).toUpperCase()}</strong><small className="cell-subtitle">{item.date}</small></td><td>{item.retailer}</td><td>{item.product}</td><td>{item.quantity}</td><td><strong>{money(item.total)}</strong></td><td><select className="inline-select" aria-label={`Order status for ${item.retailer}`} value={item.status} onChange={(event) => setStatus(item.id, event.target.value)}><option>New order</option><option>Confirmed</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select></td></tr>)}</></Table> : <Empty />}</section>
  </>
}

function Warranty({ data, update }) {
  function register(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    if (data.warranties.some((item) => item.serial.toLowerCase() === values.serial.trim().toLowerCase())) {
      window.alert('That serial number is already registered.')
      return
    }
    update('warranties', [{ ...values, id: newId('w'), customer: values.customer.trim(), serial: values.serial.trim(), months: Number(values.months) }, ...data.warranties])
    form.reset()
  }
  function submitClaim(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const warranty = data.warranties.find((item) => item.id === values.warrantyId)
    if (!warranty) return
    update('claims', [{ id: newId('c'), warrantyId: warranty.id, customer: warranty.customer, product: warranty.product, serial: warranty.serial, issue: values.issue, date: today, status: 'Open' }, ...data.claims])
    form.reset()
  }
  function setClaimStatus(id, status) {
    update('claims', data.claims.map((item) => item.id === id ? { ...item, status } : item))
  }
  const covered = (item) => {
    const expiry = new Date(item.purchaseDate)
    expiry.setMonth(expiry.getMonth() + item.months)
    return expiry >= new Date(`${today}T00:00:00`)
  }
  return <>
    <PageHeading eyebrow="CUSTOMER SUPPORT · WARRANTYHUB" title="Product warranty" description="Register purchases, keep warranty details on hand and follow customer support claims." />
    <div className="metric-grid"><Metric label="Products registered" value={data.warranties.length} note="customer product records" /><Metric label="Active warranties" value={data.warranties.filter(covered).length} note="within their coverage period" tone="metric-green" /><Metric label="Open support claims" value={data.claims.filter((item) => !['Resolved', 'Rejected'].includes(item.status)).length} note="claims needing follow-up" /></div>
    <div className="split-panels"><section className="panel"><div className="panel-heading"><div><h2>Register a product</h2><p>Save purchase and warranty coverage details</p></div></div><form className="form-grid compact-form" onSubmit={register}><Field label="Customer name"><input name="customer" placeholder="Customer name" required /></Field><Field label="Product"><input name="product" placeholder="e.g. Air purifier" required /></Field><Field label="Serial number"><input name="serial" placeholder="AP-88291" required /></Field><Field label="Purchase date"><input name="purchaseDate" type="date" defaultValue={today} required /></Field><Field label="Warranty (months)"><input name="months" type="number" min="1" defaultValue="12" required /></Field><div className="form-actions"><button className="primary-button">Register product <span>→</span></button></div></form></section>
    <section className="panel"><div className="panel-heading"><div><h2>Raise a service claim</h2><p>Link a support request to a registered product</p></div></div>{data.warranties.length ? <form className="form-grid compact-form" onSubmit={submitClaim}><Field label="Registered product" className="wide-field"><select name="warrantyId" required defaultValue=""><option value="" disabled>Choose customer / product / serial</option>{data.warranties.map((item) => <option key={item.id} value={item.id}>{item.customer} · {item.product} · {item.serial}</option>)}</select></Field><Field label="Issue or claim details" className="wide-field"><textarea name="issue" rows="3" placeholder="Describe the support needed" required /></Field><div className="form-actions"><button className="secondary-button">Submit support claim <span>→</span></button></div></form> : <Empty>Register a product before raising a warranty claim.</Empty>}</section></div>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Registered products</h2><p>Purchase date, coverage period and claim eligibility</p></div><span className="record-count">{data.warranties.length} PRODUCTS</span></div>{data.warranties.length ? <Table headers={['CUSTOMER', 'PRODUCT', 'SERIAL', 'PURCHASED', 'COVERAGE', 'WARRANTY']}><>{data.warranties.map((item) => <tr key={item.id}><td><strong>{item.customer}</strong></td><td>{item.product}</td><td>{item.serial}</td><td>{item.purchaseDate}</td><td>{item.months} months</td><td><Status>{covered(item) ? 'Active' : 'Expired'}</Status></td></tr>)}</></Table> : <Empty />}</section>
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Support claims</h2><p>Customer requests and repair progress</p></div><span className="record-count">{data.claims.length} CLAIMS</span></div>{data.claims.length ? <Table headers={['CLAIM', 'CUSTOMER / PRODUCT', 'SERIAL', 'ISSUE', 'DATE', 'STATUS']}><>{data.claims.map((item) => <tr key={item.id}><td><strong>{item.id.slice(0, 10).toUpperCase()}</strong></td><td>{item.customer}<small className="cell-subtitle">{item.product}</small></td><td>{item.serial}</td><td>{item.issue}</td><td>{item.date}</td><td><select className="inline-select" aria-label={`Claim status for ${item.customer}`} value={item.status} onChange={(event) => setClaimStatus(item.id, event.target.value)}><option>Open</option><option>Under review</option><option>Repair in progress</option><option>Resolved</option><option>Rejected</option></select></td></tr>)}</></Table> : <Empty>No claims yet. Submit a support claim above.</Empty>}</section>
  </>
}

export default App
