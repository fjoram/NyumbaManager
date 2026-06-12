import { useState, useEffect } from "react";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const fmtMoney = (n) =>
  "TZS " + (Number(n) || 0).toLocaleString("en-US");
const monthLabel = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[Number(m) - 1] + " " + y;
};

// Returns null, or {label, tone, days} describing how close the lease end is
const leaseStatus = (leaseEnd) => {
  if (!leaseEnd) return null;
  // support both YYYY-MM and YYYY-MM-DD; treat month as ending on last day
  const dateStr = leaseEnd.length === 7
    ? (() => { const [y, m] = leaseEnd.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })()
    : leaseEnd;
  const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Lease expired", tone: "red", days };
  if (days <= 30) return { label: `Ends in ${days} day${days === 1 ? "" : "s"} — give notice now!`, tone: "red", days };
  if (days <= 90) return { label: `Ends in ${days} days — plan notice`, tone: "amber", days };
  return null;
};

const EMPTY = { properties: [], tenants: [], payments: [], maintenance: [] };

// ---------- styles ----------
const C = {
  ink: "#16241F",
  inkSoft: "#24362F",
  leaf: "#2F7D4F",
  leafDark: "#226140",
  amber: "#D99A22",
  red: "#C0492F",
  paper: "#F6F7F4",
  card: "#FFFFFF",
  line: "#E3E6E1",
  text: "#1D2823",
  muted: "#6B7670",
};

const inputStyle = {
  padding: "9px 11px",
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  color: C.text,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const btnPrimary = {
  background: C.leaf,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhost = {
  background: "transparent",
  color: C.muted,
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13,
  cursor: "pointer",
};

const card = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  padding: 18,
};

// ---------- small components ----------
function Field({ label, children }) {
  return (
    <label style={{ display: "block", flex: 1, minWidth: 140 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Badge({ children, tone }) {
  const tones = {
    green: { bg: "#E4F2E9", fg: C.leafDark },
    amber: { bg: "#FAF0D8", fg: "#8A6212" },
    red: { bg: "#F8E4DF", fg: C.red },
    gray: { bg: "#EDEFEC", fg: C.muted },
  };
  const t = tones[tone] || tones.gray;
  return (
    <span style={{ background: t.bg, color: t.fg, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div style={{ ...card, textAlign: "center", color: C.muted, fontSize: 14, padding: 32 }}>
      {text}
    </div>
  );
}

// ---------- main app ----------
export default function RentalManager() {
  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [saveErr, setSaveErr] = useState(false);

  const refresh = async () => {
    const r = await fetch("/api/state");
    if (!r.ok) throw new Error("Could not load data");
    setData({ ...EMPTY, ...(await r.json()) });
  };

  useEffect(() => {
    refresh()
      .catch(() => setSaveErr(true))
      .finally(() => setLoading(false));
  }, []);

  // Each call hits the API, then refreshes state from the database.
  // On a 400 (validation) response, the server's message is thrown so forms can display it.
  const call = async (url, options) => {
    const r = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || "Request failed");
    }
    await refresh();
  };

  const api = {
    saveProperty: (p) => call("/api/properties", { method: "POST", body: JSON.stringify(p) }),
    deleteProperty: (id) => call(`/api/properties?id=${id}`, { method: "DELETE" }),
    saveTenant: (t) => call("/api/tenants", { method: "POST", body: JSON.stringify(t) }),
    deleteTenant: (id) => call(`/api/tenants?id=${id}`, { method: "DELETE" }),
    addPayments: (records) => call("/api/payments", { method: "POST", body: JSON.stringify({ records }) }),
    deletePayment: (id) => call(`/api/payments?id=${id}`, { method: "DELETE" }),
    addMaintenance: (m) => call("/api/maintenance", { method: "POST", body: JSON.stringify(m) }),
    setMaintenanceStatus: (id, status) => call("/api/maintenance", { method: "PATCH", body: JSON.stringify({ id, status }) }),
    deleteMaintenance: (id) => call(`/api/maintenance?id=${id}`, { method: "DELETE" }),
  };

  const tabs = [
    ["dashboard", "Dashboard"],
    ["properties", "Properties"],
    ["tenants", "Tenants"],
    ["payments", "Rent payments"],
    ["maintenance", "Maintenance"],
    ["reports", "Reports"],
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: "system-ui, sans-serif" }}>
        Loading your portfolio…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif", color: C.text }}>
      {/* header */}
      <header style={{ background: C.ink, color: "#fff", padding: "18px 22px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Nyumba<span style={{ color: "#7FC79B" }}>Manager</span>
          </h1>
          <span style={{ fontSize: 13, color: "#9FB0A8" }}>Your rental portfolio, in one place</span>
          {saveErr && <span style={{ fontSize: 12, color: "#F2B8A6" }}>⚠ Could not reach the database — check your connection</span>}
        </div>
        <nav style={{ maxWidth: 1080, margin: "14px auto 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: tab === id ? C.leaf : "transparent",
                color: tab === id ? "#fff" : "#B9C6C0",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 18px 60px" }}>
        {tab === "dashboard" && <Dashboard data={data} go={setTab} />}
        {tab === "properties" && <Properties data={data} api={api} />}
        {tab === "tenants" && <Tenants data={data} api={api} />}
        {tab === "payments" && <Payments data={data} api={api} />}
        {tab === "maintenance" && <Maintenance data={data} api={api} />}
        {tab === "reports" && <Reports data={data} />}
      </main>
    </div>
  );
}

// ---------- dashboard ----------
function Dashboard({ data, go }) {
  const { properties, tenants, payments, maintenance } = data;
  const month = thisMonth();
  const occupiedIds = new Set(tenants.map((t) => t.propertyId));
  const occupied = properties.filter((p) => occupiedIds.has(p.id));
  const vacant = properties.filter((p) => !occupiedIds.has(p.id));

  const expected = occupied.reduce((s, p) => s + (Number(p.rent) || 0), 0);
  const collected = payments
    .filter((p) => p.month === month)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const paidTenantIds = new Set(payments.filter((p) => p.month === month).map((p) => p.tenantId));
  const overdue = tenants.filter((t) => !paidTenantIds.has(t.id));
  const openIssues = maintenance.filter((m) => m.status !== "done");

  const stat = (label, value, sub) => (
    <div style={{ ...card, flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6, color: C.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {stat("Properties", properties.length, `${occupied.length} occupied · ${vacant.length} vacant`)}
        {stat("Expected this month", fmtMoney(expected), monthLabel(month))}
        {stat("Collected this month", fmtMoney(collected), expected > 0 ? Math.round((collected / expected) * 100) + "% of expected" : "—")}
        {stat("Open maintenance", openIssues.length, openIssues.length ? "needs attention" : "all clear")}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
        <div style={{ ...card, flex: 2, minWidth: 280 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Rent not yet received — {monthLabel(month)}</h3>
          {tenants.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14 }}>No tenants yet. Add properties and tenants to start tracking rent.</div>
          ) : overdue.length === 0 ? (
            <div style={{ color: C.leafDark, fontSize: 14, fontWeight: 600 }}>✓ Everyone has paid this month</div>
          ) : (
            overdue.map((t) => {
              const prop = data.properties.find((p) => p.id === t.propertyId);
              return (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12.5, color: C.muted }}>{prop ? prop.name : "No property"}</div>
                  </div>
                  <Badge tone="amber">{fmtMoney(prop ? prop.rent : 0)} due</Badge>
                </div>
              );
            })
          )}
          {overdue.length > 0 && (
            <button style={{ ...btnGhost, marginTop: 12 }} onClick={() => go("payments")}>Record a payment →</button>
          )}
        </div>

        <div style={{ ...card, flex: 1, minWidth: 240 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Vacant properties</h3>
          {vacant.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14 }}>{properties.length === 0 ? "No properties added yet." : "Fully occupied — well done!"}</div>
          ) : (
            vacant.map((p) => (
              <div key={p.id} style={{ padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: C.muted }}>{fmtMoney(p.rent)} / month</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ ...card, marginTop: 14 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Leases ending within 3 months — plan your notices</h3>
        {(() => {
          const ending = tenants
            .map((t) => ({ t, lease: leaseStatus(t.leaseEnd) }))
            .filter((x) => x.lease)
            .sort((a, b) => a.lease.days - b.lease.days);
          if (ending.length === 0)
            return <div style={{ color: C.muted, fontSize: 14 }}>No leases expiring in the next 90 days.</div>;
          return ending.map(({ t, lease }) => {
            const prop = properties.find((p) => p.id === t.propertyId);
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>{prop ? prop.name : "No property"} · ends {t.leaseEnd}</div>
                </div>
                <Badge tone={lease.tone}>{lease.label}</Badge>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

// ---------- properties ----------
function Properties({ data, api }) {
  const [form, setForm] = useState(null); // null | {} | property being edited
  const [confirmId, setConfirmId] = useState(null);
  const occupiedIds = new Set(data.tenants.map((t) => t.propertyId));

  const submit = async () => {
    if (!form.name) return;
    await api.saveProperty({ ...form, id: form.id || uid() });
    setForm(null);
  };

  const remove = (id) => { api.deleteProperty(id); setConfirmId(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Properties ({data.properties.length})</h2>
        {!form && <button style={btnPrimary} onClick={() => setForm({ name: "", address: "", type: "House", rent: "" })}>+ Add property</button>}
      </div>

      {form && (
        <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${C.leaf}` }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{form.id ? "Edit property" : "New property"}</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mikocheni House 1" /></Field>
            <Field label="Address / area"><input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. Mikocheni B, Dar es Salaam" /></Field>
            <Field label="Type">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {["House", "Apartment", "Room", "Shop/Commercial", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Monthly rent (TZS)"><input style={inputStyle} type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} placeholder="e.g. 800000" /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={btnPrimary} onClick={submit}>Save property</button>
            <button style={btnGhost} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {data.properties.length === 0 && !form ? (
        <Empty text="No properties yet. Click “+ Add property” to register your first house." />
      ) : (
        data.properties.map((p) => {
          const occupied = occupiedIds.has(p.id);
          const tenant = data.tenants.find((t) => t.propertyId === p.id);
          return (
            <div key={p.id} style={{ ...card, marginBottom: 10, borderLeft: `4px solid ${occupied ? C.leaf : C.amber}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{p.name}</strong>
                  <Badge tone={occupied ? "green" : "amber"}>{occupied ? "Occupied" : "Vacant"}</Badge>
                  {tenant && leaseStatus(tenant.leaseEnd) && (
                    <Badge tone={leaseStatus(tenant.leaseEnd).tone}>{leaseStatus(tenant.leaseEnd).label}</Badge>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {p.type}{p.address ? " · " + p.address : ""} · {fmtMoney(p.rent)} / month
                  {tenant ? " · Tenant: " + tenant.name : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={btnGhost} onClick={() => setForm(p)}>Edit</button>
                {confirmId === p.id ? (
                  <>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Delete?</span>
                    <button style={{ ...btnGhost, color: C.red }} onClick={() => remove(p.id)}>Yes</button>
                    <button style={btnGhost} onClick={() => setConfirmId(null)}>No</button>
                  </>
                ) : (
                  <button style={{ ...btnGhost, color: C.red }} onClick={() => setConfirmId(p.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- tenants ----------
function Tenants({ data, api }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const submit = async () => {
    if (!form.name) { setError("Tenant name is required."); return; }
    if (!form.leaseStart) { setError("Lease start date is required."); return; }
    if (!form.leaseEnd) { setError("Lease end date is required."); return; }
    if (form.leaseEnd <= form.leaseStart) { setError("Lease end month must be after the lease start month."); return; }
    setError("");
    try {
      await api.saveTenant({ ...form, id: form.id || uid() });
      setForm(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = (id) => { api.deleteTenant(id); setConfirmId(null); };

  const takenIds = new Set(data.tenants.filter((t) => !form || t.id !== form.id).map((t) => t.propertyId));
  const available = data.properties.filter((p) => !takenIds.has(p.id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Tenants ({data.tenants.length})</h2>
        {!form && <button style={btnPrimary} onClick={() => setForm({ name: "", phone: "", propertyId: "", leaseStart: "", leaseEnd: "" })}>+ Add tenant</button>}
      </div>

      {form && (
        <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${C.leaf}` }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>{form.id ? "Edit tenant" : "New tenant"}</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Full name"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amina Hassan" /></Field>
            <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 7xx xxx xxx" /></Field>
            <Field label="Property">
              <select style={inputStyle} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">— select —</option>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Lease start (required)"><input style={{ ...inputStyle, borderColor: error && !form.leaseStart ? C.red : C.line }} type="month" value={form.leaseStart} onChange={(e) => setForm({ ...form, leaseStart: e.target.value })} /></Field>
            <Field label="Lease end (required)"><input style={{ ...inputStyle, borderColor: error && !form.leaseEnd ? C.red : C.line }} type="month" value={form.leaseEnd || ""} onChange={(e) => setForm({ ...form, leaseEnd: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnPrimary} onClick={submit}>Save tenant</button>
            <button style={btnGhost} onClick={() => { setForm(null); setError(""); }}>Cancel</button>
            {error && (
              <span style={{ fontSize: 13.5, color: C.red, fontWeight: 700, background: "#F8E4DF", padding: "7px 12px", borderRadius: 8 }}>
                ⚠ {error}
              </span>
            )}
            {(() => {
              const prop = data.properties.find((p) => p.id === form.propertyId);
              if (!prop || !form.leaseStart || !form.leaseEnd) return null;
              if (form.leaseEnd <= form.leaseStart) return <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>⚠ Lease end must be after lease start</span>;
              const [sy, sm] = form.leaseStart.split("-").map(Number);
              const [ey, em] = form.leaseEnd.split("-").map(Number);
              const months = (ey - sy) * 12 + (em - sm) + 1;
              const total = months * (Number(prop.rent) || 0);
              return (
                <span style={{ fontSize: 13.5, color: C.leafDark, fontWeight: 700, background: "#E4F2E9", padding: "7px 12px", borderRadius: 8 }}>
                  Lease ≈ {months} month{months === 1 ? "" : "s"} × {fmtMoney(prop.rent)} = {fmtMoney(total)} total expected
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {data.tenants.length === 0 && !form ? (
        <Empty text="No tenants yet. Add a tenant and link them to one of your properties." />
      ) : (
        data.tenants.map((t) => {
          const prop = data.properties.find((p) => p.id === t.propertyId);
          const lease = leaseStatus(t.leaseEnd);
          return (
            <div key={t.id} style={{ ...card, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{t.name}</strong>
                  {lease && <Badge tone={lease.tone}>{lease.label}</Badge>}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {t.phone || "No phone"} · {prop ? prop.name : "Not assigned to a property"}
                  {t.leaseStart ? " · Lease: " + t.leaseStart + (t.leaseEnd ? " → " + t.leaseEnd : "") : t.leaseEnd ? " · Lease ends " + t.leaseEnd : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={btnGhost} onClick={() => setForm(t)}>Edit</button>
                {confirmId === t.id ? (
                  <>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Delete?</span>
                    <button style={{ ...btnGhost, color: C.red }} onClick={() => remove(t.id)}>Yes</button>
                    <button style={btnGhost} onClick={() => setConfirmId(null)}>No</button>
                  </>
                ) : (
                  <button style={{ ...btnGhost, color: C.red }} onClick={() => setConfirmId(t.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- payments ----------
function Payments({ data, api }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  // total months in a tenant's lease (capped at 48)
  const leaseMonthCount = (t) => {
    if (!t.leaseStart || !t.leaseEnd) return 0;
    let y = Number(t.leaseStart.slice(0, 4));
    let m = Number(t.leaseStart.slice(5, 7));
    const ey = Number(t.leaseEnd.slice(0, 4));
    const em = Number(t.leaseEnd.slice(5, 7));
    let n = 0;
    while ((y < ey || (y === ey && m <= em)) && n < 48) {
      n++;
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return n;
  };

  const submit = async () => {
    if (!form.tenantId) { setError("Select a tenant first."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError("Enter a valid payment amount."); return; }

    const tenant = data.tenants.find((t) => t.id === form.tenantId);
    const prop = tenant && data.properties.find((p) => p.id === tenant.propertyId);

    // overpayment check against the lease total
    if (tenant && prop && tenant.leaseStart && tenant.leaseEnd) {
      const expected = leaseMonthCount(tenant) * (Number(prop.rent) || 0);
      const alreadyPaid = data.payments
        .filter((p) => p.tenantId === tenant.id)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const pending = expected - alreadyPaid;

      if (pending <= 0) {
        setError(`${tenant.name} has already FULLY PAID the lease total of ${fmtMoney(expected)}. This payment was not saved.`);
        return;
      }
      if (Number(form.amount) > pending) {
        setError(`Amount too high. ${tenant.name}'s pending balance is only ${fmtMoney(pending)} (paid ${fmtMoney(alreadyPaid)} of ${fmtMoney(expected)}). Reduce the amount — payment not saved.`);
        return;
      }
    }

    setError("");
    const count = Math.max(1, Number(form.monthsCount) || 1);
    const perMonth = Math.round((Number(form.amount) || 0) / count);
    const datePaid = form.datePaid || new Date().toISOString().slice(0, 10);
    const batchId = count > 1 ? uid() : null;

    // create one record per month covered, starting from the chosen month
    let [y, m] = form.month.split("-").map(Number);
    const records = [];
    for (let i = 0; i < count; i++) {
      const month = `${y}-${String(m).padStart(2, "0")}`;
      records.push({
        id: uid(),
        tenantId: form.tenantId,
        propertyId: tenant ? tenant.propertyId : "",
        amount: perMonth,
        month,
        method: form.method,
        datePaid,
        batchId,
        batchCount: count,
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    try {
      await api.addPayments(records);
      setForm(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = (id) => { api.deletePayment(id); setConfirmId(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Rent payments ({data.payments.length})</h2>
        {!form && (
          <button
            style={btnPrimary}
            onClick={() => setForm({ tenantId: "", amount: "", month: thisMonth(), monthsCount: 1, method: "Mobile money", datePaid: "" })}
          >
            + Record payment
          </button>
        )}
      </div>

      {form && (
        <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${C.leaf}` }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Record a payment</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Tenant">
              <select
                style={inputStyle}
                value={form.tenantId}
                onChange={(e) => {
                  const t = data.tenants.find((x) => x.id === e.target.value);
                  const prop = t && data.properties.find((p) => p.id === t.propertyId);
                  const count = Math.max(1, Number(form.monthsCount) || 1);
                  setForm({ ...form, tenantId: e.target.value, amount: prop ? Number(prop.rent) * count : form.amount });
                }}
              >
                <option value="">— select —</option>
                {data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(() => {
                const t = data.tenants.find((x) => x.id === form.tenantId);
                if (!t) return null;
                const prop = data.properties.find((p) => p.id === t.propertyId);
                if (!prop)
                  return <div style={{ marginTop: 6, fontSize: 13, color: C.red, fontWeight: 600 }}>⚠ This tenant is not assigned to any property</div>;

                const paid = data.payments
                  .filter((p) => p.tenantId === t.id)
                  .reduce((s, p) => s + (Number(p.amount) || 0), 0);

                // sum of payments per month for this tenant
                const paidByMonth = {};
                data.payments.filter((p) => p.tenantId === t.id).forEach((p) => {
                  paidByMonth[p.month] = (paidByMonth[p.month] || 0) + (Number(p.amount) || 0);
                });

                // build the list of lease months
                const leaseMonths = [];
                if (t.leaseStart && t.leaseEnd) {
                  let y = Number(t.leaseStart.slice(0, 4));
                  let m = Number(t.leaseStart.slice(5, 7));
                  const ey = Number(t.leaseEnd.slice(0, 4));
                  const em = Number(t.leaseEnd.slice(5, 7));
                  while ((y < ey || (y === ey && m <= em)) && leaseMonths.length < 48) {
                    leaseMonths.push(`${y}-${String(m).padStart(2, "0")}`);
                    m++;
                    if (m > 12) { m = 1; y++; }
                  }
                }

                const rent = Number(prop.rent) || 0;
                const expected = leaseMonths.length * rent;
                const pending = expected - paid;
                const pendingMonths = leaseMonths.filter((mo) => (paidByMonth[mo] || 0) < rent);

                const chip = (mo) => {
                  const amt = paidByMonth[mo] || 0;
                  const full = amt >= rent && rent > 0;
                  const partial = amt > 0 && !full;
                  const bg = full ? "#E4F2E9" : partial ? "#FAF0D8" : "#F8E4DF";
                  const fg = full ? C.leafDark : partial ? "#8A6212" : C.red;
                  return (
                    <span key={mo} style={{ background: bg, color: fg, fontSize: 12, fontWeight: 700, padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>
                      {monthLabel(mo)} {full ? "✓ " + fmtMoney(amt) : partial ? "½ " + fmtMoney(amt) + " of " + fmtMoney(rent) : "· pending"}
                    </span>
                  );
                };

                return (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <div style={{ color: C.leafDark, fontWeight: 600 }}>🏠 {prop.name} · {fmtMoney(rent)} / month</div>

                    {leaseMonths.length === 0 ? (
                      <div style={{ marginTop: 4, color: C.muted }}>
                        Paid so far: {fmtMoney(paid)} (add lease dates on the Tenants tab to see the month-by-month breakdown)
                      </div>
                    ) : pending <= 0 ? (
                      <div style={{ marginTop: 6, fontWeight: 700, color: C.leafDark, background: "#E4F2E9", padding: "7px 10px", borderRadius: 8 }}>
                        ✓ FULLY PAID — all {leaseMonths.length} months of the lease are covered ({fmtMoney(expected)}). No payment needed.
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontWeight: 700, color: "#8A6212", background: "#FAF0D8", padding: "7px 10px", borderRadius: 8 }}>
                        Pending: {fmtMoney(pending)} for {pendingMonths.length} month{pendingMonths.length === 1 ? "" : "s"} &nbsp;(paid {fmtMoney(paid)} of {fmtMoney(expected)})
                      </div>
                    )}

                    {leaseMonths.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        {leaseMonths.map(chip)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Field>
            <Field label="Months covered">
              {(() => {
                const t = data.tenants.find((x) => x.id === form.tenantId);
                const prop = t && data.properties.find((p) => p.id === t.propertyId);
                const totalMonths = t ? leaseMonthCount(t) : 12;
                const alreadyPaid = t
                  ? data.payments.filter((p) => p.tenantId === t.id).reduce((s, p) => s + (Number(p.amount) || 0), 0)
                  : 0;
                const rent = prop ? Number(prop.rent) || 0 : 0;
                const paidMonths = rent > 0 ? Math.floor(alreadyPaid / rent) : 0;
                const remaining = Math.max(1, totalMonths - paidMonths);
                return (
                  <select
                    style={inputStyle}
                    value={form.monthsCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setForm({ ...form, monthsCount: count, amount: prop ? Number(prop.rent) * count : form.amount });
                    }}
                  >
                    {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n === 1 ? "1 month" : n + " months"}</option>
                    ))}
                  </select>
                );
              })()}
            </Field>
            <Field label="Total amount (TZS)"><input style={inputStyle} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Starting month"><input style={inputStyle} type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></Field>
            <Field label="Date paid"><input style={inputStyle} type="date" value={form.datePaid} onChange={(e) => setForm({ ...form, datePaid: e.target.value })} /></Field>
            <Field label="Method">
              <select style={inputStyle} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {["Mobile money", "Bank transfer", "Cash", "Other"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
            <button style={btnPrimary} onClick={submit}>Save payment</button>
            <button style={btnGhost} onClick={() => { setForm(null); setError(""); }}>Cancel</button>
            {error && (
              <span style={{ fontSize: 13.5, color: C.red, fontWeight: 700, background: "#F8E4DF", padding: "7px 12px", borderRadius: 8, maxWidth: 520 }}>
                ⚠ {error}
              </span>
            )}
            {!error && Number(form.monthsCount) > 1 && Number(form.amount) > 0 && (
              <span style={{ fontSize: 13, color: C.muted }}>
                = {fmtMoney(Math.round(Number(form.amount) / Number(form.monthsCount)))} per month, {monthLabel(form.month)} onwards
              </span>
            )}
          </div>
        </div>
      )}

      {data.payments.length === 0 && !form ? (
        <Empty text="No payments recorded yet. When a tenant pays rent, record it here." />
      ) : (
        data.payments.map((p) => {
          const t = data.tenants.find((x) => x.id === p.tenantId);
          const prop = data.properties.find((x) => x.id === p.propertyId);
          return (
            <div key={p.id} style={{ ...card, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{fmtMoney(p.amount)}</strong>
                  <Badge tone="green">{monthLabel(p.month)}</Badge>
                  {p.batchId && <Badge tone="gray">part of {p.batchCount}-month payment</Badge>}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {t ? t.name : "Unknown tenant"}{prop ? " · " + prop.name : ""} · {p.method} · paid {p.datePaid}
                </div>
              </div>
              {confirmId === p.id ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Delete?</span>
                  <button style={{ ...btnGhost, color: C.red }} onClick={() => remove(p.id)}>Yes</button>
                  <button style={btnGhost} onClick={() => setConfirmId(null)}>No</button>
                </div>
              ) : (
                <button style={{ ...btnGhost, color: C.red }} onClick={() => setConfirmId(p.id)}>Delete</button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- maintenance ----------
function Maintenance({ data, api }) {
  const [form, setForm] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const submit = async () => {
    if (!form.title) return;
    const rec = { ...form, id: uid(), date: form.date || new Date().toISOString().slice(0, 10) };
    await api.addMaintenance(rec);
    setForm(null);
  };

  const setStatus = (id, status) => api.setMaintenanceStatus(id, status);

  const remove = (id) => { api.deleteMaintenance(id); setConfirmId(null); };

  const statusTone = { open: "red", "in progress": "amber", done: "green" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Maintenance ({data.maintenance.filter((m) => m.status !== "done").length} open)</h2>
        {!form && <button style={btnPrimary} onClick={() => setForm({ title: "", propertyId: "", status: "open", cost: "", date: "" })}>+ Log issue</button>}
      </div>

      {form && (
        <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${C.leaf}` }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>New issue</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Issue"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leaking roof in kitchen" /></Field>
            <Field label="Property">
              <select style={inputStyle} value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                <option value="">— select —</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Estimated cost (TZS)"><input style={inputStyle} type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
            <Field label="Date reported"><input style={inputStyle} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={btnPrimary} onClick={submit}>Log issue</button>
            <button style={btnGhost} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {data.maintenance.length === 0 && !form ? (
        <Empty text="No maintenance issues logged. When something needs fixing, log it here so nothing gets forgotten." />
      ) : (
        data.maintenance.map((m) => {
          const prop = data.properties.find((p) => p.id === m.propertyId);
          return (
            <div key={m.id} style={{ ...card, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{m.title}</strong>
                  <Badge tone={statusTone[m.status] || "gray"}>{m.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                  {prop ? prop.name : "No property"} · reported {m.date}{m.cost ? " · est. " + fmtMoney(m.cost) : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {m.status !== "in progress" && m.status !== "done" && (
                  <button style={btnGhost} onClick={() => setStatus(m.id, "in progress")}>Start</button>
                )}
                {m.status !== "done" && (
                  <button style={{ ...btnGhost, color: C.leafDark }} onClick={() => setStatus(m.id, "done")}>Mark done</button>
                )}
                {confirmId === m.id ? (
                  <>
                    <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Delete?</span>
                    <button style={{ ...btnGhost, color: C.red }} onClick={() => remove(m.id)}>Yes</button>
                    <button style={btnGhost} onClick={() => setConfirmId(null)}>No</button>
                  </>
                ) : (
                  <button style={{ ...btnGhost, color: C.red }} onClick={() => setConfirmId(m.id)}>Delete</button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ---------- reports ----------
function Reports({ data }) {
  const [report, setReport] = useState("monthly");
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tenantId, setTenantId] = useState("");
  // report filters
  const [propFilter, setPropFilter] = useState("");      // monthly + yearly: limit to one property
  const [statusFilter, setStatusFilter] = useState("all"); // monthly: paid / partial / unpaid
  const [fromMonth, setFromMonth] = useState("");          // statement: period start
  const [toMonth, setToMonth] = useState("");              // statement: period end
  const [methodFilter, setMethodFilter] = useState("all"); // statement: payment method

  const th = { textAlign: "left", fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 10px", borderBottom: `2px solid ${C.line}` };
  const td = { fontSize: 14, padding: "9px 10px", borderBottom: `1px solid ${C.line}` };

  const rentOf = (propertyId) => {
    const p = data.properties.find((x) => x.id === propertyId);
    return p ? Number(p.rent) || 0 : 0;
  };

  const leaseMonthsOf = (t) => {
    const months = [];
    if (!t.leaseStart || !t.leaseEnd) return months;
    let y = Number(t.leaseStart.slice(0, 4));
    let m = Number(t.leaseStart.slice(5, 7));
    const ey = Number(t.leaseEnd.slice(0, 4));
    const em = Number(t.leaseEnd.slice(5, 7));
    while ((y < ey || (y === ey && m <= em)) && months.length < 48) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  };

  // ----- monthly collection report -----
  const monthlyRows = data.tenants.map((t) => {
    const prop = data.properties.find((p) => p.id === t.propertyId);
    const inLease = leaseMonthsOf(t).includes(month);
    const expected = inLease && prop ? Number(prop.rent) || 0 : 0;
    const paid = data.payments
      .filter((p) => p.tenantId === t.id && p.month === month)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { t, prop, expected, paid, inLease };
  })
    .filter((r) => r.inLease || r.paid > 0)
    .filter((r) => !propFilter || (r.prop && r.prop.id === propFilter))
    .filter((r) => {
      if (statusFilter === "all") return true;
      const full = r.expected > 0 && r.paid >= r.expected;
      const partial = r.paid > 0 && !full;
      const unpaid = r.expected > 0 && r.paid === 0;
      return (statusFilter === "paid" && full) || (statusFilter === "partial" && partial) || (statusFilter === "unpaid" && unpaid);
    });

  const monthlyTotals = monthlyRows.reduce(
    (acc, r) => ({ expected: acc.expected + r.expected, paid: acc.paid + r.paid }),
    { expected: 0, paid: 0 }
  );

  // ----- yearly property income report -----
  const yearlyRows = data.properties
    .filter((prop) => !propFilter || prop.id === propFilter)
    .map((prop) => {
    const collected = data.payments
      .filter((p) => p.propertyId === prop.id && p.month && p.month.startsWith(String(year)))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const repairs = data.maintenance
      .filter((m) => m.propertyId === prop.id && m.date && m.date.startsWith(String(year)))
      .reduce((s, m) => s + (Number(m.cost) || 0), 0);
    return { prop, collected, repairs, net: collected - repairs };
  });

  const yearlyTotals = yearlyRows.reduce(
    (acc, r) => ({ collected: acc.collected + r.collected, repairs: acc.repairs + r.repairs, net: acc.net + r.net }),
    { collected: 0, repairs: 0, net: 0 }
  );

  // ----- tenant statement -----
  const tenant = data.tenants.find((t) => t.id === tenantId);
  const tenantProp = tenant && data.properties.find((p) => p.id === tenant.propertyId);
  const tenantPayments = tenant
    ? data.payments
        .filter((p) => p.tenantId === tenant.id)
        .filter((p) => !fromMonth || p.month >= fromMonth)
        .filter((p) => !toMonth || p.month <= toMonth)
        .filter((p) => methodFilter === "all" || p.method === methodFilter)
        .slice()
        .sort((a, b) => (a.month > b.month ? 1 : -1))
    : [];
  const tenantPaid = tenant
    ? data.payments.filter((p) => p.tenantId === tenant.id).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : 0;
  const filteredPaid = tenantPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const tenantExpected = tenant && tenantProp ? leaseMonthsOf(tenant).length * (Number(tenantProp.rent) || 0) : 0;

  const reportBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setReport(id)}
      style={{
        background: report === id ? C.ink : "#fff",
        color: report === id ? "#fff" : C.text,
        border: `1px solid ${report === id ? C.ink : C.line}`,
        borderRadius: 8,
        padding: "9px 14px",
        fontSize: 13.5,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>Reports</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {reportBtn("monthly", "Monthly collection")}
        {reportBtn("yearly", "Property income (yearly)")}
        {reportBtn("statement", "Tenant statement")}
      </div>

      {report === "monthly" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Rent collection — {monthLabel(month)}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input style={{ ...inputStyle, width: "auto" }} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <select style={{ ...inputStyle, width: "auto" }} value={propFilter} onChange={(e) => setPropFilter(e.target.value)}>
                <option value="">All properties</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select style={{ ...inputStyle, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="paid">Paid only</option>
                <option value="partial">Partial only</option>
                <option value="unpaid">Not paid only</option>
              </select>
            </div>
          </div>
          {monthlyRows.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14 }}>No active leases or payments for this month.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Tenant</th>
                    <th style={th}>Property</th>
                    <th style={th}>Expected</th>
                    <th style={th}>Paid</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((r) => (
                    <tr key={r.t.id}>
                      <td style={td}>{r.t.name}</td>
                      <td style={td}>{r.prop ? r.prop.name : "—"}</td>
                      <td style={td}>{fmtMoney(r.expected)}</td>
                      <td style={td}>{fmtMoney(r.paid)}</td>
                      <td style={td}>
                        {r.paid >= r.expected && r.expected > 0 ? <Badge tone="green">Paid</Badge>
                          : r.paid > 0 ? <Badge tone="amber">Partial</Badge>
                          : r.expected > 0 ? <Badge tone="red">Not paid</Badge>
                          : <Badge tone="gray">Outside lease</Badge>}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, fontWeight: 800 }}>TOTAL</td>
                    <td style={td}></td>
                    <td style={{ ...td, fontWeight: 800 }}>{fmtMoney(monthlyTotals.expected)}</td>
                    <td style={{ ...td, fontWeight: 800 }}>{fmtMoney(monthlyTotals.paid)}</td>
                    <td style={td}>
                      {monthlyTotals.expected > 0 && (
                        <Badge tone={monthlyTotals.paid >= monthlyTotals.expected ? "green" : "amber"}>
                          {Math.round((monthlyTotals.paid / monthlyTotals.expected) * 100)}% collected
                        </Badge>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {report === "yearly" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Income per property — {year}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select style={{ ...inputStyle, width: "auto" }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 4 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select style={{ ...inputStyle, width: "auto" }} value={propFilter} onChange={(e) => setPropFilter(e.target.value)}>
                <option value="">All properties</option>
                {data.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {data.properties.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14 }}>No properties yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Property</th>
                    <th style={th}>Rent collected</th>
                    <th style={th}>Maintenance costs</th>
                    <th style={th}>Net income</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyRows.map((r) => (
                    <tr key={r.prop.id}>
                      <td style={td}>{r.prop.name}</td>
                      <td style={td}>{fmtMoney(r.collected)}</td>
                      <td style={{ ...td, color: r.repairs > 0 ? C.red : C.text }}>{r.repairs > 0 ? "− " + fmtMoney(r.repairs) : fmtMoney(0)}</td>
                      <td style={{ ...td, fontWeight: 700, color: r.net >= 0 ? C.leafDark : C.red }}>{fmtMoney(r.net)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, fontWeight: 800 }}>TOTAL</td>
                    <td style={{ ...td, fontWeight: 800 }}>{fmtMoney(yearlyTotals.collected)}</td>
                    <td style={{ ...td, fontWeight: 800, color: yearlyTotals.repairs > 0 ? C.red : C.text }}>{yearlyTotals.repairs > 0 ? "− " + fmtMoney(yearlyTotals.repairs) : fmtMoney(0)}</td>
                    <td style={{ ...td, fontWeight: 800, color: yearlyTotals.net >= 0 ? C.leafDark : C.red }}>{fmtMoney(yearlyTotals.net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {report === "statement" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Tenant statement</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...inputStyle, width: "auto", minWidth: 180 }} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                <option value="">— select tenant —</option>
                {data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span style={{ fontSize: 12.5, color: C.muted }}>From</span>
              <input style={{ ...inputStyle, width: "auto" }} type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
              <span style={{ fontSize: 12.5, color: C.muted }}>To</span>
              <input style={{ ...inputStyle, width: "auto" }} type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
              <select style={{ ...inputStyle, width: "auto" }} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                <option value="all">All methods</option>
                {["Mobile money", "Bank transfer", "Cash", "Other"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {(fromMonth || toMonth || methodFilter !== "all") && (
                <button style={btnGhost} onClick={() => { setFromMonth(""); setToMonth(""); setMethodFilter("all"); }}>Clear filters</button>
              )}
            </div>
          </div>

          {!tenant ? (
            <div style={{ color: C.muted, fontSize: 14 }}>Select a tenant to see their full statement.</div>
          ) : (
            <div>
              <div style={{ background: C.paper, borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 14 }}>
                <strong style={{ fontSize: 15 }}>{tenant.name}</strong>
                <div style={{ color: C.muted, marginTop: 4 }}>
                  {tenant.phone || "No phone"} · {tenantProp ? tenantProp.name : "No property"} ·
                  Lease {tenant.leaseStart || "?"} → {tenant.leaseEnd || "?"}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 18, flexWrap: "wrap", fontWeight: 700 }}>
                  <span>Lease total: {fmtMoney(tenantExpected)}</span>
                  <span style={{ color: C.leafDark }}>Paid: {fmtMoney(tenantPaid)}</span>
                  <span style={{ color: tenantExpected - tenantPaid > 0 ? "#8A6212" : C.leafDark }}>
                    {tenantExpected - tenantPaid > 0 ? "Pending: " + fmtMoney(tenantExpected - tenantPaid) : "✓ Fully paid"}
                  </span>
                </div>
              </div>

              {tenantPayments.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 14 }}>No payments match these filters for this tenant.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
                    Showing {tenantPayments.length} payment{tenantPayments.length === 1 ? "" : "s"} · total {fmtMoney(filteredPaid)}
                    {(fromMonth || toMonth || methodFilter !== "all") ? " (filtered)" : ""}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>For month</th>
                        <th style={th}>Amount</th>
                        <th style={th}>Date paid</th>
                        <th style={th}>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantPayments.map((p) => (
                        <tr key={p.id}>
                          <td style={td}>{monthLabel(p.month)}</td>
                          <td style={td}>{fmtMoney(p.amount)}</td>
                          <td style={td}>{p.datePaid}</td>
                          <td style={td}>{p.method}{p.batchId ? ` (part of ${p.batchCount}-month payment)` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
