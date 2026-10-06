import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin`;

function getStoredUser() {
    const raw = localStorage.getItem("mindEaseUser") || sessionStorage.getItem("mindEaseUser");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function clearSession() {
    localStorage.removeItem("mindEaseUser");
    sessionStorage.removeItem("mindEaseUser");
}

const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const formatDay = (value) => {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const stressTone = (value) => {
    const n = Number(value || 0);
    if (n > 70) return { label: "High", cls: "bg-rose-50 text-rose-700" };
    if (n > 50) return { label: "Elevated", cls: "bg-amber-50 text-amber-700" };
    return { label: "Normal", cls: "bg-emerald-50 text-emerald-700" };
};

function Badge({ children, className = "" }) {
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function Stat({ label, value, note }) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>;
}

function Empty({ title, text }) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>;
}

function TrendModal({ data, onClose }) {
    const trend = data?.trend || [];
    const max = Math.max(100, ...trend.map((p) => Number(p.stress_percentage || 0)));
    const latest = trend[trend.length - 1];
    const latestStress = Number(latest?.stress_percentage || 0);
    const tone = stressTone(latestStress);

    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Student trend</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{data.student_ref}</h2>
                    <p className="mt-1 text-sm text-slate-500">Only consented daily stress data is shown.</p>
                </div>
                <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Latest stress</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{latest ? `${latestStress.toFixed(0)}%` : "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Level</p>
                    <div className="mt-2"><Badge className={tone.cls}>{latest ? tone.label : "No data"}</Badge></div>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Daily stress</h3>
                    <span className="text-xs text-slate-400">Last 60 days</span>
                </div>
                {trend.length ? <>
                    <div className="mt-5 flex h-48 items-end gap-1 border-b border-slate-100">
                        {trend.map((point) => {
                            const value = Math.max(2, Number(point.stress_percentage || 0));
                            const height = Math.min(100, (value / max) * 100);
                            const color = value > 70 ? "bg-rose-400" : value > 50 ? "bg-amber-400" : "bg-emerald-400";
                            return <div key={String(point.day)} className="group relative flex h-full flex-1 items-end" title={`${formatDay(point.day)} · ${value.toFixed(0)}%`}>
                                <div className={`w-full rounded-t-md ${color}`} style={{ height: `${height}%` }} />
                            </div>;
                        })}
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-slate-400">
                        <span>{formatDay(trend[0]?.day)}</span><span>{formatDay(trend[trend.length - 1]?.day)}</span>
                    </div>
                </> : <p className="py-12 text-center text-sm text-slate-500">No daily stress data available.</p>}
            </div>
        </div>
    </div>;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(getStoredUser);
    const [tab, setTab] = useState("overview");
    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedTrend, setSelectedTrend] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const call = useCallback(async (path, options = {}) => {
        const current = getStoredUser();
        if (!current?.token || current.role !== "admin") throw new Error("Admin session not found.");
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${current.token}`, ...(options.headers || {}) }
        });
        let data = {};
        try { data = await response.json(); } catch {}
        if (response.status === 401 || response.status === 403) {
            clearSession(); setUser(null); navigate("/admin-login", { replace: true });
            throw new Error(data.error || "Admin session expired.");
        }
        if (!response.ok) throw new Error(data.error || "Request failed");
        return data;
    }, [navigate]);

    const loadOverview = useCallback(async () => setOverview(await call("/overview")), [call]);
    const loadStudents = useCallback(async () => {
        const params = new URLSearchParams({ page: "1", limit: "50" });
        if (search.trim()) params.set("search", search.trim());
        const data = await call(`/users?${params}`);
        setStudents(data.users || []);
    }, [call, search]);
    const loadAlerts = useCallback(async () => setAlerts((await call("/alerts")).alerts || []), [call]);

    const refresh = useCallback(async () => {
        try {
            setError(""); setLoading(true);
            await Promise.all([loadOverview(), loadStudents(), loadAlerts()]);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, [loadOverview, loadStudents, loadAlerts]);

    useEffect(() => {
        if (!user?.token || user.role !== "admin") { navigate("/admin-login", { replace: true }); return; }
        refresh();
    }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

    const openTrend = async (id) => {
        try { setError(""); setSelectedTrend(await call(`/users/${id}/trend`)); }
        catch (e) { setError(e.message); }
    };

    const updateAlert = async (id, status) => {
        try {
            await call(`/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
            await loadAlerts();
            await loadOverview();
        } catch (e) { setError(e.message); }
    };

    const logout = () => { clearSession(); setUser(null); navigate("/admin-login", { replace: true }); };

    const openAlerts = alerts.filter((a) => a.status !== "resolved").length;
    const highStressStudents = students.filter((s) => Number(s.stress_percentage || 0) > 50).length;
    const nav = [
        ["overview", "Overview"],
        ["students", "Students"],
        ["alerts", `Alerts${openAlerts ? ` (${openAlerts})` : ""}`]
    ];

    const trend = overview?.trend || [];
    const maxTrend = Math.max(100, ...trend.map((x) => Math.abs(Number(x.avg_valence || 0))));

    return <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-[1300px]">
            <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
                <div>
                    <div className="text-2xl font-black tracking-tight">Mind<span className="text-purple-600">Ease</span></div>
                    <p className="mt-1 text-xs text-slate-500">Admin portal</p>
                </div>
                <nav className="mt-8 space-y-1">
                    {nav.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${tab === key ? "bg-purple-50 text-purple-700" : "text-slate-600 hover:bg-slate-50"}`}>
                        {label}
                    </button>)}
                </nav>
                <div className="mt-auto">
                    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Journal text and images are never shown here. Stress data is visible only with student consent.</div>
                    <button onClick={logout} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Sign out</button>
                </div>
            </aside>

            <main className="min-w-0 flex-1 p-4 md:p-8">
                <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-purple-600">MindEase</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight">{tab === "overview" ? "Good morning" : tab === "students" ? "Students" : "Alerts"}</h1>
                        <p className="mt-1 text-sm text-slate-500">{tab === "overview" ? "A simple view of student wellness signals." : tab === "students" ? "View consented stress information." : "Review students who may need support."}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{loading ? "Refreshing…" : "Refresh"}</button>
                        <div className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm sm:block">{user?.username || "Admin"}</div>
                    </div>
                </header>

                {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

                {tab === "overview" && <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Stat label="Students" value={overview?.users?.total_users ?? "—"} note="Registered students" />
                        <Stat label="Active" value={overview?.users?.active_accounts ?? "—"} note="Active accounts" />
                        <Stat label="Open alerts" value={openAlerts} note="Need review" />
                        <Stat label="Elevated stress" value={highStressStudents} note="Consent-based student data" />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <div className="flex items-center justify-between"><div><h2 className="font-bold">30-day mood trend</h2><p className="mt-1 text-xs text-slate-500">Aggregate data only.</p></div></div>
                            {trend.length ? <div className="mt-6 flex h-52 items-center gap-1">
                                {trend.map((point) => {
                                    const value = Number(point.avg_valence || 0);
                                    const height = Math.max(4, Math.abs(value) / maxTrend * 80);
                                    return <div key={String(point.day)} className="flex h-full flex-1 items-center justify-center" title={`${formatDay(point.day)} · ${value.toFixed(2)}`}><div className={`w-full max-w-4 rounded ${value < 0 ? "bg-rose-300" : "bg-emerald-300"}`} style={{ height: `${height}%` }} /></div>;
                                })}
                            </div> : <p className="py-20 text-center text-sm text-slate-500">Not enough aggregate data yet.</p>}
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-6">
                            <div className="flex items-center justify-between"><h2 className="font-bold">Recent alerts</h2><button onClick={() => setTab("alerts")} className="text-sm font-semibold text-purple-600">View all</button></div>
                            <div className="mt-4 space-y-3">
                                {alerts.slice(0, 4).map((alert) => <div key={alert.alert_id} className="rounded-xl border border-slate-100 p-3">
                                    <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{alert.student_ref}</span><Badge className={alert.status === "resolved" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}>{alert.status}</Badge></div>
                                    <p className="mt-1 text-sm text-slate-600">{Number(alert.stress_percentage || 0).toFixed(0)}% stress</p>
                                </div>)}
                                {!alerts.length && <p className="py-10 text-center text-sm text-slate-500">No alerts yet.</p>}
                            </div>
                        </section>
                    </div>
                </div>}

                {tab === "students" && <section className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Students</h2><p className="mt-1 text-sm text-slate-500">Only consented stress information is displayed.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></div></div>
                    <div className="divide-y divide-slate-100">
                        {students.map((student) => <div key={student.user_id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="font-semibold text-slate-900">{student.student_ref}</p><p className="text-sm text-slate-500">{student.username}</p></div>
                            <div className="flex items-center gap-3">
                                <Badge className={student.account_status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>{student.account_status}</Badge>
                                <Badge className={student.consent_share ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-500"}>{student.consent_share ? "Consent on" : "Private"}</Badge>
                                {student.consent_share ? <button onClick={() => openTrend(student.user_id)} className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700">View stress</button> : <span className="text-xs text-slate-400">Stress hidden</span>}
                            </div>
                        </div>)}
                        {!students.length && <div className="p-8"><Empty title="No students found" text="Try another search." /></div>}
                    </div>
                </section>}

                {tab === "alerts" && <section className="space-y-4">
                    {!alerts.length && <Empty title="No alerts" text="When a consented student's daily stress goes above 50%, an alert will appear here." />}
                    {alerts.map((alert) => {
                        const stress = Number(alert.stress_percentage || 0);
                        const tone = stressTone(stress);
                        return <article key={alert.alert_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{alert.student_ref}</h2><Badge className={tone.cls}>{stress.toFixed(0)}% · {tone.label}</Badge><Badge className={alert.status === "resolved" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}>{alert.status}</Badge></div>
                                    <p className="mt-2 text-sm text-slate-500">{formatDate(alert.created_at)}</p>
                                    <p className="mt-3 text-sm text-slate-700">Daily stress crossed the 50% support threshold.</p>
                                </div>
                                {alert.status !== "resolved" && <div className="flex gap-2"><button onClick={() => updateAlert(alert.alert_id, "contacted")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Mark contacted</button><button onClick={() => updateAlert(alert.alert_id, "resolved")} className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700">Resolve</button></div>}
                            </div>
                        </article>;
                    })}
                </section>}
            </main>
        </div>
        {selectedTrend && <TrendModal data={selectedTrend} onClose={() => setSelectedTrend(null)} />}
    </div>;
}
