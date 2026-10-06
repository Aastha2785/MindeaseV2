import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!username.trim() || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
    `${API}/auth/register`,
    {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username.trim(),
                        password: password,
                        confirmPassword: confirmPassword
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Registration failed."
                );
            }

            setSuccess("Account created successfully! 🎉");

            setUsername("");
            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-8">

            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">

                    <div className="w-20 h-20 mx-auto mb-4 rounded-full border border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
                        <span className="text-4xl">🧠</span>
                    </div>

                    <h1 className="text-4xl font-bold">
                        Mind<span className="text-emerald-500">Ease</span>
                    </h1>

                    <p className="text-gray-400 mt-3">
                        Your space for better mental wellness
                    </p>

                </div>

                {/* Register Card */}
                <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl">

                    <div className="mb-7">

                        <h2 className="text-2xl font-semibold">
                            Create your account
                        </h2>

                        <p className="text-gray-400 mt-2 text-sm">
                            Start your wellness journey with MindEase
                        </p>

                    </div>

                    <form onSubmit={handleRegister}>

                        {/* Username */}
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
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Choose a username"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />

                            </div>

                        </div>

                        {/* Password */}
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
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Create a password"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>

                            </div>

                        </div>

                        {/* Confirm Password */}
                        <div className="mb-6">

                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Confirm Password
                            </label>

                            <div className="relative">

                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                    🔒
                                </span>

                                <input
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="Confirm your password"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-gray-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition"
                                >
                                    {showConfirmPassword
                                        ? "🙈"
                                        : "👁️"}
                                </button>

                            </div>

                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                                {success}
                            </div>
                        )}

                        {/* Create Account */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-gray-500 text-black font-semibold py-3.5 rounded-xl transition duration-200"
                        >
                            {loading
                                ? "Creating Account..."
                                : "Create Account"}
                        </button>

                    </form>

                    {/* Login */}
                    <p className="text-center text-sm text-gray-500 mt-7">

                        Already have an account?{" "}

                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="text-emerald-500 hover:text-emerald-400 font-medium transition"
                        >
                            Login
                        </button>

                    </p>

                </div>

            </div>

        </div>
    );
}

export default Register;