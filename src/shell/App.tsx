import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getAccounts, getDashboard } from "../api/wealthOps";
import { ApiError } from "../api/client";
import { useAuth, AuthProvider } from "../auth/AuthProvider";
import type { Account, DashboardSummary, UserRole } from "../types";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";

function SignIn() {
  const { token, signIn } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("Advisor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(role);
      navigate("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sign-in-screen">
      <form className="sign-in-card" onSubmit={submit}>
        <div className="brand-mark large">W</div>
        <p className="eyebrow">WEALTHOPS · LOCAL SIMULATION</p>
        <h1>Welcome back</h1>
        <p className="muted">Choose a synthetic role to explore the operations workstation.</p>
        <label htmlFor="role">Local demo role</label>
        <select id="role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          {["Advisor", "ClientService", "OperationsAnalyst", "ComplianceReviewer", "BackOffice", "Admin", "Reader"].map((item) =>
            <option key={item} value={item}>{item.replace(/([A-Z])/g, " $1").trim()}</option>,
          )}
        </select>
        {error && <div className="alert error" role="alert">{error}</div>}
        <button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Continue to demo"}</button>
        <p className="fine-print">Development-only sign-in. No real customer or financial data.</p>
      </form>
    </main>
  );
}

function AppShell() {
  const { token, role, signOut } = useAuth();
  const { preference, setPreference } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === "/accounts" ? "accounts" : "overview";

  if (!token) return <SignIn />;

  function logout() {
    signOut();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="WealthOps home">
          <span className="brand-mark">W</span>
          <span><strong>wealthops</strong><small>ADVISOR WORKSPACE</small></span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <Link className={`nav-item ${active === "overview" ? "selected" : ""}`} to="/">
            <span className="nav-icon">◫</span> Overview
          </Link>
          <Link className={`nav-item ${active === "accounts" ? "selected" : ""}`} to="/accounts">
            <span className="nav-icon">▤</span> Accounts
          </Link>
          <button className="nav-item disabled" disabled title="Scheduled for a later implementation milestone">
            <span className="nav-icon">⌁</span> Portfolio <span className="nav-soon">SOON</span>
          </button>
          <button className="nav-item disabled" disabled title="Scheduled for a later implementation milestone">
            <span className="nav-icon">⇄</span> Reconciliation <span className="nav-soon">SOON</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge"><span className="status-dot" /> SIMULATION ENVIRONMENT</div>
          <div className="user-card">
            <div className="avatar">{(role ?? "U").slice(0, 1)}</div>
            <div className="user-details"><strong>{role?.replace(/([A-Z])/g, " $1").trim()}</strong><small>Local demo session</small></div>
            <button className="icon-button" aria-label="Sign out" onClick={logout}>↗</button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-divider">/</span><strong>{active === "accounts" ? "Accounts" : "Overview"}</strong></div>
          <div className="topbar-actions">
            <label className="theme-control">
              <span className="visually-hidden">Theme</span>
              <span aria-hidden="true">◐</span>
              <select aria-label="Theme" value={preference} onChange={(event) => setPreference(event.target.value as typeof preference)}>
                <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
              </select>
            </label>
            <div className="today-chip">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date())}</div>
          </div>
        </header>
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/accounts" element={<AccountsPage token={token} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function useLoad<T>(load: () => Promise<T>, dependency: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load().then((result) => {
      if (active) setData(result);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause : new Error("The request failed."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [dependency]);

  return { data, error, loading };
}

function Dashboard({ token }: { token: string }) {
  const { data, error, loading } = useLoad<DashboardSummary>(() => getDashboard(token), token);
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toUpperCase()} · DAILY BRIEFING</p><h1>Good afternoon</h1><p className="muted">Here’s your operational snapshot for today.</p></div>
        <span className="simulated-pill"><span className="status-dot" /> SIMULATED DATA</span>
      </div>
      {error ? <ErrorPanel error={error} /> : loading ? <LoadingCards /> : data ? (
        <>
          <section className="metric-grid" aria-label="Operations summary">
            <MetricCard label="ADVISORS" value={data.advisorCount} detail="Across the demo firm" icon="♙" tone="blue" />
            <MetricCard label="HOUSEHOLDS" value={data.householdCount} detail="Serviced relationships" icon="⌂" tone="green" />
            <MetricCard label="CLIENTS" value={data.clientCount} detail="Synthetic records" icon="♧" tone="violet" />
            <MetricCard label="ACCOUNTS" value={data.accountCount} detail="All lifecycle states" icon="▤" tone="amber" />
          </section>
          <section className="content-grid">
            <div className="panel">
              <div className="panel-heading"><div><p className="eyebrow">ACCOUNT LIFECYCLE</p><h2>Account status</h2></div><Link to="/accounts" className="text-link">View accounts <span>→</span></Link></div>
              <div className="status-list">
                {["Active", "Draft", "Submitted", "Approved", "Suspended", "Closed"].map((status) => (
                  <div className="status-row" key={status}><span className={`status-marker ${status.toLowerCase()}`} /><span>{status}</span><strong>{data.accountsByStatus[status] ?? 0}</strong></div>
                ))}
              </div>
            </div>
            <div className="panel focus-panel">
              <p className="eyebrow">NEXT UP</p><h2>Build with confidence</h2>
              <p className="muted">This foundation connects the advisor and account workflow to audited backend APIs. Portfolio, billing, and reconciliation arrive in later milestones.</p>
              <Link to="/accounts" className="button secondary">Explore accounts <span>→</span></Link>
              <div className="focus-foot"><span className="status-dot" /> API connected through the local gateway</div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

function AccountsPage({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const { data, error, loading } = useLoad(() => getAccounts(token, search), `${token}:${search}`);
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">CLIENT SERVICING</p><h1>Accounts</h1><p className="muted">Browse synthetic accounts and current lifecycle status.</p></div>
        <span className="simulated-pill"><span className="status-dot" /> SIMULATED DATA</span>
      </div>
      <section className="panel">
        <div className="panel-heading account-tools"><div><p className="eyebrow">ACCOUNT DIRECTORY</p><h2>All accounts {data && <span className="count-chip">{data.totalCount}</span>}</h2></div>
          <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search accounts" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search account or custodian ID" /></label>
        </div>
        {error ? <ErrorPanel error={error} /> : loading ? <div className="table-loading" role="status">Loading accounts…</div> : (
          <div className="table-wrap"><table><thead><tr><th>ACCOUNT</th><th>HOUSEHOLD</th><th>TYPE</th><th>STATUS</th><th>CREATED</th></tr></thead>
            <tbody>{data?.items.map((account: Account) => <tr key={account.id}>
              <td><strong>{account.accountNumber}</strong><small>{account.custodianReference}</small></td>
              <td><span className="mono">{account.householdId.slice(0, 8)}</span></td><td>{account.accountType}</td>
              <td><span className={`account-status ${account.status.toLowerCase()}`}>{account.status}</span></td>
              <td>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(account.createdAt))}</td>
            </tr>)}</tbody>
          </table>
          {data?.items.length === 0 && <div className="empty-state"><strong>No accounts found</strong><p>Try a different search term.</p></div>}</div>
        )}
      </section>
    </>
  );
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><p className="metric-label">{label}</p><div className="metric-value">{value.toLocaleString("en-US")}</div><p className="metric-detail">{detail}</p></article>;
}

function LoadingCards() {
  return <div className="metric-grid" aria-label="Loading summary" role="status">{Array.from({ length: 4 }, (_, index) => <div className="metric-card skeleton" key={index}><span /><span /><span /></div>)}</div>;
}

function ErrorPanel({ error }: { error: Error }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      signOut();
      navigate("/login");
    }
  }, [error, navigate, signOut]);
  return <div className="alert error" role="alert"><strong>We couldn’t load this information.</strong><span>{error.message}</span>{error instanceof ApiError && error.correlationId && <small>Reference: {error.correlationId}</small>}</div>;
}

function AppRoutes() {
  return <AuthProvider><ThemeProvider><Routes><Route path="/login" element={<SignIn />} /><Route path="*" element={<AppShell />} /></Routes></ThemeProvider></AuthProvider>;
}

export function App() {
  return <AppRoutes />;
}
