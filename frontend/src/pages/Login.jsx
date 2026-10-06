import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");

        if (!username.trim() || !password) {
            setError(
                "Please enter your username and password."
            );
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
    `${API}/auth/login`,
    {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username.trim(),
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Invalid username or password."
                );
            }

            if (!data.user || !data.user.user_id) {
                throw new Error(
                    "Login succeeded, but user information was not received."
                );
            }

            if (!data.token) {
                throw new Error("Login succeeded, but authentication token was not received.");
            }

            const userData = {
                user_id: data.user.user_id,
                username: data.user.username,
                created_at: data.user.created_at,
                role: data.user.role || "student",
                token: data.token
            };

            /*
             * IMPORTANT:
             * Clear BOTH storage locations first.
             *
             * This prevents an older account from remaining
             * in the browser when switching users.
             */
            localStorage.removeItem("mindEaseUser");
            sessionStorage.removeItem("mindEaseUser");

            /*
             * Now store ONLY the newly logged-in user.
             */
            if (rememberMe) {
                localStorage.setItem(
                    "mindEaseUser",
                    JSON.stringify(userData)
                );
            } else {
                sessionStorage.setItem(
                    "mindEaseUser",
                    JSON.stringify(userData)
                );
            }

            navigate("/");
        } catch (error) {
            console.error("Login Error:", error);

            setError(
                error.message ||
                    "Something went wrong while logging in."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">

                <div className="text-center mb-8">

                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
                        <span className="text-4xl">
                            🧠
                        </span>
                    </div>

                    <h1 className="text-4xl font-bold">
                        Mind
                        <span className="text-emerald-500">
                            Ease
                        </span>
                    </h1>

                    <p className="text-gray-400 mt-3">
                        Your space for better mental wellness
                    </p>

                </div>

                <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl">

                    <div className="mb-7">

                        <h2 className="text-2xl font-semibold">
                            Welcome back
                        </h2>

                        <p className="text-gray-400 mt-2 text-sm">
                            Sign in to continue to your account
                        </p>

                    </div>

                    <form onSubmit={handleLogin}>

                        <div className="mb-5">

                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Username
                            </label>

                            <div className="relative">

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                    👤
                                </span>

                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your username"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />

                            </div>

                        </div>

                        <div className="mb-5">

                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>

                            <div className="relative">

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                    🔒
                                </span>

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Enter your password"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                                >
                                    {showPassword
                                        ? "🙈"
                                        : "👁️"}
                                </button>

                            </div>

                        </div>

                        <div className="flex items-center mb-6">

                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">

                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) =>
                                        setRememberMe(
                                            e.target.checked
                                        )
                                    }
                                    className="accent-emerald-500"
                                />

                                Remember me

                            </label>

                        </div>

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
                            {loading
                                ? "Logging in..."
                                : "Login"}
                        </button>

                    </form>

                    <p className="text-center text-sm text-gray-500 mt-7">

                        Don't have an account?{" "}

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/register")
                            }
                            className="text-emerald-500 hover:text-emerald-400 font-medium transition"
                        >
                            Create account
                        </button>

                    </p>

                </div>

            </div>
        </div>
    );
}

export default Login;