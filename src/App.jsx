import { useEffect, useState } from 'react'
import { supabase as sb } from './supabase'
import PieCharts from './PieCharts'
import Reports from './Reports'

const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const today = () => new Date().toISOString().slice(0, 10)
const PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/
const NEXT = { Draft: 'Quotation', Quotation: 'Confirmed', Confirmed: 'Active', Active: 'Closed' }
const TABS = {
  admin: [['dash', 'Dashboard'], ['subs', 'Subscriptions'], ['inv', 'Invoices'], ['rep', 'Reports'], ['prod', 'Products & Plans'], ['disc', 'Discounts'], ['staff', 'Staff'], ['act', 'Audit & Activity']],
  staff: [['dash', 'Dashboard'], ['subs', 'Subscriptions'], ['inv', 'Invoices']],
  customer: [['subs', 'My Subscriptions'], ['inv', 'My Invoices']],
}

function useQ(fn, dep = []) {
  const [d, setD] = useState([]); const [k, setK] = useState(0)
  useEffect(() => { fn().then(r => setD(r.data || [])) }, [k, ...dep])
  return [d, () => setK(x => x + 1)]
}
const Badge = ({ t }) => <span className={'b ' + t}>{t}</span>
const Table = ({ head, rows }) => (
  <div className="tw"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
)

function Login() {
  const [m, setM] = useState('login'), [e, setE] = useState(''), [p, setP] = useState(''), [n, setN] = useState(''), [msg, setMsg] = useState('')
  async function go(ev) {
    ev.preventDefault(); setMsg('')
    if (m === 'login') { const { error } = await sb.auth.signInWithPassword({ email: e, password: p }); if (error) setMsg(error.message) }
    else if (m === 'signup') {
      if (!PW.test(p)) return setMsg('Password needs 9+ characters with an uppercase, a lowercase and a special character.')
      const { error } = await sb.auth.signUp({ email: e, password: p, options: { data: { full_name: n } } })
      setMsg(error ? error.message : 'Account created. If email confirmation is on, confirm first, then log in.')
    } else {
      const { error } = await sb.auth.resetPasswordForEmail(e, { redirectTo: window.location.origin })
      setMsg(error ? error.message : 'Reset link sent to your registered email.')
    }
  }
  return (
    <div className="auth">
      <div className="auth-side">
        <div className="auth-brand"><span className="auth-logo">B</span>Brightloop</div>
        <div>
          <h1>Subscription billing, made simple.</h1>
          <p>Manage products, plans, invoices and payments in one secure platform.</p>
          <ul>
            <li>Automated recurring invoicing with GST</li>
            <li>Discounts, quotations and payment tracking</li>
            <li>Role-based access for admin, staff and customers</li>
          </ul>
        </div>
        <small>© 2026 Brightloop Software</small>
      </div>
      <div className="auth-main">
        <form className="auth-form" onSubmit={go}>
          <h2>{m === 'login' ? 'Welcome back' : m === 'signup' ? 'Create your account' : 'Reset your password'}</h2>
          <p className="auth-sub">{m === 'login' ? 'Sign in to your Brightloop account.' : m === 'signup' ? 'Register to manage your subscriptions.' : 'Enter your email and we will send a reset link.'}</p>
          {m === 'signup' && <><label>Full name</label><input placeholder="Your full name" value={n} onChange={x => setN(x.target.value)} required /></>}
          <label>Email</label>
          <input type="email" placeholder="name@company.com" value={e} onChange={x => setE(x.target.value)} required />
          {m !== 'reset' && <><label>Password</label><input type="password" placeholder="Enter your password" value={p} onChange={x => setP(x.target.value)} required /></>}
          <div className="err">{msg}</div>
          <button className="btn auth-btn">{m === 'login' ? 'Log in' : m === 'signup' ? 'Create account' : 'Send reset link'}</button>
          <div className="auth-links">
            <a href="#" onClick={x => { x.preventDefault(); setM(m === 'login' ? 'signup' : 'login') }}>{m === 'login' ? 'Create an account' : 'Back to login'}</a>
            <a href="#" onClick={x => { x.preventDefault(); setM('reset') }}>Forgot password?</a>
          </div>
        </form>
      </div>
    </div>
  )
}

function NewPassword({ done }) {
  const [p, setP] = useState(''), [msg, setMsg] = useState('')
  async function go(ev) {
    ev.preventDefault()
    if (!PW.test(p)) return setMsg('Password needs 9+ characters with an uppercase, a lowercase and a special character.')
    const { error } = await sb.auth.updateUser({ password: p }); if (error) setMsg(error.message); else done()
  }
  return <form className="card login" onSubmit={go}><h3>Set a new password</h3><input type="password" value={p} onChange={e => setP(e.target.value)} /><div className="err">{msg}</div><button className="btn">Save</button></form>
}

function Dash({ role }) {
  const [risk] = useQ(() => sb.rpc('churn_risk'))
  const [s, setS] = useState({})
  const [od] = useQ(() => sb.from('invoices').select('number,due_date,total,paid,profiles(email)').eq('status', 'Confirmed').lt('due_date', today()).order('due_date').limit(10))
  useEffect(() => { sb.rpc('dashboard_stats').then(({ data }) => setS(data || {})) }, [])
  const k = [['Active subscriptions', s.active], ['MRR', inr(s.mrr)], ['ARR', inr(s.mrr * 12)], ['Collected', inr(s.collected)], ['Outstanding', inr(s.outstanding)], ['Overdue invoices', s.overdue]]
  return <>
    <div className="ph"><h2>Dashboard Overview</h2><span className="chip">Live data</span></div>
    <div className="grid">{k.map(x => <div className="card kpi" key={x[0]}><span>{x[0]}</span><b>{x[1] ?? 0}</b></div>)}</div>
    <PieCharts />
    <div className="card"><div className="ct">Overdue invoices</div><Table head={['Invoice', 'Customer', 'Due', 'Balance']} rows={od.map(i => [i.number, i.profiles?.email, i.due_date, inr(i.total - i.paid)])} /></div>
    <div className="card"><div className="ct">Customers at risk</div>
      {risk.length === 0 ? <p style={{ color: 'var(--mu)' }}>No customers at risk right now.</p> :
        <Table head={['Customer', 'Risk', 'Score', 'Overdue', 'Why']}
          rows={risk.map(r => [r.full_name || r.email, <Badge t={r.level} />, r.score, inr(r.overdue_amount), r.reasons])} />}</div>
    <FloatChat role={role} />
  </>
}

function Subs({ role }) {
  const staff = role !== 'customer'
  const [rows, reload] = useQ(() => sb.from('subscriptions').select('*,profiles(email),plans(name,product_id),variants(name)').order('id', { ascending: false }).limit(100))
  const [custs] = useQ(() => staff ? sb.from('profiles').select('id,email').eq('role', 'customer') : Promise.resolve({ data: [] }))
  const [plans] = useQ(() => sb.from('plans').select('*'))
  const [vars] = useQ(() => sb.from('variants').select('*'))
  const [discs] = useQ(() => staff ? sb.from('discounts').select('id,code') : Promise.resolve({ data: [] }))
  const [tpls] = useQ(() => sb.from('quote_templates').select('*'))
  const [tl, setTl] = useState(null)
  async function showTl(s) {
    setTl({ number: s.number, rows: null })
    const { data, error } = await sb.rpc('subscription_timeline', { sid: s.id })
    if (error) { setTl(null); return alert(error.message) }
    setTl({ number: s.number, rows: data || [] })
  }
  const [f, setF] = useState({ qty: 1 })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  async function add(ev) {
    ev.preventDefault()
    const pl = plans.find(p => p.id == f.plan_id); if (!pl || !f.customer) return alert('Pick a customer and plan')
    if (+f.qty < pl.min_qty) return alert('Minimum quantity for this plan is ' + pl.min_qty)
    const start = f.start || today(), exp = new Date(start); exp.setFullYear(exp.getFullYear() + 1)
    const { error } = await sb.from('subscriptions').insert({ customer_id: f.customer, plan_id: pl.id, variant_id: f.variant ? +f.variant : null, qty: +f.qty, start_date: start, next_billing: start, expiry_date: exp.toISOString().slice(0, 10), terms: f.terms || 'Net 15', discount_id: f.discount ? +f.discount : null })
    error ? alert(error.message) : reload()
  }
  async function adv(s) { const { error } = await sb.from('subscriptions').update({ status: NEXT[s.status] }).eq('id', s.id); error ? alert(error.message) : reload() }
  const useTpl = id => { const t = tpls.find(x => x.id == id); if (t) setF(x => ({ ...x, plan_id: t.plan_id, qty: t.qty })) }
  const pvars = vars.filter(v => { const pl = plans.find(p => p.id == f.plan_id); return pl && v.product_id === pl.product_id })
  return <>
    {staff && <form className="card" onSubmit={add}><b>New subscription</b><div className="row" style={{ marginTop: 8 }}>
      <select onChange={e => useTpl(e.target.value)} defaultValue=""><option value="">Quotation template…</option>{tpls.map(t => <option key={t.id} value={t.id}>{t.name} (valid {t.valid_days}d)</option>)}</select>
      <select value={f.customer || ''} onChange={e => set('customer', e.target.value)}><option value="">Customer…</option>{custs.map(c => <option key={c.id} value={c.id}>{c.email}</option>)}</select>
      <select value={f.plan_id || ''} onChange={e => set('plan_id', e.target.value)}><option value="">Plan…</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} · {inr(p.price)}/{p.cycle}</option>)}</select>
      <select value={f.variant || ''} onChange={e => set('variant', e.target.value)}><option value="">Variant…</option>{pvars.map(v => <option key={v.id} value={v.id}>{v.name}{v.extra > 0 ? ' +' + v.extra : ''}</option>)}</select>
      <input type="number" min="1" value={f.qty} onChange={e => set('qty', e.target.value)} style={{ width: 80 }} />
      <input type="date" onChange={e => set('start', e.target.value)} />
      <select onChange={e => set('discount', e.target.value)}><option value="">No discount</option>{discs.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}</select>
      <button className="btn">Create</button></div></form>}
    <div className="card"><Table head={['No.', 'Customer', 'Plan', 'Variant', 'Qty', 'Next bill', 'Status', '']}
      rows={rows.map(s => [s.number, s.profiles?.email, s.plans?.name, s.variants?.name || '-', s.qty, s.next_billing, <Badge t={s.status} />, <>{staff && NEXT[s.status] ? <button className="btn s" onClick={() => adv(s)}>→ {NEXT[s.status]}</button> : ''} <button className="btn g s" onClick={() => showTl(s)}>Timeline</button></>])} /></div>
    {tl && <div className="card">
      <div className="row"><div className="ct" style={{ margin: 0 }}>Timeline: {tl.number}</div><button className="btn g s" onClick={() => setTl(null)}>Close</button></div>
      {tl.rows === null ? <p style={{ color: 'var(--mu)' }}>Loading…</p> : tl.rows.length === 0 ? <p style={{ color: 'var(--mu)' }}>No history yet.</p> :
        <Table head={['When', 'Event', 'Details']} rows={tl.rows.map(r => {
          const d = new Date(r.ev_time)
          const dayOnly = ['Start', 'Invoice', 'Payment', 'Upcoming'].includes(r.ev_type)
          return [dayOnly ? d.toLocaleDateString('en-IN') : d.toLocaleString('en-IN'), r.ev_type, r.ev_detail]
        })} />}
    </div>}
  </>
}

function Invoices({ role }) {
  const staff = role !== 'customer'
  const [page, setPage] = useState(0), [flt, setFlt] = useState('')
  const [rows, reload] = useQ(() => {
    let q = sb.from('invoices').select('*,profiles(email)').order('id', { ascending: false }).range(page * 25, page * 25 + 24)
    if (flt === 'Overdue') q = q.eq('status', 'Confirmed').lt('due_date', today()); else if (flt) q = q.eq('status', flt)
    return q
  }, [page, flt])
  async function gen() { const { data, error } = await sb.rpc('generate_due_invoices'); error ? alert(error.message) : alert(data + ' invoice(s) generated'); reload() }
  async function pay(i) {
    const a = parseFloat(prompt(i.number + ' balance ' + (i.total - i.paid) + '. Amount received?', i.total - i.paid)); if (!a) return
    const m = prompt('Method (UPI / Card / Bank transfer / Cash)', 'UPI') || 'UPI'
    const { error } = await sb.rpc('record_payment', { inv: i.id, m, amt: a, nt: prompt('Note', '') || '' }); error ? alert(error.message) : reload()
  }
  const st = i => i.status === 'Confirmed' && i.due_date < today() ? 'Overdue' : i.status
  return <>
    <div className="row">{staff && <button className="btn" onClick={gen}>Generate due invoices</button>}
      <select value={flt} onChange={e => { setFlt(e.target.value); setPage(0) }}><option value="">All</option><option>Confirmed</option><option>Paid</option><option>Overdue</option></select>
      <button className="btn g s" disabled={!page} onClick={() => setPage(page - 1)}>Prev</button><span>Page {page + 1}</span><button className="btn g s" disabled={rows.length < 25} onClick={() => setPage(page + 1)}>Next</button></div>
    <div className="card"><Table head={['Invoice', 'Customer', 'Period', 'Subtotal', 'Discount', 'GST', 'Total', 'Balance', 'Status', '']}
      rows={rows.map(i => [i.number, i.profiles?.email, i.period_start, inr(i.subtotal), inr(i.discount), inr(i.tax), inr(i.total), inr(i.total - i.paid), <Badge t={st(i)} />,
        staff && i.status !== 'Paid' ? <button className="btn s" onClick={() => pay(i)}>Record payment</button> : <button className="btn g s" onClick={() => window.print()}>Print</button>])} /></div>
  </>
}

function Prod() {
  const [prods, r1] = useQ(() => sb.from('products').select('*,variants(name,extra)'))
  const [plans, r2] = useQ(() => sb.from('plans').select('*,products(name)'))
  const [p, setP] = useState({}), [l, setL] = useState({ cycle: 'monthly', min_qty: 1 }), [t, setT] = useState({ qty: 1, valid_days: 15 })
  async function addP(ev) {
    ev.preventDefault()
    const { data, error } = await sb.from('products').insert({ name: p.name, type: p.type || 'Software', sales_price: +p.sp || 0, cost_price: +p.cp || 0, notes: p.notes }).select().single()
    if (error) return alert(error.message)
    const vs = [{ product_id: data.id, name: 'Standard', extra: 0 }]
    ;(p.vars || '').split(',').forEach(x => { const [a, b] = x.split(':'); if (a && a.trim()) vs.push({ product_id: data.id, name: a.trim(), extra: +b || 0 }) })
    await sb.from('variants').insert(vs); setP({}); r1()
  }
  async function addL(ev) {
    ev.preventDefault()
    const { error } = await sb.from('plans').insert({ product_id: +l.product_id, name: l.name, price: +l.price, cycle: l.cycle, min_qty: +l.min_qty, available_from: l.from || today(), available_to: l.to || null, auto_close: !!l.auto })
    error ? alert(error.message) : r2()
  }
  async function addT(ev) { ev.preventDefault(); const { error } = await sb.from('quote_templates').insert({ name: t.name, plan_id: +t.plan_id, qty: +t.qty, valid_days: +t.valid_days }); error ? alert(error.message) : alert('Template saved') }
  return <>
    <form className="card" onSubmit={addP}><b>Add product</b><div className="row" style={{ marginTop: 8 }}>
      <input placeholder="Name" value={p.name || ''} onChange={e => setP({ ...p, name: e.target.value })} required />
      <input placeholder="Type" onChange={e => setP({ ...p, type: e.target.value })} />
      <input type="number" placeholder="Sales price" onChange={e => setP({ ...p, sp: e.target.value })} />
      <input type="number" placeholder="Cost price" onChange={e => setP({ ...p, cp: e.target.value })} />
      <input placeholder="Variants e.g. Odoo:560, SAP:300" onChange={e => setP({ ...p, vars: e.target.value })} />
      <input placeholder="Notes" onChange={e => setP({ ...p, notes: e.target.value })} /><button className="btn">Add</button></div></form>
    <div className="card"><Table head={['Product', 'Type', 'Price', 'Cost', 'Variants']} rows={prods.map(x => [x.name, x.type, inr(x.sales_price), inr(x.cost_price), x.variants.map(v => v.name + (v.extra > 0 ? ' +' + v.extra : '')).join(', ')])} /></div>
    <form className="card" onSubmit={addL}><b>Add plan</b><div className="row" style={{ marginTop: 8 }}>
      <select required onChange={e => setL({ ...l, product_id: e.target.value })}><option value="">Product…</option>{prods.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <input placeholder="Plan name" required onChange={e => setL({ ...l, name: e.target.value })} />
      <input type="number" placeholder="Price" required onChange={e => setL({ ...l, price: e.target.value })} />
      <select value={l.cycle} onChange={e => setL({ ...l, cycle: e.target.value })}><option>daily</option><option>weekly</option><option>monthly</option><option>yearly</option></select>
      <input type="number" min="1" style={{ width: 90 }} placeholder="Min qty" value={l.min_qty} onChange={e => setL({ ...l, min_qty: e.target.value })} />
      <input type="date" onChange={e => setL({ ...l, from: e.target.value })} /><input type="date" onChange={e => setL({ ...l, to: e.target.value })} />
      <label><input type="checkbox" onChange={e => setL({ ...l, auto: e.target.checked })} /> Auto-close at end date</label><button className="btn">Add</button></div></form>
    <div className="card"><Table head={['Plan', 'Product', 'Price', 'Cycle', 'Min qty', 'Available', 'Auto-close']} rows={plans.map(x => [x.name, x.products?.name, inr(x.price), x.cycle, x.min_qty, (x.available_from || '') + ' → ' + (x.available_to || 'open'), x.auto_close ? 'Yes' : 'Manual'])} /></div>
    <form className="card" onSubmit={addT}><b>Quotation template</b><div className="row" style={{ marginTop: 8 }}>
      <input placeholder="Template name" required onChange={e => setT({ ...t, name: e.target.value })} />
      <select required onChange={e => setT({ ...t, plan_id: e.target.value })}><option value="">Plan…</option>{plans.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <input type="number" style={{ width: 80 }} value={t.qty} onChange={e => setT({ ...t, qty: e.target.value })} />
      <input type="number" style={{ width: 90 }} value={t.valid_days} onChange={e => setT({ ...t, valid_days: e.target.value })} /> days valid<button className="btn">Save</button></div></form>
  </>
}

function Disc() {
  const [rows, reload] = useQ(() => sb.from('discounts').select('*').order('id', { ascending: false }))
  const [d, setD] = useState({ kind: 'percent', min_qty: 1 })
  async function add(ev) {
    ev.preventDefault()
    const { error } = await sb.from('discounts').insert({ code: d.code.toUpperCase(), kind: d.kind, value: +d.value, min_qty: +d.min_qty, min_amount: +d.min_amount || 0, starts_on: d.from || today(), ends_on: d.to || null, max_uses: d.max ? +d.max : null })
    error ? alert(error.message) : reload()
  }
  return <>
    <form className="card" onSubmit={add}><b>New discount rule</b><div className="row" style={{ marginTop: 8 }}>
      <input placeholder="Code" required onChange={e => setD({ ...d, code: e.target.value })} />
      <select onChange={e => setD({ ...d, kind: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></select>
      <input type="number" placeholder="Value" required onChange={e => setD({ ...d, value: e.target.value })} />
      <input type="number" placeholder="Min qty" onChange={e => setD({ ...d, min_qty: e.target.value })} />
      <input type="number" placeholder="Min purchase" onChange={e => setD({ ...d, min_amount: e.target.value })} />
      <input type="number" placeholder="Max uses" onChange={e => setD({ ...d, max: e.target.value })} />
      <input type="date" onChange={e => setD({ ...d, from: e.target.value })} /><input type="date" onChange={e => setD({ ...d, to: e.target.value })} /><button className="btn">Create</button></div>
      <small>Attach a rule to a subscription when creating it. It appears on the next invoice and stops when it expires or runs out.</small></form>
    <div className="card"><Table head={['Code', 'Type', 'Value', 'Min qty', 'Min purchase', 'Used / limit', 'Valid']} rows={rows.map(x => [x.code, x.kind, x.kind === 'percent' ? x.value + '%' : inr(x.value), x.min_qty, inr(x.min_amount), x.used + ' / ' + (x.max_uses ?? '∞'), (x.starts_on || '') + ' → ' + (x.ends_on || 'open')])} /></div>
  </>
}

function Activity() {
  const [rows, reload] = useQ(() => sb.from('audit_log').select('*').order('id', { ascending: false }).limit(50))
  return <>
    <div className="ph"><h2>Audit & Activity</h2><button className="btn g s" onClick={reload}>Refresh</button></div>
    <div className="card"><Table head={['When', 'Who', 'Role', 'Action', 'Details']}
      rows={rows.map(r => [new Date(r.at).toLocaleString('en-IN'), r.actor_email, r.actor_role, r.action, r.detail || ''])} />
      {rows.length === 0 && <p style={{ color: 'var(--mu)' }}>No activity yet.</p>}</div>
  </>
}

const SUGGEST = ['Which customers have overdue invoices?', 'Which subscriptions generate the most revenue?', 'How much revenue could we lose from cancellations?', 'Which plans perform poorly?', 'How much money is collected?']

function Assistant() {
  const [msgs, setMsgs] = useState([{ who: 'bot', title: 'Revenue Intelligence Assistant', summary: 'Ask me about your revenue, overdue invoices, plans or cancellation risk. I answer from your live data.', head: [], rows: [] }])
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false)
  async function ask(text) {
    const t = (text || '').trim(); if (!t || busy) return
    setQ(''); setBusy(true)
    setMsgs(m => [...m, { who: 'me', summary: t }])
    const { data, error } = await sb.rpc('ask_assistant', { q: t })
    setMsgs(m => [...m, error ? { who: 'bot', title: 'Sorry', summary: error.message, head: [], rows: [] } : { who: 'bot', ...data }])
    setBusy(false)
  }
  return <>
    <div className="ph"><h2>Revenue Assistant</h2></div>
    <div className="card chat">
      <div className="chat-log">
        {msgs.map((m, i) => m.who === 'me'
          ? <div key={i} className="msg me">{m.summary}</div>
          : <div key={i} className="msg bot">
              <b>{m.title}</b><p>{m.summary}</p>
              {m.head && m.head.length > 0 && m.rows && m.rows.length > 0 && <Table head={m.head} rows={m.rows} />}
              {m.head && m.head.length > 0 && m.rows && m.rows.length === 0 && <p style={{ color: 'var(--mu)' }}>No matching records.</p>}
            </div>)}
        {busy && <div className="msg bot">Thinking…</div>}
      </div>
      <div className="chips">{SUGGEST.map(s => <button key={s} className="btn g s" disabled={busy} onClick={() => ask(s)}>{s}</button>)}</div>
      <div className="row" style={{ marginTop: 10, marginBottom: 0 }}>
        <input style={{ flex: 1, minWidth: 200 }} placeholder="Ask a question, e.g. who has overdue invoices?" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask(q) } }} />
        <button className="btn" disabled={busy} onClick={() => ask(q)}>Ask</button>
      </div>
    </div>
  </>
}

function FloatChat({ role }) {
  const admin = role === 'admin'
  const [open, setOpen] = useState(false), [tab, setTab] = useState(admin ? 'chat' : 'msg')
  const [msgs, setMsgs] = useState([{ who: 'bot', title: 'Revenue Assistant', summary: 'Ask me about revenue, overdue invoices, plans or cancellation risk. I answer from your live data.', head: [], rows: [] }])
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false), [txt, setTxt] = useState('')
  const [notes, reloadNotes] = useQ(() => open && tab === 'msg' ? sb.from('messages').select('*').order('id', { ascending: false }).limit(30) : Promise.resolve({ data: [] }), [open, tab])
  async function ask(text) {
    const t = (text || '').trim(); if (!t || busy) return
    setQ(''); setBusy(true)
    setMsgs(m => [...m, { who: 'me', summary: t }])
    const { data, error } = await sb.rpc('ask_assistant', { q: t })
    setMsgs(m => [...m, error ? { who: 'bot', title: 'Sorry', summary: error.message, head: [], rows: [] } : { who: 'bot', ...data }])
    setBusy(false)
  }
  async function send() {
    const b = txt.trim(); if (!b) return
    const { error } = await sb.from('messages').insert({ body: b })
    error ? alert(error.message) : (setTxt(''), reloadNotes())
  }
  return <>
    {open && <div className="fchat">
      <div className="fhead"><b>{tab === 'chat' ? 'Revenue Assistant' : 'Team messages'}</b><button className="fx" onClick={() => setOpen(false)}>×</button></div>
      {admin && <div className="ftabs">
        <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Chat</button>
        <button className={tab === 'msg' ? 'on' : ''} onClick={() => setTab('msg')}>Message</button></div>}
      {tab === 'chat' ? <>
        <div className="fbody">
          {msgs.map((m, i) => m.who === 'me'
            ? <div key={i} className="msg me">{m.summary}</div>
            : <div key={i} className="msg bot">
                <b>{m.title}</b><p>{m.summary}</p>
                {m.head && m.head.length > 0 && m.rows && m.rows.length > 0 && <Table head={m.head} rows={m.rows} />}
                {m.head && m.head.length > 0 && m.rows && m.rows.length === 0 && <p style={{ color: 'var(--mu)' }}>No matching records.</p>}
              </div>)}
          {busy && <div className="msg bot">Thinking…</div>}
        </div>
        <div className="chips fchips">{SUGGEST.map(s => <button key={s} className="btn g s" disabled={busy} onClick={() => ask(s)}>{s}</button>)}</div>
        <div className="fin">
          <input placeholder="Ask a question…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ask(q) } }} />
          <button className="btn" disabled={busy} onClick={() => ask(q)}>Ask</button>
        </div>
      </> : <>
        <div className="fbody">
          {notes.length === 0 ? <p style={{ color: 'var(--mu)' }}>No messages yet. Leave a note for the team below.</p>
            : notes.map(n => <div className="note" key={n.id}><b>{n.sender_email}</b><span>{new Date(n.at).toLocaleString('en-IN')}</span><p>{n.body}</p></div>)}
        </div>
        <div className="fin">
          <input placeholder="Write a note for the team…" maxLength={500} value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }} />
          <button className="btn" onClick={send}>Send</button>
        </div>
      </>}
    </div>}
    <button className="fab" onClick={() => setOpen(o => !o)} aria-label="Chat and messages">{open ? '×' : '💬'}</button>
  </>
}

function Staff() {
  const [rows, reload] = useQ(() => sb.from('profiles').select('email,full_name,role').in('role', ['admin', 'staff']))
  const [em, setEm] = useState('')
  async function add(ev) { ev.preventDefault(); const { error } = await sb.rpc('make_staff', { em }); error ? alert(error.message) : (setEm(''), reload()) }
  return <>
    <form className="card" onSubmit={add}><b>Add staff member</b><p style={{ color: 'var(--mu)' }}>The person signs up first, then you promote their email here.</p>
      <div className="row"><input type="email" placeholder="Registered email" value={em} onChange={e => setEm(e.target.value)} required /><button className="btn">Make staff</button></div></form>
    <div className="card"><Table head={['Name', 'Email', 'Role']} rows={rows.map(r => [r.full_name || '-', r.email, r.role])} /></div>
  </>
}

export default function App() {
  const [ses, setSes] = useState(null), [prof, setProf] = useState(null), [rec, setRec] = useState(false), [tab, setTab] = useState(''), [ready, setReady] = useState(false)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSes(data.session); setReady(true) })
    const { data: l } = sb.auth.onAuthStateChange((ev, s) => { setSes(s); if (ev === 'PASSWORD_RECOVERY') setRec(true) })
    return () => l.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (ses) sb.from('profiles').select('*').eq('id', ses.user.id).single().then(({ data }) => setProf(data)); else setProf(null) }, [ses])
  if (!ready) return null
  if (rec) return <NewPassword done={() => setRec(false)} />
  if (!ses) return <Login />
  if (!prof) return <p style={{ padding: 20 }}>Loading profile…</p>
  const tabs = TABS[prof.role], cur = tabs.find(t => t[0] === tab) ? tab : tabs[0][0]
  const View = { dash: <Dash role={prof.role} />, subs: <Subs role={prof.role} />, inv: <Invoices role={prof.role} />, prod: <Prod />, disc: <Disc />, staff: <Staff />, act: <Activity />, rep: <Reports /> }[cur]
  return (
    <div className="shell"><aside><h1>Brightloop</h1>
      {tabs.map(([k, n]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}
      <div style={{ marginTop: 'auto', fontSize: 12 }}>{prof.email}<br />Role: {prof.role}</div>
      <button onClick={() => sb.auth.signOut()}>Log out</button></aside>
      <main key={cur}>{View}</main></div>
  )
}
