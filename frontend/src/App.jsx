import { Routes, Route, Navigate } from "react-router-dom";

import { useTheme } from "./context/ThemeContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Journaling from "./pages/Journaling";
import FaceScan from "./pages/FaceScan";
import AIAnalysis from "./pages/AIAnalysis";
import DailyTasks from "./pages/DailyTasks";
import WeeklyAnalysis from "./pages/WeeklyAnalysis";
import History from "./pages/History";
import Profile from "./pages/Profile";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function getStoredUser() {
    const raw = localStorage.getItem("mindEaseUser") || sessionStorage.getItem("mindEaseUser");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function HomeRoute() {
    const user = getStoredUser();
    if (user?.role === "admin") return <Navigate to="/admin" replace />;
    if (user) return <Dashboard />;
    return <Navigate to="/login" replace />;
}

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={
                theme === "dark"
                    ? "Switch to lavender theme"
                    : "Switch to dark theme"
            }
        >
            <span>
                {theme === "dark" ? "🪻" : "🌙"}
            </span>
        </button>
    );
}

function App() {
    return (
        <>
            <ThemeToggle />

            <Routes>
                <Route
                    path="/"
                    element={<HomeRoute />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/admin-login"
                    element={<AdminLogin />}
                />

                <Route
                    path="/admin"
                    element={<AdminDashboard />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/journaling"
                    element={<Journaling />}
                />

                <Route
                    path="/face-scan"
                    element={<FaceScan />}
                />

                <Route
                    path="/ai-analysis"
                    element={<AIAnalysis />}
                />

                <Route
                    path="/daily-tasks"
                    element={<DailyTasks />}
                />

                <Route
                    path="/weekly-analysis"
                    element={<WeeklyAnalysis />}
                />

                <Route
                    path="/history"
                    element={<History />}
                />

                <Route
                    path="/profile"
                    element={<Profile />}
                />

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </>
    );
}

export default App;