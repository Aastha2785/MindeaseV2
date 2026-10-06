import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Navbar() {
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
            <div
                className="
                    max-w-7xl mx-auto
                    flex items-center justify-between
                    px-5 py-3
                    rounded-2xl
                    border border-white/10
                    bg-black/70
                    backdrop-blur-xl
                    shadow-lg
                "
            >
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2"
                >
                    <span className="text-2xl">🪻</span>

                    <span className="text-xl font-bold text-white">
                        MindEase
                    </span>
                </Link>

                {/* Navigation */}
                <div className="hidden md:flex items-center gap-6">

                    <Link
                        to="/"
                        className="text-gray-300 hover:text-white transition"
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/journaling"
                        className="text-gray-300 hover:text-white transition"
                    >
                        Journaling
                    </Link>

                    <Link
                        to="/face-scan"
                        className="text-gray-300 hover:text-white transition"
                    >
                        Face Scan
                    </Link>

                    <Link
                        to="/ai-analysis"
                        className="text-gray-300 hover:text-white transition"
                    >
                        AI Analysis
                    </Link>

                    <Link
                        to="/daily-tasks"
                        className="text-gray-300 hover:text-white transition"
                    >
                        Tasks
                    </Link>

                    <Link
                        to="/history"
                        className="text-gray-300 hover:text-white transition"
                    >
                        History
                    </Link>

                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="
                        relative
                        w-12 h-12
                        rounded-xl
                        flex items-center justify-center
                        border border-white/10
                        bg-white/10
                        hover:bg-white/20
                        transition-all duration-300
                        hover:scale-105
                    "
                    aria-label="Toggle theme"
                >
                    <span className="text-xl">
                        {theme === "dark" ? "🪻" : "🌙"}
                    </span>
                </button>

            </div>
        </nav>
    );
}

export default Navbar;