import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

export default function AdminLogin() {
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!loginId.trim() || !password) {
            setError("Please enter the admin ID and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(`${API}/admin-auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loginId: loginId.trim(), password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Invalid admin credentials.");
            }

            if (!data.token || data.user?.role !== "admin") {
                throw new Error("Admin session could not be created.");
            }

            const adminUser = {
                user_id: data.user.user_id,
                username: data.user.username,
                created_at: data.user.created_at,
                role: "admin",
                token: data.token
            };

            localStorage.removeItem("mindEaseUser");
            sessionStorage.removeItem("mindEaseUser");

            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("mindEaseUser", JSON.stringify(adminUser));

            navigate("/admin", { replace: true });
        } catch (err) {
            setError(err.message || "Unable to sign in as admin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
                        <span className="text-4xl">🛡️</span>
                    </div>
                    <h1 className="text-4xl font-bold">
                        Mind<span className="text-emerald-500">Ease</span>
                    </h1>
                    <p className="text-gray-400 mt-3">Authorized support portal</p>
                </div>

                <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-semibold">Admin sign in</h2>
                    <p className="text-gray-400 mt-2 mb-7 text-sm">
                        Access is restricted to authorized administrators.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Admin ID
                            </label>
                            <input
                                type="text"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                placeholder="Enter admin ID"
                                autoComplete="username"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 px-4 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter admin password"
                                    autoComplete="current-password"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 px-4 pr-12 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer mb-6">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="accent-emerald-500"
                            />
                            Keep me signed in on this device
                        </label>

                        {error && (
                            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-gray-500 text-black font-semibold py-3.5 rounded-xl transition duration-200"
                        >
                            {loading ? "Signing in..." : "Sign in to admin portal"}
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="w-full mt-5 text-sm text-gray-500 hover:text-emerald-400 transition"
                    >
                        ← Back to student login
                    </button>
                </div>
            </div>
        </div>
    );
}
