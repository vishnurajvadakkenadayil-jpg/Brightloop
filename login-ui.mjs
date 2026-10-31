import fs from 'fs'

const F = 'src/App.jsx', CSS = 'src/styles.css', HTML = 'index.html'
let app = fs.readFileSync(F, 'utf8')
const startMark = '<form className="card login" onSubmit={go}>'
const s = app.indexOf(startMark)
const e = s < 0 ? -1 : app.indexOf('</form>', s)
if (s < 0 || e < 0 || !app.includes('function Login()')) {
    console.log('App.jsx is not what I expected. Nothing was changed.')
    process.exit(1)
}
if (app.includes('className="auth"')) {
    console.log('New login page is already applied. Nothing was changed.')
    process.exit(0)
}
for (const f of [F, CSS, HTML]) if (fs.existsSync(f) && !fs.existsSync(f + '.bak6')) fs.copyFileSync(f, f + '.bak6')

const jsx = `<div className="auth">
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
    </div>`
app = app.slice(0, s) + jsx + app.slice(e + '</form>'.length)
app = app.replace('<aside><h1>Subscript</h1>', '<aside><h1>Brightloop</h1>')
fs.writeFileSync(F, app)

let css = fs.readFileSync(CSS, 'utf8')
if (!css.includes('/* auth */')) {
    css += `
/* auth */
.auth{display:flex;min-height:100vh;background:#fff}
.auth-side{flex:1.1;background:linear-gradient(160deg,#14183a 0%,#2b2f66 60%,#5b4bdb 130%);color:#dfe1f5;padding:48px 56px;display:flex;flex-direction:column;justify-content:space-between}
.auth-brand{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:700;color:#fff;letter-spacing:-.02em}
.auth-logo{width:38px;height:38px;border-radius:10px;background:var(--ac);display:inline-flex;align-items:center;justify-content:center;font-size:20px;color:#fff}
.auth-side h1{font-size:36px;line-height:1.15;margin:0 0 14px;color:#fff;letter-spacing:-.03em;max-width:460px}
.auth-side p{font-size:16px;line-height:1.6;margin:0 0 26px;max-width:440px;color:#c9cbe8}
.auth-side ul{list-style:none;margin:0;padding:0}
.auth-side li{padding:8px 0 8px 28px;position:relative;font-size:14.5px}
.auth-side li::before{content:"✓";position:absolute;left:0;color:#8ee0bd;font-weight:700}
.auth-side small{color:#9ea2cf}
.auth-main{flex:1;display:flex;align-items:center;justify-content:center;padding:32px;background:var(--bg)}
.auth-form{width:100%;max-width:400px;background:#fff;border:1px solid var(--bd);border-radius:16px;padding:36px 32px;box-shadow:0 8px 30px rgba(20,24,58,.08)}
.auth-form h2{margin:0 0 6px;font-size:26px;letter-spacing:-.02em}
.auth-sub{margin:0 0 22px;color:var(--mu)}
.auth-form label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px}
.auth-form input{width:100%;padding:11px 13px;font-size:14.5px}
.auth-form .err{min-height:20px;margin:10px 0 4px;font-size:13px}
.auth-btn{width:100%;padding:12px;font-size:15px;font-weight:600;margin-top:4px}
.auth-links{display:flex;justify-content:space-between;margin-top:18px;font-size:13.5px}
.auth-links a{color:var(--ac);text-decoration:none;font-weight:500}
.auth-links a:hover{text-decoration:underline}
@media(max-width:850px){.auth-side{display:none}.auth{background:var(--bg)}}
`
    fs.writeFileSync(CSS, css)
}

if (fs.existsSync(HTML)) {
    let h = fs.readFileSync(HTML, 'utf8')
    h = h.replace(/<title>[^<]*<\/title>/, '<title>Brightloop</title>')
    fs.writeFileSync(HTML, h)
}
console.log('Done. Backups saved with the .bak6 ending.')