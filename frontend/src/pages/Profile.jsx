import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function getCurrentUser() {
    const localUser = localStorage.getItem("mindEaseUser");
    const sessionUser = sessionStorage.getItem("mindEaseUser");

    const savedUser = localUser || sessionUser;

    if (!savedUser) {
        return null;
    }

    try {
        return JSON.parse(savedUser);
    } catch {
        return null;
    }
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function Profile() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const isLight = theme === "light";

    const user = getCurrentUser();

    const username = user?.username || "User";
    const userId = user?.user_id || "—";
    const createdAt = formatDate(user?.created_at);

    const profileImageKey = user?.user_id
        ? `mindEaseProfileImage_${user.user_id}`
        : null;

    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        if (!profileImageKey) {
            setProfileImage(null);
            return;
        }

        const savedImage =
            localStorage.getItem(profileImageKey);

        setProfileImage(savedImage || null);
    }, [profileImageKey]);

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Please choose an image smaller than 5 MB.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const imageData = reader.result;

            try {
                localStorage.setItem(
                    profileImageKey,
                    imageData
                );

                setProfileImage(imageData);

                window.dispatchEvent(
                    new Event("mindEaseProfileUpdated")
                );
            } catch (error) {
                console.error(
                    "Profile image save error:",
                    error
                );

                alert(
                    "The image could not be saved. Please try a smaller image."
                );
            }
        };

        reader.readAsDataURL(file);

        event.target.value = "";
    };

    const handleRemoveImage = () => {
        if (!profileImageKey) {
            return;
        }

        localStorage.removeItem(profileImageKey);

        setProfileImage(null);

        window.dispatchEvent(
            new Event("mindEaseProfileUpdated")
        );
    };

    const handleLogout = () => {
        localStorage.removeItem("mindEaseUser");
        sessionStorage.removeItem("mindEaseUser");

        navigate("/login");
    };

    const pageBackground = isLight
        ? "bg-gradient-to-br from-[#faf7ff] via-[#f0e6ff] to-[#e9d5ff] text-[#352044]"
        : "bg-gradient-to-br from-[#001f18] via-[#00382d] to-[#001a14] text-white";

    const card = isLight
        ? "bg-[#f1e6fb] border-purple-200 shadow-[0_10px_30px_rgba(126,34,206,0.08)]"
        : "bg-[#032b22] border-emerald-800/70 shadow-[0_10px_30px_rgba(0,0,0,0.3)]";

    const innerCard = isLight
        ? "bg-[#e9dcf8] border-purple-200"
        : "bg-[#063d31] border-emerald-800/70";

    const primaryText = isLight
        ? "text-[#352044]"
        : "text-white";

    const secondaryText = isLight
        ? "text-[#765d87]"
        : "text-emerald-100/65";

    const mutedText = isLight
        ? "text-[#80658f]"
        : "text-emerald-100/50";

    const accentText = isLight
        ? "text-purple-700"
        : "text-emerald-300";

    const iconBox = isLight
        ? "bg-purple-100 border-purple-200"
        : "bg-[#064638] border-emerald-800";

    return (
        <div
            className={`min-h-screen transition-all duration-500 ${pageBackground}`}
        >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* BACK BUTTON */}

                <button
                    onClick={() => navigate("/")}
                    className={`text-sm font-medium mb-6 transition ${
                        isLight
                            ? "text-purple-700 hover:text-purple-900"
                            : "text-emerald-300 hover:text-emerald-200"
                    }`}
                >
                    ← Back to Dashboard
                </button>

                {/* PROFILE HEADER */}

                <section
                    className={`${card} rounded-3xl p-6 sm:p-8 border mb-6`}
                >
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* PROFILE IMAGE */}

                        <div className="relative shrink-0">

                            <div
                                className={`w-32 h-32 rounded-full overflow-hidden border-4 flex items-center justify-center ${
                                    isLight
                                        ? "border-purple-300 bg-purple-100"
                                        : "border-emerald-500/50 bg-[#064638]"
                                }`}
                            >
                                {profileImage ? (
                                    <img
                                        src={profileImage}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-6xl">
                                        👤
                                    </span>
                                )}
                            </div>

                            {/* CAMERA BUTTON */}

                            <label
                                htmlFor="profile-picture"
                                className={`absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-2 transition ${
                                    isLight
                                        ? "bg-purple-600 text-white border-white hover:bg-purple-700"
                                        : "bg-emerald-500 text-black border-[#032b22] hover:bg-emerald-400"
                                }`}
                                title="Upload profile picture"
                            >
                                📷
                            </label>

                            <input
                                id="profile-picture"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        {/* USER INFO */}

                        <div className="text-center sm:text-left flex-1">

                            <p
                                className={`text-sm font-medium mb-1 ${accentText}`}
                            >
                                MindEase Account
                            </p>

                            <h1
                                className={`text-3xl sm:text-4xl font-bold ${primaryText}`}
                            >
                                {username}
                            </h1>

                            <p
                                className={`text-sm mt-2 ${secondaryText}`}
                            >
                                Your personal MindEase profile
                            </p>

                            <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-5">

                                <label
                                    htmlFor="profile-picture"
                                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition ${
                                        isLight
                                            ? "bg-purple-600 text-white hover:bg-purple-700"
                                            : "bg-emerald-500 text-black hover:bg-emerald-400"
                                    }`}
                                >
                                    📷{" "}
                                    {profileImage
                                        ? "Change Picture"
                                        : "Upload Picture"}
                                </label>

                                {profileImage && (
                                    <button
                                        onClick={
                                            handleRemoveImage
                                        }
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                                            isLight
                                                ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                                        }`}
                                    >
                                        🗑 Remove
                                    </button>
                                )}
                            </div>

                            <p
                                className={`text-xs mt-3 ${mutedText}`}
                            >
                                JPG, PNG or other image formats •
                                Maximum 5 MB
                            </p>
                        </div>
                    </div>
                </section>

                {/* ACCOUNT INFORMATION */}

                <section
                    className={`${card} rounded-3xl p-6 sm:p-8 border mb-6`}
                >
                    <div className="flex items-center gap-3 mb-6">

                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBox}`}
                        >
                            👤
                        </div>

                        <div>
                            <h2
                                className={`text-xl font-bold ${primaryText}`}
                            >
                                Account Information
                            </h2>

                            <p
                                className={`text-xs ${mutedText}`}
                            >
                                Your MindEase account details
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        <div
                            className={`${innerCard} rounded-2xl p-5 border`}
                        >
                            <p
                                className={`text-xs mb-2 ${mutedText}`}
                            >
                                Username
                            </p>

                            <p
                                className={`text-lg font-semibold ${primaryText}`}
                            >
                                {username}
                            </p>
                        </div>

                        <div
                            className={`${innerCard} rounded-2xl p-5 border`}
                        >
                            <p
                                className={`text-xs mb-2 ${mutedText}`}
                            >
                                User ID
                            </p>

                            <p
                                className={`text-lg font-semibold ${primaryText}`}
                            >
                                #{userId}
                            </p>
                        </div>

                        <div
                            className={`${innerCard} rounded-2xl p-5 border sm:col-span-2`}
                        >
                            <p
                                className={`text-xs mb-2 ${mutedText}`}
                            >
                                Account Created
                            </p>

                            <p
                                className={`text-lg font-semibold ${primaryText}`}
                            >
                                {createdAt}
                            </p>
                        </div>
                    </div>
                </section>

                {/* APPEARANCE */}

                <section
                    className={`${card} rounded-3xl p-6 sm:p-8 border mb-6`}
                >
                    <div className="flex items-center gap-3 mb-6">

                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBox}`}
                        >
                            {isLight ? "☀️" : "🌙"}
                        </div>

                        <div>
                            <h2
                                className={`text-xl font-bold ${primaryText}`}
                            >
                                Appearance
                            </h2>

                            <p
                                className={`text-xs ${mutedText}`}
                            >
                                Customize how MindEase looks.
                            </p>
                        </div>
                    </div>

                    <div
                        className={`${innerCard} rounded-2xl p-5 border flex items-center justify-between gap-4`}
                    >
                        <div>
                            <p
                                className={`font-semibold ${primaryText}`}
                            >
                                {isLight
                                    ? "Light Theme"
                                    : "Dark Theme"}
                            </p>

                            <p
                                className={`text-sm mt-1 ${secondaryText}`}
                            >
                                {isLight
                                    ? "Lavender wellness theme"
                                    : "Emerald wellness theme"}
                            </p>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`relative w-16 h-9 rounded-full transition-all duration-300 ${
                                isLight
                                    ? "bg-purple-500"
                                    : "bg-emerald-500"
                            }`}
                            aria-label="Toggle theme"
                        >
                            <span
                                className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-sm transition-all duration-300 ${
                                    isLight
                                        ? "left-8"
                                        : "left-1"
                                }`}
                            >
                                {isLight ? "☀️" : "🌙"}
                            </span>
                        </button>
                    </div>
                </section>

                {/* ABOUT MINDEASE */}

                <section
                    className={`${card} rounded-3xl p-6 sm:p-8 border mb-6`}
                >
                    <div className="flex items-center gap-3 mb-4">

                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBox}`}
                        >
                            🧠
                        </div>

                        <div>
                            <h2
                                className={`text-xl font-bold ${primaryText}`}
                            >
                                About MindEase
                            </h2>

                            <p
                                className={`text-xs ${mutedText}`}
                            >
                                Your personal wellness companion
                            </p>
                        </div>
                    </div>

                    <p
                        className={`text-sm leading-7 ${secondaryText}`}
                    >
                        MindEase helps you reflect on your emotions,
                        understand your daily patterns, and stay
                        connected with your personal wellness.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">

                        <FeatureBox
                            light={isLight}
                            icon="📝"
                            text="Journaling"
                        />

                        <FeatureBox
                            light={isLight}
                            icon="📷"
                            text="Face Scan"
                        />

                        <FeatureBox
                            light={isLight}
                            icon="🧠"
                            text="AI Analysis"
                        />

                        <FeatureBox
                            light={isLight}
                            icon="✓"
                            text="Daily Tasks"
                        />
                    </div>
                </section>

                {/* LOGOUT */}

                <section
                    className={`${card} rounded-3xl p-6 border`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        <div>
                            <h2
                                className={`font-bold ${primaryText}`}
                            >
                                Sign out
                            </h2>

                            <p
                                className={`text-sm mt-1 ${mutedText}`}
                            >
                                Sign out of your MindEase account on
                                this device.
                            </p>
                        </div>

                        <button
                            onClick={handleLogout}
                            className={`px-5 py-3 rounded-xl font-semibold transition ${
                                isLight
                                    ? "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                            }`}
                        >
                            ↪ Logout
                        </button>
                    </div>
                </section>

                <p
                    className={`text-xs text-center mt-8 pb-4 ${mutedText}`}
                >
                    MindEase • Mental wellness companion
                </p>
            </div>
        </div>
    );
}

function FeatureBox({
    light,
    icon,
    text
}) {
    return (
        <div
            className={`rounded-xl p-4 border text-center ${
                light
                    ? "bg-[#e9dcf8] border-purple-200"
                    : "bg-[#063d31] border-emerald-800/70"
            }`}
        >
            <div className="text-xl mb-2">
                {icon}
            </div>

            <p
                className={`text-xs font-medium ${
                    light
                        ? "text-purple-700"
                        : "text-emerald-300"
                }`}
            >
                {text}
            </p>
        </div>
    );
}

export default Profile;