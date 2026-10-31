import { useEffect, useState } from 'react'
import { supabase as sb } from './supabase'

const inr = n => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN')
const COL = { Paid: '#13a06f', Outstanding: '#e0a100', Overdue: '#d6455d', Draft: '#9a9ec0', Quotation: '#e0a100', Confirmed: '#3b82f6', Active: '#13a06f', Closed: '#6b7090' }
const PAL = ['#5b4bdb', '#13a06f', '#e0a100', '#d6455d', '#3b82f6']

function Pie({ title, data = [], money }) {
  const tot = data.reduce((a, d) => a + Number(d.v), 0)
  const cx = 150, cy = 92, rx = 122, ry = 60, dp = 24, TAU = Math.PI * 2
  const P = (a, dy = 0) => (cx + rx * Math.cos(a)).toFixed(2) + ',' + (cy + ry * Math.sin(a) + dy).toFixed(2)
  let acc = 0
  const sl = data.map((d, i) => {
    const a0 = -Math.PI / 2 + (acc / tot) * TAU
    acc += Number(d.v)
    const a1 = -Math.PI / 2 + (acc / tot) * TAU
    return { d, a0, a1, mid: (a0 + a1) / 2, pct: Number(d.v) / tot, color: COL[d.n] || PAL[i % PAL.length] }
  })
  const big = sl.reduce((m, s, i) => (s.pct > sl[m].pct ? i : m), 0)
  const order = sl.map((s, i) => [s, i]).sort((a, b) => Math.sin(a[0].mid) - Math.sin(b[0].mid))

  function Slice({ s, i }) {
    const full = s.a1 - s.a0 >= TAU - 0.001
    const ex = sl.length > 1 && i === big ? [10 * Math.cos(s.mid), 6 * Math.sin(s.mid)] : [0, 0]
    const ws = Math.max(s.a0, 0), we = Math.min(s.a1, Math.PI)
    const wall = we > ws
      ? 'M' + P(ws) + ' A' + rx + ',' + ry + ' 0 ' + (we - ws > Math.PI ? 1 : 0) + ' 1 ' + P(we) + ' L' + P(we, dp) + ' A' + rx + ',' + ry + ' 0 ' + (we - ws > Math.PI ? 1 : 0) + ' 0 ' + P(ws, dp) + ' Z'
      : null
    const top = full ? null : 'M' + cx + ',' + cy + ' L' + P(s.a0) + ' A' + rx + ',' + ry + ' 0 ' + (s.a1 - s.a0 > Math.PI ? 1 : 0) + ' 1 ' + P(s.a1) + ' Z'
    const lx = cx + 0.62 * rx * Math.cos(s.mid), ly = cy + 0.62 * ry * Math.sin(s.mid) + 4
    return (
      <g transform={'translate(' + ex[0].toFixed(2) + ',' + ex[1].toFixed(2) + ')'}>
        <g className="sl">
          {wall && <><path d={wall} fill={s.color} /><path d={wall} fill="rgba(0,0,0,.3)" /></>}
          {full ? <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={s.color} stroke="#fff" strokeWidth="1.5" /> : <path d={top} fill={s.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />}
          {s.pct >= 0.06 && <text x={lx} y={ly} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{Math.round(s.pct * 100)}%</text>}
        </g>
      </g>
    )
  }

  return (
    <div className="card"><b>{title}</b>
      {tot > 0 ? (
        <div className="pie">
          <svg className="pie3" viewBox="0 0 300 190" role="img" aria-label={title}>
            <ellipse cx={cx} cy={cy + dp + 10} rx={rx} ry={ry * 0.9} fill="rgba(20,24,58,.08)" />
            {order.map(([s, i]) => <Slice key={s.d.n} s={s} i={i} />)}
          </svg>
          <ul>{data.map((d, i) => (
            <li key={d.n}><i style={{ background: COL[d.n] || PAL[i % PAL.length] }} />
              {d.n}: <b>{money ? inr(d.v) : d.v}</b> ({Math.round((Number(d.v) / tot) * 100)}%)</li>
          ))}</ul>
        </div>
      ) : <p style={{ color: 'var(--mu)' }}>No data yet.</p>}
    </div>
  )
}

export default function PieCharts() {
  const [d, setD] = useState(null)
  useEffect(() => { sb.rpc('reports_data').then(({ data, error }) => { if (!error) setD(data) }) }, [])
  if (!d) return null
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
      <Pie title="Invoice money" data={d.money} money />
      <Pie title="Subscriptions by status" data={d.by_status} />
    </div>
  )
}
