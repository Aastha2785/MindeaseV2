import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function getGreeting() {

    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {

        return "Good morning";

    }

    if (hour >= 12 && hour < 17) {

        return "Good afternoon";

    }

    return "Good evening";

}

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

function getTodayString() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

function isToday(dateValue) {

    if (!dateValue) {

        return false;

    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {

        return false;

    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}` === getTodayString();

}

function Dashboard() {

    const navigate = useNavigate();

    const { theme } = useTheme();

    const isLight = theme === "light";

    const [tasks, setTasks] = useState([]);

    const [moodData, setMoodData] = useState(null);

    const [stressLevel, setStressLevel] = useState("Low");

    const [consentShare, setConsentShare] = useState(false);

    const [consentLoading, setConsentLoading] = useState(false);

    const user = getCurrentUser();

    const userId = user?.user_id;

    const [profileImage, setProfileImage] = useState(null);

    const taskStorageKey = userId

        ? `mindEaseTasks_${userId}`

        : null;

    const journalStorageKey = userId

        ? `mindEaseJournalAnalysis_${userId}`

        : null;

    const faceStorageKey = userId

        ? `mindEaseFaceAnalysis_${userId}`

        : null;

    const profileImageKey = userId

        ? `mindEaseProfileImage_${userId}`

        : null;

    const combineMoodData = (journal) => {

        if (!journal || !journal.emotions) {

            return null;

        }

        const emotions = journal.emotions

            .map((item) => ({

                emotion: item.emotion,

                percentage: Number(item.percentage)

            }))

            .filter(

                (item) =>

                    item.emotion &&

                    Number.isFinite(item.percentage)

            )

            .sort(

                (a, b) =>

                    b.percentage - a.percentage

            );

        if (emotions.length === 0) {

            return null;

        }

        const total = emotions.reduce(

            (sum, item) =>

                sum + item.percentage,

            0

        );

        if (total > 0 && total !== 100) {

            emotions.forEach((item) => {

                item.percentage = Math.round(

                    (item.percentage / total) * 100

                );

            });

            const correctedTotal =

                emotions.reduce(

                    (sum, item) =>

                        sum + item.percentage,

                    0

                );

            emotions[0].percentage +=

                100 - correctedTotal;

        }

        return {

            emotions,

            dominantEmotion:

                emotions[0].emotion,

            dominantPercentage:

                emotions[0].percentage

        };

    };

    const loadDashboardData = async () => {

        if (!userId) {

            setTasks([]);

            setMoodData(null);

            setStressLevel("Low");

            setProfileImage(null);

            return;

        }

        /* -------------------------
           LOAD PROFILE PICTURE
           ------------------------- */

        const savedProfileImage =

            localStorage.getItem(profileImageKey);

        setProfileImage(

            savedProfileImage || null

        );

        /* -------------------------
           LOAD ALL PENDING TASKS
           ------------------------- */

        const savedTasks =

            localStorage.getItem(taskStorageKey);

        let pendingTasks = [];

        if (savedTasks) {

            try {

                const parsedTasks = JSON.parse(savedTasks);

                if (Array.isArray(parsedTasks)) {

                    pendingTasks = parsedTasks.filter(

                        (task) => !(task.is_completed || task.completed)

                    );

                }

            } catch {

                pendingTasks = [];

            }

        }

        setTasks(pendingTasks);

        try {

            if (user?.token) {

                const consentResponse = await fetch(`${API}/auth/consent`, {

                    headers: { Authorization: `Bearer ${user.token}` }

                });

                if (consentResponse.ok) {

                    const consentData = await consentResponse.json();

                    setConsentShare(Boolean(consentData.consent_share));

                }

            }

        } catch (error) {

            console.error("Consent preference load error:", error);

        }

        /* -------------------------
           LOAD JOURNAL FROM DATABASE
           (dashboard must reflect saved journals)
           ------------------------- */

        let journalAnalysis = null;

        try {

            const token = user?.token;

            if (token) {

                const response = await fetch(

                    `${API}/journal/history`,

                    { headers: { Authorization: `Bearer ${token}` } }

                );

                if (response.ok) {

                    const data = await response.json();

                    const todayJournal = (data.journals || []).find((journal) =>

                        isToday(journal.created_at)

                    );

                    if (todayJournal) {

                        const emotions = Array.isArray(todayJournal.emotions)

                            ? todayJournal.emotions.map((item) => ({

                                  emotion: item.emotion,

                                  percentage: Number(item.percentage)

                              }))

                            : [];

                        journalAnalysis = emotions.length

                            ? {

                                  emotions,

                                  dominantEmotion: todayJournal.overall_mood || emotions[0].emotion,

                                  dominantPercentage: Math.max(...emotions.map((item) => item.percentage))

                              }

                            : todayJournal.overall_mood

                              ? {

                                    emotions: [{ emotion: todayJournal.overall_mood, percentage: 100 }],

                                    dominantEmotion: todayJournal.overall_mood,

                                    dominantPercentage: 100

                                }

                              : null;

                    }

                }

            }

            // Keep localStorage as a fallback for immediately-created entries.

            if (!journalAnalysis) {

                const savedJournal = localStorage.getItem(journalStorageKey);

                if (savedJournal) {

                    const parsedJournal = JSON.parse(savedJournal);

                    if (parsedJournal?.analysis) {

                        journalAnalysis = parsedJournal.analysis;

                    }

                }

            }

        } catch (error) {

            console.error("Dashboard journal load error:", error);

        }

        /* -------------------------
           LOAD TODAY'S FACE ANALYSIS
           ------------------------- */

        const savedFace =

            localStorage.getItem(

                faceStorageKey

            );

        let faceAnalysis = null;

        try {

            if (savedFace) {

                const parsedFace =

                    JSON.parse(savedFace);

                if (

                    parsedFace &&

                    isToday(

                        parsedFace.timestamp ||

                            parsedFace.createdAt ||

                            parsedFace.date

                    )

                ) {

                    faceAnalysis =

                        parsedFace.analysis ||

                        null;

                }

            }

        } catch {

            faceAnalysis = null;

        }

        /* Dashboard Overall Mood is based on
           JOURNAL analysis only.

           Face Scan can be used separately
           in AI Analysis, but a face scan alone
           must not create Dashboard mood data.
        */

        const combinedMood =

            journalAnalysis

                ? combineMoodData(

                      journalAnalysis

                  )

                : null;

        setMoodData(combinedMood);

        /* -------------------------
           CALCULATE STRESS
           ------------------------- */

        if (combinedMood) {

            const stress =

                combinedMood.emotions

                    .filter(

                        (item) =>

                            item.emotion ===

                                "Stress" ||

                            item.emotion ===

                                "Anxiety"

                    )

                    .reduce(

                        (sum, item) =>

                            sum +

                            item.percentage,

                        0

                    );

            if (stress >= 40) {

                setStressLevel("High");

            } else if (stress >= 20) {

                setStressLevel("Moderate");

            } else {

                setStressLevel("Low");

            }

        } else {

            setStressLevel("Low");

        }

    };

    useEffect(() => {

        loadDashboardData();

        const handleDataUpdated = () => {

            loadDashboardData();

        };

        window.addEventListener(

            "mindEaseTasksUpdated",

            handleDataUpdated

        );

        window.addEventListener(

            "mindEaseJournalUpdated",

            handleDataUpdated

        );

        window.addEventListener(

            "mindEaseFaceUpdated",

            handleDataUpdated

        );

        window.addEventListener(

            "mindEaseProfileUpdated",

            handleDataUpdated

        );

        window.addEventListener(

            "storage",

            handleDataUpdated

        );

        const interval = setInterval(

            () => {

                loadDashboardData();

            },

            60000

        );

        return () => {

            window.removeEventListener(

                "mindEaseTasksUpdated",

                handleDataUpdated

            );

            window.removeEventListener(

                "mindEaseJournalUpdated",

                handleDataUpdated

            );

            window.removeEventListener(

                "mindEaseFaceUpdated",

                handleDataUpdated

            );

            window.removeEventListener(

                "mindEaseProfileUpdated",

                handleDataUpdated

            );

            window.removeEventListener(

                "storage",

                handleDataUpdated

            );

            clearInterval(interval);

        };

    }, [userId]);

    const handleConsentToggle = async () => {

        if (!user?.token || consentLoading) return;

        const nextValue = !consentShare;

        setConsentLoading(true);

        try {

            const response = await fetch(`${API}/auth/consent`, {

                method: "PATCH",

                headers: {

                    "Content-Type": "application/json",

                    Authorization: `Bearer ${user.token}`

                },

                body: JSON.stringify({ consent_share: nextValue })

            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Unable to update preference");

            setConsentShare(Boolean(data.consent_share));

        } catch (error) {

            console.error("Consent update error:", error);

            alert(error.message);

        } finally {

            setConsentLoading(false);

        }

    };

    const pendingTasks = tasks.filter(

        (task) => !(task.completed || task.is_completed)

    );

    const totalTasks = pendingTasks.length;

    const completedTasks = 0;

    const completionPercentage = 0;

    const getMoodEmoji = (emotion) => {

        const emotionEmoji = {

            Happiness: "😊",

            Calm: "😌",

            Neutral: "😐",

            Stress: "😟",

            Sadness: "😔",

            Anxiety: "😰",

            Anger: "😡",

            Fatigue: "😴",

            Excitement: "🤩",

            Fear: "😨"

        };

        return (

            emotionEmoji[emotion] ||

            "🙂"

        );

    };

    const getWellnessInsight = () => {

        if (

            totalTasks === 0 &&

            !moodData

        ) {

            return "Add tasks and check in with your mood. MindEase will build your wellness summary as you use the app.";

        }

        if (

            totalTasks === 0 &&

            moodData

        ) {

            return `Your current mood appears to be mostly ${moodData.dominantEmotion.toLowerCase()} at ${moodData.dominantPercentage}%. Your pending tasks are shown below so you can keep track of what remains.`;

        }

        if (

            totalTasks > 0 &&

            !moodData

        ) {

            return `You have ${totalTasks} pending tasks. Add and analyze a journal entry to build your mood summary.`;

        }

        if (

            completionPercentage >= 75 &&

            moodData.dominantPercentage >=

                40

        ) {

            return `You have ${totalTasks} pending tasks. Your mood is mainly ${moodData.dominantEmotion.toLowerCase()} at ${moodData.dominantPercentage}%. Keep making steady progress while giving yourself time to recharge.`;

        }

        if (stressLevel === "High") {

            return `You have ${totalTasks} pending tasks. Your current journal mood shows stronger stress-related signals, so consider taking a short break before continuing with demanding tasks.`;

        }

        if (completionPercentage < 50) {

            return `You have ${totalTasks} pending tasks. There is still time to make progress, but remember that productivity is about steady progress rather than completing everything at once.`;

        }

        return `You have ${totalTasks} pending tasks. Your mood is mainly ${moodData.dominantEmotion.toLowerCase()}. Keep balancing productivity with time to rest and recharge.`;

    };

    const dashboardEmotions =

        moodData

            ? moodData.emotions.slice(0, 5)

            : [];

    return (

        <div

            className={`min-h-screen flex transition-all duration-500 ${

                isLight

                    ? "bg-gradient-to-br from-[#faf7ff] via-[#f0e6ff] to-[#e9d5ff] text-[#352044]"

                    : "bg-black text-white"

            }`}

        >

            {/* SIDEBAR */}

            <aside

                className={`w-64 hidden md:flex flex-col border-r transition-all duration-500 ${

                    isLight

                        ? "bg-gradient-to-b from-[#eadcff] via-[#f4edff] to-[#e8dafa] border-purple-300/40"

                        : "bg-gradient-to-b from-emerald-950 via-emerald-950/70 to-black border-emerald-500/30"

                }`}

            >

                <div

                    className={`px-6 py-7 border-b ${

                        isLight

                            ? "border-purple-300/40"

                            : "border-emerald-500/20"

                    }`}

                >

                    <h1

                        className={`text-3xl font-bold ${

                            isLight

                                ? "text-[#352044]"

                                : "text-white"

                        }`}

                    >

                        Mind

                        <span

                            className={

                                isLight

                                    ? "text-purple-600"

                                    : "text-emerald-400"

                            }

                        >

                            Ease

                        </span>

                    </h1>

                    <p

                        className={`text-xs mt-2 ${

                            isLight

                                ? "text-purple-700/60"

                                : "text-emerald-300/60"

                        }`}

                    >

                        Mental wellness companion

                    </p>

                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">

                    <SidebarButton

                        active

                        light={isLight}

                        icon="⌂"

                        text="Dashboard"

                        onClick={() =>

                            navigate("/")

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="✎"

                        text="Journaling"

                        onClick={() =>

                            navigate(

                                "/journaling"

                            )

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="◉"

                        text="Face Scan"

                        onClick={() =>

                            navigate(

                                "/face-scan"

                            )

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="♧"

                        text="AI Analysis"

                        onClick={() =>

                            navigate(

                                "/ai-analysis"

                            )

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="✓"

                        text="Daily Tasks"

                        onClick={() =>

                            navigate(

                                "/daily-tasks"

                            )

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="▥"

                        text="Weekly Analysis"

                        onClick={() =>

                            navigate(

                                "/weekly-analysis"

                            )

                        }

                    />

                    <SidebarButton

                        light={isLight}

                        icon="📖"

                        text="History"

                        onClick={() =>

                            navigate(

                                "/history"

                            )

                        }

                    />

                </nav>

                <div

                    className={`px-4 pb-6 border-t pt-4 space-y-2 ${

                        isLight

                            ? "border-purple-300/40"

                            : "border-emerald-500/20"

                    }`}

                >

                    <SidebarButton

                        light={isLight}

                        icon="♙"

                        text="Profile"

                        onClick={() =>

                            navigate(

                                "/profile"

                            )

                        }

                    />

                    <button

                        onClick={() => {

                            localStorage.removeItem(

                                "mindEaseUser"

                            );

                            sessionStorage.removeItem(

                                "mindEaseUser"

                            );

                            navigate("/login");

                        }}

                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${

                            isLight

                                ? "text-purple-700 hover:bg-purple-200/60 hover:text-purple-900"

                                : "text-emerald-200 hover:bg-red-500/10 hover:text-red-400"

                        }`}

                    >

                        <span>↪</span>

                        Logout

                    </button>

                </div>

            </aside>

            {/* MAIN */}

            <main

                className={`flex-1 min-w-0 transition-all duration-500 ${

                    isLight

                        ? "bg-transparent"

                        : "bg-black"

                }`}

            >

                {/* HEADER */}

                <header

                    className={`relative overflow-hidden border-b px-6 md:px-10 py-7 transition-all duration-500 ${

                        isLight

                            ? "bg-gradient-to-r from-[#e8d8ff] via-[#f5efff] to-[#dcbcff] border-purple-300/40"

                            : "bg-gradient-to-r from-emerald-950 via-emerald-900/40 to-black border-emerald-500/30"

                    }`}

                >

                    <div

                        className={`absolute -right-20 -top-32 w-96 h-96 rounded-full blur-3xl ${

                            isLight

                                ? "bg-purple-400/30"

                                : "bg-emerald-500/20"

                        }`}

                    />

                    <div className="relative flex items-center justify-between">

                        <div>

                            <p

                                className={`text-sm mb-2 font-medium ${

                                    isLight

                                        ? "text-purple-600"

                                        : "text-emerald-400"

                                }`}

                            >

                                {getGreeting()} 👋

                            </p>

                            <h2

                                className={`text-3xl md:text-4xl font-bold ${

                                    isLight

                                        ? "text-[#352044]"

                                        : "text-white"

                                }`}

                            >

                                How are you feeling today?

                            </h2>

                            <p

                                className={`mt-2 ${

                                    isLight

                                        ? "text-purple-700/65"

                                        : "text-emerald-100/60"

                                }`}

                            >

                                Take a moment to check in with yourself.

                            </p>

                        </div>

                        {/* SHARE INFO WITH ADMIN */}
                        <div className="flex items-center gap-3 mr-2">
                            <span
                                className={`text-xs font-medium whitespace-nowrap ${
                                    isLight ? "text-[#5c426e]" : "text-emerald-100/70"
                                }`}
                            >
                                Share info with admin
                            </span>

                            {/* Accessible switch toggle */}
                            <button
                                type="button"
                                role="switch"
                                aria-checked={consentShare}
                                aria-label="Share info with admin"
                                title={consentShare ? "Admin sharing is ON" : "Admin sharing is OFF"}
                                onClick={handleConsentToggle}
                                disabled={consentLoading}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    consentShare
                                        ? isLight
                                            ? "bg-purple-600 focus:ring-purple-400"
                                            : "bg-emerald-500 focus:ring-emerald-400"
                                        : isLight
                                        ? "bg-gray-300 focus:ring-gray-400"
                                        : "bg-slate-700 focus:ring-slate-500"
                                } ${
                                    consentLoading
                                        ? "cursor-wait opacity-60"
                                        : "cursor-pointer"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ease-in-out ${
                                        consentShare ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* PROFILE PICTURE */}

                        <button

                            onClick={() =>

                                navigate("/profile")

                            }

                            className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center font-semibold border-2 transition-all duration-300 hover:scale-105 ${

                                isLight

                                    ? "bg-gradient-to-br from-purple-400 to-purple-600 text-white border-purple-300 shadow-lg shadow-purple-400/30"

                                    : "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/30"

                            }`}

                            title="Open Profile"

                        >

                            {profileImage ? (

                                <img

                                    src={profileImage}

                                    alt="Profile"

                                    className="w-full h-full object-cover"

                                />

                            ) : (

                                <span className="text-2xl">

                                    👤

                                </span>

                            )}

                        </button>

                    </div>

                </header>

                <div className="p-6 md:p-10 max-w-[1500px] mx-auto">

                    {/* SUMMARY CARDS */}

                    <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">

                        {/* MOOD */}

                        <SummaryCard

                            light={isLight}

                            type="mood"

                        >

                            <p

                                className={

                                    isLight

                                        ? "text-purple-700 text-sm"

                                        : "text-emerald-100 text-sm"

                                }

                            >

                                Overall Mood

                            </p>

                            {moodData ? (

                                <div className="flex items-center gap-3 mt-2">

                                    <span className="text-4xl">

                                        {getMoodEmoji(

                                            moodData.dominantEmotion

                                        )}

                                    </span>

                                    <div>

                                        <h3

                                            className={`text-3xl font-bold ${

                                                isLight

                                                    ? "text-[#352044]"

                                                    : "text-white"

                                            }`}

                                        >

                                            {

                                                moodData.dominantPercentage

                                            }%

                                        </h3>

                                        <p

                                            className={

                                                isLight

                                                    ? "text-purple-700 text-sm"

                                                    : "text-emerald-100 text-sm"

                                            }

                                        >

                                            {

                                                moodData.dominantEmotion

                                            }

                                        </p>

                                    </div>

                                </div>

                            ) : (

                                <>

                                    <h3

                                        className={`text-4xl font-bold mt-2 ${

                                            isLight

                                                ? "text-[#352044]"

                                                : "text-white"

                                        }`}

                                    >

                                        —

                                    </h3>

                                    <p

                                        className={`text-sm mt-3 ${

                                            isLight

                                                ? "text-purple-700"

                                                : "text-emerald-100"

                                        }`}

                                    >

                                        No mood data yet

                                    </p>

                                </>

                            )}

                        </SummaryCard>

                        {/* TASKS */}

                        <SummaryCard

                            light={isLight}

                            type="tasks"

                        >

                            <p

                                className={

                                    isLight

                                        ? "text-purple-700 text-sm"

                                        : "text-emerald-50 text-sm"

                                }

                            >

                                Pending Tasks

                            </p>

                            <h3

                                className={`text-4xl font-bold mt-2 ${

                                    isLight

                                        ? "text-[#352044]"

                                        : "text-white"

                                }`}

                            >

                                {completedTasks} /{" "}

                                {totalTasks}

                            </h3>

                            <p

                                className={`text-sm mt-3 ${

                                    isLight

                                        ? "text-purple-700"

                                        : "text-emerald-100"

                                }`}

                            >

                                {totalTasks === 0 ? "All caught up" : "still pending"}

                            </p>

                        </SummaryCard>

                        {/* STRESS */}

                        <SummaryCard

                            light={isLight}

                            type="stress"

                        >

                            <p

                                className={

                                    isLight

                                        ? "text-purple-700 text-sm"

                                        : "text-emerald-100 text-sm"

                                }

                            >

                                Stress Level

                            </p>

                            <h3

                                className={`text-4xl font-bold mt-2 ${

                                    isLight

                                        ? "text-purple-600"

                                        : "text-emerald-300"

                                }`}

                            >

                                {stressLevel}

                            </h3>

                            <p

                                className={`text-sm mt-3 ${

                                    isLight

                                        ? "text-purple-700"

                                        : "text-emerald-200"

                                }`}

                            >

                                {stressLevel ===

                                "Low"

                                    ? "Looking good today"

                                    : stressLevel ===

                                      "Moderate"

                                    ? "Take some time to recharge"

                                    : "Consider taking a break"}

                            </p>

                        </SummaryCard>

                    </section>

                    {/* ALL PENDING TASKS */}

                    <section

                        className={`rounded-2xl p-6 mb-7 border transition-all duration-500 ${

                            isLight

                                ? "bg-[#eee4fa] border-purple-300/40 shadow-lg shadow-purple-200/20"

                                : "bg-gradient-to-b from-emerald-950/80 to-black border-emerald-500/30"

                        }`}

                    >

                        <div className="flex items-center justify-between gap-4 mb-5">

                            <div>

                                <h3 className={`text-xl font-semibold ${isLight ? "text-[#352044]" : "text-white"}`}>

                                    Pending Tasks

                                </h3>

                                <p className={`text-sm mt-1 ${isLight ? "text-purple-700/60" : "text-emerald-200/50"}`}>

                                    All unfinished tasks, regardless of when you added them

                                </p>

                            </div>

                            <button

                                onClick={() => navigate("/daily-tasks")}

                                className={`rounded-xl px-4 py-2 text-sm font-semibold ${isLight ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-emerald-400 text-black hover:bg-emerald-300"}`}

                            >

                                Manage Tasks

                            </button>

                        </div>

                        {pendingTasks.length > 0 ? (

                            <div className="space-y-3">

                                {pendingTasks.map((task) => (

                                    <div key={task.id} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${isLight ? "border-purple-100 bg-purple-50/60" : "border-emerald-900/30 bg-black/30"}`}>

                                        <div className="min-w-0">

                                            <p className={`font-medium truncate ${isLight ? "text-purple-950" : "text-white"}`}>{task.task || task.title || "Untitled task"}</p>

                                            {task.deadline && <p className={`mt-1 text-xs ${isLight ? "text-purple-600" : "text-emerald-200/60"}`}>Due: {task.deadline}</p>}

                                        </div>

                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${isLight ? "bg-amber-100 text-amber-700" : "bg-amber-400/10 text-amber-300"}`}>Pending</span>

                                    </div>

                                ))}

                            </div>

                        ) : (

                            <div className={`rounded-xl border border-dashed p-8 text-center ${isLight ? "border-purple-200 bg-purple-50/40" : "border-emerald-900/30 bg-black/20"}`}>

                                <div className="text-3xl mb-2">🎉</div>

                                <p className={`font-medium ${isLight ? "text-purple-900" : "text-white"}`}>No pending tasks</p>

                                <p className={`text-sm mt-1 ${isLight ? "text-purple-600" : "text-emerald-200/60"}`}>You're all caught up.</p>

                            </div>

                        )}

                    </section>

                    {/* TODAY'S WELLNESS INSIGHT */}

                                            

<section

                        className={`relative overflow-hidden rounded-2xl p-7 mb-7 border shadow-xl transition-all duration-500 ${

                            isLight

                                ? "bg-gradient-to-r from-[#e7d5ff] via-[#f8f3ff] to-[#dfc5ff] border-purple-300/50 shadow-purple-300/20"

                                : "bg-gradient-to-r from-emerald-900 via-emerald-800/70 to-emerald-950 border-emerald-400/40 shadow-emerald-950/40"

                        }`}

                    >

                        <div

                            className={`absolute right-0 top-0 w-80 h-80 rounded-full blur-3xl ${

                                isLight

                                    ? "bg-purple-400/20"

                                    : "bg-emerald-400/10"

                            }`}

                        />

                        <div className="relative">

                            <div className="flex items-center gap-4 mb-5">

                                <div

                                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${

                                        isLight

                                            ? "bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-purple-400/30"

                                            : "bg-emerald-400 text-black"

                                    }`}

                                >

                                    ✦

                                </div>

                                <div>

                                    <h3

                                        className={`text-xl font-semibold ${

                                            isLight

                                                ? "text-[#352044]"

                                                : "text-white"

                                        }`}

                                    >

                                        Today's Wellness Insight

                                    </h3>

                                    <p

                                        className={`text-sm ${

                                            isLight

                                                ? "text-purple-700/60"

                                                : "text-emerald-200/60"

                                        }`}

                                    >

                                        Your daily mood & productivity summary

                                    </p>

                                </div>

                            </div>

                            <p

                                className={`leading-8 max-w-3xl ${

                                    isLight

                                        ? "text-[#5c426e]"

                                        : "text-emerald-50/90"

                                }`}

                            >

                                {getWellnessInsight()}

                            </p>

                        </div>

                    </section>

                    {/* QUICK ACTIONS */}

                    <section

                        className={`rounded-2xl p-6 mb-7 border transition-all duration-500 ${

                            isLight

                                ? "bg-[#eee4fa] border-purple-300/40 shadow-lg shadow-purple-200/20"

                                : "bg-gradient-to-b from-emerald-950/80 to-black border-emerald-500/30"

                        }`}

                    >

                        <div className="mb-5">

                            <h3

                                className={`text-xl font-semibold ${

                                    isLight

                                        ? "text-[#352044]"

                                        : "text-white"

                                }`}

                            >

                                Quick Actions

                            </h3>

                            <p

                                className={`text-sm mt-1 ${

                                    isLight

                                        ? "text-purple-700/55"

                                        : "text-emerald-200/50"

                                }`}

                            >

                                Check in with yourself

                            </p>

                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

                            <QuickAction

                                light={isLight}

                                icon="📝"

                                title="Journal"

                                description="Write your thoughts"

                                onClick={() =>

                                    navigate(

                                        "/journaling"

                                    )

                                }

                            />

                            <QuickAction

                                light={isLight}

                                icon="📷"

                                title="Face Scan"

                                description="Check expression"

                                onClick={() =>

                                    navigate(

                                        "/face-scan"

                                    )

                                }

                            />

                            <QuickAction

                                light={isLight}

                                icon="🧠"

                                title="AI Analysis"

                                description="Understand your mood"

                                onClick={() =>

                                    navigate(

                                        "/ai-analysis"

                                    )

                                }

                            />

                            <QuickAction

                                light={isLight}

                                icon="✓"

                                title="Tasks"

                                description="Track progress"

                                onClick={() =>

                                    navigate(

                                        "/daily-tasks"

                                    )

                                }

                            />

                            <QuickAction

                                light={isLight}

                                icon="📖"

                                title="History"

                                description="View your past entries"

                                onClick={() =>

                                    navigate(

                                        "/history"

                                    )

                                }

                            />

                        </div>

                    </section>

                    {/* MOOD DISTRIBUTION */}

                    <section className="grid grid-cols-1 gap-7">

                        <div

                            className={`rounded-2xl p-7 border transition-all duration-500 ${

                                isLight

                                    ? "bg-[#eee4fa] border-purple-300/40 shadow-lg shadow-purple-200/20"

                                    : "bg-gradient-to-br from-emerald-950/70 to-black border-emerald-500/30"

                            }`}

                        >

                            <h3

                                className={`text-xl font-semibold ${

                                    isLight

                                        ? "text-[#352044]"

                                        : "text-white"

                                }`}

                            >

                                Mood Distribution

                            </h3>

                            <p

                                className={`text-sm mt-1 mb-7 ${

                                    isLight

                                        ? "text-purple-700/55"

                                        : "text-emerald-200/50"

                                }`}

                            >

                                Today's detected emotions

                            </p>

                            {dashboardEmotions.length >

                            0 ? (

                                <div className="space-y-6">

                                    {dashboardEmotions.map(

                                        (item) => (

                                            <MoodBar

                                                key={

                                                    item.emotion

                                                }

                                                light={

                                                    isLight

                                                }

                                                emoji={getMoodEmoji(

                                                    item.emotion

                                                )}

                                                name={

                                                    item.emotion

                                                }

                                                percentage={`${item.percentage}%`}

                                                width={`${item.percentage}%`}

                                            />

                                        )

                                    )}

                                </div>

                            ) : (

                                <div

                                    className={`py-10 text-center border rounded-2xl ${

                                        isLight

                                            ? "border-purple-200 bg-white/60"

                                            : "border-emerald-900/30 bg-black/30"

                                    }`}

                                >

                                    <div className="text-4xl mb-3">

                                        🌱

                                    </div>

                                    <p

                                        className={`font-medium ${

                                            isLight

                                                ? "text-[#4c365d]"

                                                : "text-gray-300"

                                        }`}

                                    >

                                        No mood analysis yet

                                    </p>

                                    <p

                                        className={`text-sm mt-2 ${

                                            isLight

                                                ? "text-purple-700/55"

                                                : "text-gray-600"

                                        }`}

                                    >

                                        Add and analyze a journal entry to see your mood distribution.

                                    </p>

                                </div>

                            )}

                        </div>

                    </section>

                    {/* DAILY AFFIRMATION */}

                    <section

                        className={`mt-7 rounded-2xl p-7 border transition-all duration-500 ${

                            isLight

                                ? "bg-gradient-to-r from-[#eee4fa] to-[#e5d6f8] border-purple-300/40 shadow-lg shadow-purple-200/20"

                                : "bg-emerald-950/50 border-emerald-500/30"

                        }`}

                    >

                        <p

                            className={`text-4xl ${

                                isLight

                                    ? "text-purple-500"

                                    : "text-emerald-400"

                            }`}

                        >

                            “

                        </p>

                        <h3

                            className={`text-xl font-semibold mb-4 ${

                                isLight

                                    ? "text-[#352044]"

                                    : "text-white"

                            }`}

                        >

                            Daily Affirmation

                        </h3>

                        <p

                            className={`leading-7 max-w-3xl ${

                                isLight

                                    ? "text-[#654d76]"

                                    : "text-emerald-100/80"

                            }`}

                        >

                            You are doing your best, and that is enough.

                            Take care of your mind, and the rest will follow.

                            <span

                                className={

                                    isLight

                                        ? "text-purple-500"

                                        : "text-emerald-400"

                                }

                            >

                                {" "}💜

                            </span>

                        </p>

                    </section>

                </div>

            </main>

        </div>

    );

}

function SidebarButton({

    active = false,

    light,

    icon,

    text,

    onClick

}) {

    return (

        <button

            onClick={onClick}

            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${

                active

                    ? light

                        ? "bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-lg shadow-purple-300/30"

                        : "bg-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20"

                    : light

                    ? "bg-white/40 text-purple-800 hover:bg-purple-200/70 hover:shadow-md"

                    : "bg-emerald-900/30 text-emerald-100 hover:bg-emerald-500/20"

            }`}

        >

            <span>{icon}</span>

            {text}

        </button>

    );

}

function SummaryCard({

    light,

    type,

    children

}) {

    const styles = {

        mood: light

            ? "from-[#d9c2f3] via-[#eadbfa] to-[#d8bdf1]"

            : "from-emerald-600 to-emerald-900",

        tasks: light

            ? "from-[#cdb0ee] via-[#dec8f4] to-[#c7a8e8]"

            : "from-emerald-500 to-emerald-800",

        stress: light

            ? "from-[#e4d4f5] via-[#eee4fa] to-[#d9c4ed]"

            : "from-emerald-700 to-emerald-950"

    };

    return (

        <div

            className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${

                styles[type]

            } border shadow-xl transition-all duration-500 ${

                light

                    ? "border-purple-300/50 shadow-purple-300/20"

                    : "border-emerald-400/40 shadow-emerald-950/50"

            }`}

        >

            <div

                className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl ${

                    light

                        ? "bg-white/40"

                        : "bg-emerald-300/20"

                }`}

            />

            <div className="relative">

                {children}

            </div>

        </div>

    );

}

function MoodBar({

    light,

    emoji,

    name,

    percentage,

    width

}) {

    return (

        <div>

            <div className="flex justify-between items-center mb-2">

                <span

                    className={`flex items-center gap-3 ${

                        light

                            ? "text-[#4c365d]"

                            : "text-emerald-50"

                    }`}

                >

                    <span>{emoji}</span>

                    {name}

                </span>

                <span

                    className={`font-semibold ${

                        light

                            ? "text-purple-600"

                            : "text-emerald-400"

                    }`}

                >

                    {percentage}

                </span>

            </div>

            <div

                className={`h-3 rounded-full overflow-hidden ${

                    light

                        ? "bg-purple-100 border border-purple-200"

                        : "bg-black/60 border border-emerald-900"

                }`}

            >

                <div

                    className={`h-full rounded-full transition-all duration-700 ${

                        light

                            ? "bg-gradient-to-r from-purple-300 via-purple-400 to-purple-500 shadow-lg shadow-purple-300/30"

                            : "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 shadow-lg shadow-emerald-500/30"

                    }`}

                    style={{

                        width

                    }}

                />

            </div>

        </div>

    );

}

function QuickAction({

    light,

    icon,

    title,

    description,

    onClick

}) {

    return (

        <button

            onClick={onClick}

            className={`text-left p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${

                light

                    ? "bg-white/55 border-purple-200/70 hover:bg-white/80 hover:border-purple-300 hover:shadow-purple-200/30"

                    : "bg-emerald-900/30 border-emerald-700/40 hover:bg-emerald-500/20 hover:border-emerald-400/50"

            }`}

        >

            <div

                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${

                    light

                        ? "bg-purple-100 border border-purple-200"

                        : "bg-emerald-950/70 border border-emerald-800"

                }`}

            >

                {icon}

            </div>

            <p

                className={`font-semibold ${

                    light

                        ? "text-[#4c365d]"

                        : "text-emerald-50"

                }`}

            >

                {title}

            </p>

            <p

                className={`text-xs mt-1 ${

                    light

                        ? "text-purple-700/60"

                        : "text-emerald-200/50"

                }`}

            >

                {description}

            </p>

        </button>

    );

}

export default Dashboard;
