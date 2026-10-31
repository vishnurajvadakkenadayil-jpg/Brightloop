import { useEffect, useState } from 'react'
import { supabase as sb } from './supabase'

const inr = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN')

function Bars({ data = [], money, color = '#5b4bdb' }) {
  const mx = Math.max(1, ...data.map(d => +d.v))
  if (!data.length) return <p style={{ color: 'var(--mu)' }}>No data yet.</p>
  return (
    <div className="bars">
      {data.map(d => (
        <div key={d.m || d.n}>
          <span>{money ? inr(d.v) : d.v}</span>
          <i style={{ height: (+d.v / mx) * 120 + 'px', background: (d.n === 'Overdue' ? '#d6455d' : d.n === 'Paid' ? '#13a06f' : color) }} />
          <small>{d.m || d.n}</small>
        </div>
      ))}
    </div>
  )
}

const Card = ({ title, children }) => <div className="card"><b>{title}</b><div style={{ marginTop: 12 }}>{children}</div></div>

export default function Reports() {
  const [d, setD] = useState(null), [err, setErr] = useState('')
  useEffect(() => { sb.rpc('reports_data').then(({ data, error }) => error ? setErr(error.message) : setD(data)) }, [])

  async function csv() {
    const { data } = await sb.from('invoices').select('number,period_start,due_date,subtotal,discount,tax,total,paid,status,profiles(email)').order('id')
    const head = 'number,customer,period,due,subtotal,discount,gst,total,paid,status'
    const rows = (data || []).map(i => [i.number, i.profiles?.email, i.period_start, i.due_date, i.subtotal, i.discount, i.tax, i.total, i.paid, i.status].join(','))
    const b = new Blob([head + '\n' + rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'invoices.csv'; a.click()
  }

  if (err) return <p className="err">{err}</p>
  if (!d) return <p>Loading reports…</p>
  return <>
    <div className="row"><button className="btn" onClick={csv}>Export invoices (CSV)</button><button className="btn g" onClick={() => window.print()}>Print report</button></div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
      <Card title="Revenue collected by month"><Bars data={d.collected} money color="#13a06f" /></Card>
      <Card title="Amount invoiced by month"><Bars data={d.invoiced} money /></Card>
      <Card title="MRR by plan"><Bars data={d.by_plan} money color="#8a6cff" /></Card>
      <Card title="Invoice money: paid, outstanding, overdue"><Bars data={d.money} money /></Card>
      <Card title="Subscriptions by status"><Bars data={d.by_status} color="#e0a100" /></Card>
      <Card title="New subscriptions per month (growth)"><Bars data={d.growth} color="#3b82f6" /></Card>
    </div>
  </>
}
