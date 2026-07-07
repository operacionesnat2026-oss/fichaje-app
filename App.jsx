import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ---------- helpers ---------- */

const LIMA_TZ = "America/Lima";

function fmtTime(d) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}
function fmtDate(d) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
function fmtDateShort(d) {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(d);
}

/* ---------- font / style injection ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      .ff-fraunces { font-family: 'Fraunces', serif; }
      .ff-mono { font-family: 'IBM Plex Mono', monospace; }
      .ff-body { font-family: 'Inter', system-ui, sans-serif; }
      .bg-ink { background-color: #12141B; }
      .bg-panel { background-color: #1C202B; }
      .bg-panel2 { background-color: #232838; }
      .text-paper { color: #EDE8DC; }
      .text-brass { color: #C9A15D; }
      .bg-brass { background-color: #C9A15D; }
      .border-brass { border-color: #C9A15D; }
      .text-muted { color: #8992A6; }
      .text-ink { color: #12141B; }
      .stamp-in { color: #4F7E63; }
      .stamp-out { color: #A85C42; }
      .border-line { border-color: #2C3140; }
      .bg-danger { background-color: #A64B4B; }
      .keypad-btn:active { transform: scale(0.94); }
      .stamp-anim { animation: stampHit 0.45s cubic-bezier(.2,1.4,.4,1); }
      @keyframes stampHit {
        0% { transform: scale(2.2) rotate(-8deg); opacity: 0; }
        60% { transform: scale(0.95) rotate(-8deg); opacity: 1; }
        100% { transform: scale(1) rotate(-8deg); opacity: 1; }
      }
      .punch-dot { width: 8px; height: 8px; border-radius: 50%; background: #12141B; box-shadow: inset 0 1px 1px rgba(0,0,0,0.4); }
    `}</style>
  );
}

function Keypad({ value, onChange, maxLen = 4 }) {
  const press = (d) => { if (value.length < maxLen) onChange(value + d); };
  const del = () => onChange(value.slice(0, -1));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", maxWidth: 320, margin: "0 auto" }}>
      {["1","2","3","4","5","6","7","8","9"].map((n) => (
        <button key={n} onClick={() => press(n)} className="keypad-btn ff-mono bg-panel2 text-paper border border-line" style={{ fontSize: 20, padding: "16px 0", borderRadius: 8, border: "1px solid #2C3140" }}>{n}</button>
      ))}
      <button onClick={del} className="keypad-btn ff-body text-muted" style={{ fontSize: 14, padding: "16px 0", borderRadius: 8, border: "1px solid #2C3140", background: "#232838" }}>Borrar</button>
      <button onClick={() => press("0")} className="keypad-btn ff-mono text-paper" style={{ fontSize: 20, padding: "16px 0", borderRadius: 8, border: "1px solid #2C3140", background: "#232838" }}>0</button>
      <div />
    </div>
  );
}

function PunchStamp({ type, time }) {
  const isIn = type === "entrada";
  return (
    <div className="stamp-anim" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", borderRadius: "9999px", border: `4px solid ${isIn ? "#4F7E63" : "#A85C42"}`, padding: "16px 24px" }}>
      <span className={isIn ? "ff-body stamp-in" : "ff-body stamp-out"} style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>{isIn ? "Entrada" : "Salida"}</span>
      <span className={isIn ? "ff-mono stamp-in" : "ff-mono stamp-out"} style={{ fontSize: 24, fontWeight: 600 }}>{fmtTime(time)}</span>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <div className="ff-mono text-paper" style={{ fontSize: 44, letterSpacing: 1 }}>{fmtTime(now)}</div>
      <div className="ff-body text-muted" style={{ fontSize: 14, marginTop: 4, textTransform: "capitalize" }}>{fmtDate(now)}</div>
    </div>
  );
}

/* ---------- main app ---------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [adminPin, setAdminPin] = useState("0000");

  const [screen, setScreen] = useState("select");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [justPunched, setJustPunched] = useState(null);
  const punchTimeout = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: emp } = await supabase.from("employees").select("*").order("name");
    const { data: rec } = await supabase.from("records").select("*").order("timestamp", { ascending: false });
    const { data: settings } = await supabase.from("settings").select("*").eq("key", "admin_pin").single();
    setEmployees(emp || []);
    setRecords(rec || []);
    setAdminPin(settings?.value || "0000");
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const lastRecordFor = (empId) => {
    const mine = records.filter((r) => r.employee_id === empId);
    if (mine.length === 0) return null;
    return mine.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
  };

  const chooseEmployee = (emp) => { setSelectedEmployee(emp); setPinInput(""); setPinError(""); setScreen("pin"); };

  const submitPin = () => {
    if (pinInput === selectedEmployee.pin) { setPinInput(""); setPinError(""); setScreen("clock"); }
    else { setPinError("PIN incorrecto"); setPinInput(""); }
  };
  useEffect(() => { if (screen === "pin" && pinInput.length === 4) submitPin(); /* eslint-disable-next-line */ }, [pinInput]);

  const doPunch = async () => {
    const last = lastRecordFor(selectedEmployee.id);
    const type = !last || last.type === "salida" ? "entrada" : "salida";
    const time = new Date();
    const { data, error } = await supabase.from("records").insert({
      employee_id: selectedEmployee.id, type, timestamp: time.toISOString(),
    }).select();
    if (!error && data) {
      setRecords([data[0], ...records]);
      setJustPunched({ type, time });
      if (punchTimeout.current) clearTimeout(punchTimeout.current);
      punchTimeout.current = setTimeout(() => setJustPunched(null), 2200);
    }
  };

  const logout = () => { setSelectedEmployee(null); setJustPunched(null); setScreen("select"); };

  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminPinError, setAdminPinError] = useState("");
  const submitAdminPin = () => {
    if (adminPinInput === adminPin) { setAdminPinInput(""); setAdminPinError(""); setScreen("admin"); }
    else { setAdminPinError("PIN incorrecto"); setAdminPinInput(""); }
  };
  useEffect(() => { if (screen === "adminPin" && adminPinInput.length === 4) submitAdminPin(); /* eslint-disable-next-line */ }, [adminPinInput]);

  if (loading) {
    return (
      <div className="bg-ink ff-body" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div className="text-muted" style={{ fontSize: 14 }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div className="bg-ink ff-body" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <GlobalStyle />
      <header style={{ padding: "32px 24px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="ff-fraunces text-paper" style={{ fontSize: 24, fontWeight: 600 }}>Control de Asistencia</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Registro de entradas y salidas</div>
        </div>
        {screen !== "admin" && screen !== "adminPin" && (
          <button onClick={() => setScreen("adminPin")} className="text-brass" style={{ fontSize: 12, border: "1px solid #C9A15D", borderRadius: 9999, padding: "6px 12px", background: "none" }}>Admin</button>
        )}
      </header>

      <main style={{ flex: 1, padding: "0 24px 40px", display: "flex", flexDirection: "column" }}>
        {screen === "select" && <EmployeeSelect employees={employees} onChoose={chooseEmployee} />}

        {screen === "pin" && selectedEmployee && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div className="ff-fraunces text-paper" style={{ fontSize: 20 }}>{selectedEmployee.name}</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Ingresá tu PIN de 4 dígitos</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[0,1,2,3].map((i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid #C9A15D", background: pinInput.length > i ? "#C9A15D" : "none" }} />
              ))}
            </div>
            {pinError && <div style={{ fontSize: 12, color: "#C97070" }}>{pinError}</div>}
            <Keypad value={pinInput} onChange={setPinInput} />
            <button onClick={() => setScreen("select")} className="text-muted" style={{ fontSize: 12, marginTop: 8, background: "none", border: "none" }}>← Volver</button>
          </div>
        )}

        {screen === "clock" && selectedEmployee && (
          <ClockScreen employee={selectedEmployee} records={records} justPunched={justPunched} onPunch={doPunch} onLogout={logout} />
        )}

        {screen === "adminPin" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div className="ff-fraunces text-paper" style={{ fontSize: 20 }}>Acceso administrador</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Ingresá el PIN de administrador</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[0,1,2,3].map((i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid #C9A15D", background: adminPinInput.length > i ? "#C9A15D" : "none" }} />
              ))}
            </div>
            {adminPinError && <div style={{ fontSize: 12, color: "#C97070" }}>{adminPinError}</div>}
            <Keypad value={adminPinInput} onChange={setAdminPinInput} />
            <button onClick={() => setScreen("select")} className="text-muted" style={{ fontSize: 12, marginTop: 8, background: "none", border: "none" }}>← Volver</button>
          </div>
        )}

        {screen === "admin" && (
          <AdminPanel
            employees={employees}
            records={records}
            adminPin={adminPin}
            onReload={loadAll}
            onExit={() => setScreen("select")}
          />
        )}
      </main>
    </div>
  );
}

function EmployeeSelect({ employees, onChoose }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
      <LiveClock />
      <div>
        <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>Elegí tu nombre</div>
        {employees.length === 0 ? (
          <div className="text-muted" style={{ textAlign: "center", fontSize: 14, maxWidth: 320, margin: "0 auto" }}>
            Todavía no hay empleados cargados. Pedile al administrador que los agregue desde el panel de Admin.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, maxWidth: 420, margin: "0 auto", width: "100%" }}>
            {employees.map((e) => (
              <button key={e.id} onClick={() => onChoose(e)} className="bg-panel text-paper ff-body" style={{ border: "1px solid #2C3140", borderRadius: 12, padding: "16px 12px", fontSize: 14 }}>{e.name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClockScreen({ employee, records, justPunched, onPunch, onLogout }) {
  const mine = records.filter((r) => r.employee_id === employee.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const last = mine[0] || null;
  const nextType = !last || last.type === "salida" ? "entrada" : "salida";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="ff-fraunces text-paper" style={{ fontSize: 20 }}>{employee.name}</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {last ? `Último registro: ${last.type} a las ${fmtTime(new Date(last.timestamp))}` : "Sin registros todavía"}
          </div>
        </div>
        <button onClick={onLogout} className="text-muted" style={{ fontSize: 12, border: "1px solid #2C3140", borderRadius: 9999, padding: "6px 12px", background: "none" }}>Salir</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>
        <LiveClock />
        {justPunched ? (
          <PunchStamp type={justPunched.type} time={justPunched.time} />
        ) : (
          <button onClick={onPunch} className={`ff-fraunces ${nextType === "entrada" ? "stamp-in" : "stamp-out"}`}
            style={{ width: 160, height: 160, borderRadius: "50%", fontSize: 18, fontWeight: 600, border: `4px solid ${nextType === "entrada" ? "#4F7E63" : "#A85C42"}`, background: "#1C202B" }}>
            Marcar<br />{nextType === "entrada" ? "Entrada" : "Salida"}
          </button>
        )}
      </div>

      <div>
        <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Tus últimos registros</div>
        <div className="bg-panel" style={{ border: "1px solid #2C3140", borderRadius: 12, maxHeight: 190, overflowY: "auto" }}>
          {mine.length === 0 && <div className="text-muted" style={{ padding: "12px 16px", fontSize: 14 }}>Todavía no marcaste nada.</div>}
          {mine.slice(0, 8).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #2C3140" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="punch-dot" style={{ background: r.type === "entrada" ? "#4F7E63" : "#A85C42" }} />
                <span className="text-paper" style={{ fontSize: 14, textTransform: "capitalize" }}>{r.type}</span>
              </div>
              <span className="ff-mono text-muted" style={{ fontSize: 12 }}>{fmtDateShort(new Date(r.timestamp))} · {fmtTime(new Date(r.timestamp))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ employees, records, adminPin, onReload, onExit }) {
  const [tab, setTab] = useState("employees");
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [formError, setFormError] = useState("");
  const [filterEmp, setFilterEmp] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newAdminPin, setNewAdminPin] = useState("");
  const [pinSaved, setPinSaved] = useState(false);

  const addEmployee = async () => {
    setFormError("");
    if (!newName.trim()) { setFormError("Poné un nombre."); return; }
    if (!/^\d{4}$/.test(newPin)) { setFormError("El PIN debe tener 4 dígitos."); return; }
    if (employees.some((e) => e.pin === newPin)) { setFormError("Ese PIN ya lo usa otro empleado."); return; }
    const { error } = await supabase.from("employees").insert({ name: newName.trim(), pin: newPin });
    if (error) { setFormError("Error al guardar: " + error.message); return; }
    setNewName(""); setNewPin(""); onReload();
  };

  const removeEmployee = async (id) => {
    await supabase.from("employees").delete().eq("id", id);
    setConfirmDelete(null); onReload();
  };

  const saveAdminPin = async () => {
    if (!/^\d{4}$/.test(newAdminPin)) return;
    await supabase.from("settings").upsert({ key: "admin_pin", value: newAdminPin });
    setNewAdminPin(""); setPinSaved(true); onReload();
    setTimeout(() => setPinSaved(false), 2000);
  };

  const filteredRecords = records.filter((r) => filterEmp === "all" || r.employee_id === filterEmp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const nameFor = (id) => employees.find((e) => e.id === id)?.name || "(eliminado)";

  const exportCsv = () => {
    const header = "Empleado,Tipo,Fecha,Hora\n";
    const rows = filteredRecords.map((r) => {
      const d = new Date(r.timestamp);
      return `${nameFor(r.employee_id)},${r.type},${fmtDateShort(d)},${fmtTime(d)}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fichajes_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="ff-fraunces text-paper" style={{ fontSize: 20 }}>Panel de administrador</div>
        <button onClick={onExit} className="text-muted" style={{ fontSize: 12, border: "1px solid #2C3140", borderRadius: 9999, padding: "6px 12px", background: "none" }}>Cerrar</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["employees","Empleados"],["records","Registros"],["settings","Ajustes"]].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 9999, border: tab===key ? "1px solid #C9A15D" : "1px solid #2C3140", background: tab===key ? "#C9A15D" : "none", color: tab===key ? "#12141B" : "#8992A6" }}>{label}</button>
        ))}
      </div>

      {tab === "employees" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="bg-panel" style={{ border: "1px solid #2C3140", borderRadius: 12, padding: 16 }}>
            <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Agregar empleado</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre y apellido" className="text-paper" style={{ background: "#232838", border: "1px solid #2C3140", borderRadius: 8, padding: "8px 12px", fontSize: 14 }} />
              <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="PIN de 4 dígitos" className="ff-mono text-paper" style={{ background: "#232838", border: "1px solid #2C3140", borderRadius: 8, padding: "8px 12px", fontSize: 14 }} />
              {formError && <div style={{ fontSize: 12, color: "#C97070" }}>{formError}</div>}
              <button onClick={addEmployee} className="text-ink" style={{ background: "#C9A15D", borderRadius: 8, padding: "8px 0", fontSize: 14, fontWeight: 500, border: "none", marginTop: 4 }}>Agregar</button>
            </div>
          </div>

          <div>
            <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Empleados ({employees.length})</div>
            <div className="bg-panel" style={{ border: "1px solid #2C3140", borderRadius: 12 }}>
              {employees.length === 0 && <div className="text-muted" style={{ padding: "12px 16px", fontSize: 14 }}>Todavía no agregaste a nadie.</div>}
              {employees.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #2C3140" }}>
                  <div>
                    <div className="text-paper" style={{ fontSize: 14 }}>{e.name}</div>
                    <div className="ff-mono text-muted" style={{ fontSize: 12 }}>PIN {e.pin}</div>
                  </div>
                  {confirmDelete === e.id ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => removeEmployee(e.id)} className="text-paper" style={{ fontSize: 12, background: "#A64B4B", borderRadius: 9999, padding: "4px 12px", border: "none" }}>Confirmar</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-muted" style={{ fontSize: 12, border: "1px solid #2C3140", borderRadius: 9999, padding: "4px 12px", background: "none" }}>Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(e.id)} className="text-muted" style={{ fontSize: 12, border: "1px solid #2C3140", borderRadius: 9999, padding: "4px 12px", background: "none" }}>Eliminar</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "records" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} className="text-paper" style={{ background: "#232838", border: "1px solid #2C3140", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}>
              <option value="all">Todos los empleados</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button onClick={exportCsv} className="text-ink" style={{ fontSize: 12, background: "#C9A15D", borderRadius: 9999, padding: "8px 16px", fontWeight: 500, border: "none", marginLeft: "auto" }}>Exportar CSV</button>
          </div>
          <div className="bg-panel" style={{ border: "1px solid #2C3140", borderRadius: 12, maxHeight: 420, overflowY: "auto" }}>
            {filteredRecords.length === 0 && <div className="text-muted" style={{ padding: "12px 16px", fontSize: 14 }}>No hay registros para mostrar.</div>}
            {filteredRecords.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #2C3140" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="punch-dot" style={{ background: r.type === "entrada" ? "#4F7E63" : "#A85C42" }} />
                  <div>
                    <div className="text-paper" style={{ fontSize: 14 }}>{nameFor(r.employee_id)}</div>
                    <div className="text-muted" style={{ fontSize: 12, textTransform: "capitalize" }}>{r.type}</div>
                  </div>
                </div>
                <span className="ff-mono text-muted" style={{ fontSize: 12 }}>{fmtDateShort(new Date(r.timestamp))} · {fmtTime(new Date(r.timestamp))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="bg-panel" style={{ border: "1px solid #2C3140", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
          <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>PIN de administrador</div>
          <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>PIN actual: {adminPin}</div>
          <input value={newAdminPin} onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Nuevo PIN de 4 dígitos" className="ff-mono text-paper" style={{ background: "#232838", border: "1px solid #2C3140", borderRadius: 8, padding: "8px 12px", fontSize: 14 }} />
          <button onClick={saveAdminPin} className="text-ink" style={{ background: "#C9A15D", borderRadius: 8, padding: "8px 0", fontSize: 14, fontWeight: 500, border: "none", marginTop: 4 }}>Guardar</button>
          {pinSaved && <div className="stamp-in" style={{ fontSize: 12, marginTop: 4 }}>PIN actualizado.</div>}
        </div>
      )}
    </div>
  );
}
