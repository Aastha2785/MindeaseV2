import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

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

function AIAnalysis() {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [journalData, setJournalData] = useState(null);
    const [faceData, setFaceData] = useState(null);
    const [overallAnalysis, setOverallAnalysis] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [loaded, setLoaded] = useState(false);

    const getCurrentUser = () => {
        try {
            const localUser = localStorage.getItem("mindEaseUser");

            if (localUser) {
                return JSON.parse(localUser);
            }

            const sessionUser =
                sessionStorage.getItem("mindEaseUser");

            if (sessionUser) {
                return JSON.parse(sessionUser);
            }

            return null;
        } catch (error) {
            console.error("User loading error:", error);
            return null;
        }
    };

    const loadData = () => {
        const user = getCurrentUser();

        if (!user?.user_id) {
            setLoaded(true);
            return;
        }

        const userId = user.user_id;

        const savedJournal = localStorage.getItem(
            `mindEaseJournalAnalysis_${userId}`
        );

        const savedFace = localStorage.getItem(
            `mindEaseFaceAnalysis_${userId}`
        );

        setJournalData(
            savedJournal ? JSON.parse(savedJournal) : null
        );

        setFaceData(
            savedFace ? JSON.parse(savedFace) : null
        );

        setLoaded(true);
    };

    useEffect(() => {
        loadData();

        const updateData = () => {
            loadData();
        };

        window.addEventListener(
            "mindEaseJournalUpdated",
            updateData
        );

        window.addEventListener(
            "mindEaseFaceUpdated",
            updateData
        );

        window.addEventListener(
            "storage",
            updateData
        );

        return () => {
            window.removeEventListener(
                "mindEaseJournalUpdated",
                updateData
            );

            window.removeEventListener(
                "mindEaseFaceUpdated",
                updateData
            );

            window.removeEventListener(
                "storage",
                updateData
            );
        };
    }, []);

    const journalEmotions =
        journalData?.analysis?.emotions || [];

    const faceEmotions =
        faceData?.analysis?.emotions || [];

    const hasJournal = journalEmotions.length > 0;
    const hasFace = faceEmotions.length > 0;
    const hasData = hasJournal || hasFace;

    const getDominant = (emotions) => {
        if (!emotions.length) {
            return null;
        }

        return [...emotions].sort(
            (a, b) =>
                Number(b.percentage) -
                Number(a.percentage)
        )[0];
    };

    const journalDominant =
        getDominant(journalEmotions);

    const faceDominant =
        getDominant(faceEmotions);

    const runOverallAnalysis = async () => {
        if (!hasData) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const user = getCurrentUser();

            if (!user?.token) {
                throw new Error("Please login again.");
            }

            const response = await fetch(
                `${API}/analysis/overall`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user.token}`
                    },
                    body: JSON.stringify({
                        journalAnalysis: hasJournal
                            ? journalData.analysis
                            : null,

                        faceAnalysis: hasFace
                            ? faceData.analysis
                            : null
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                        "Failed to generate AI analysis."
                );
            }

            if (!data.analysis) {
                throw new Error(
                    "Invalid AI analysis received."
                );
            }

            setOverallAnalysis(data.analysis);
        } catch (error) {
            console.error(
                "Overall AI Analysis Error:",
                error
            );

            setError(
                error.message ||
                    "Unable to generate AI analysis."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loaded) {
            return;
        }

        if (!hasData) {
            setOverallAnalysis(null);
            return;
        }

        runOverallAnalysis();
    }, [loaded, journalData, faceData]);

    const overallEmotions =
        overallAnalysis?.overallEmotions || [];

    const dominantOverall =
        getDominant(overallEmotions);

    const stressLevel =
        overallAnalysis?.stressLevel || "—";

    const energyLevel =
        overallAnalysis?.energyLevel || "—";

    const suggestions =
        overallAnalysis?.suggestions || [];

    const pageBackground = isLight
        ? "bg-gradient-to-br from-[#f8f1ff] via-[#eee2ff] to-[#fbf7ff]"
        : "bg-gradient-to-br from-[#001f18] via-[#00382d] to-[#001a14]";

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

    const card = isLight
        ? "bg-[#f1e6fb] border-purple-200 shadow-[0_10px_30px_rgba(126,34,206,0.08)]"
        : "bg-[#032b22] border-emerald-800/70 shadow-[0_10px_30px_rgba(0,0,0,0.3)]";

    const innerCard = isLight
        ? "bg-[#e9dcf8] border-purple-200"
        : "bg-[#063d31] border-emerald-800/70";

    const iconBox = isLight
        ? "bg-purple-100 border-purple-200"
        : "bg-[#064638] border-emerald-800";

    const levelClass = (level) => {
        if (level === "High") {
            return isLight
                ? "text-red-600"
                : "text-red-400";
        }

        if (level === "Moderate") {
            return isLight
                ? "text-amber-600"
                : "text-yellow-300";
        }

        return isLight
            ? "text-purple-700"
            : "text-emerald-300";
    };

    return (
        <div
            className={`min-h-screen px-4 sm:px-6 lg:px-8 py-8 transition-all duration-500 ${pageBackground}`}
        >
            <div className="max-w-5xl mx-auto">

                {/* HEADER */}

                <div className="mb-8">
                    <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 ${
                            isLight
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-[#064638] text-emerald-300 border border-emerald-800"
                        }`}
                    >
                        🧠 Groq AI
                    </div>

                    <h1
                        className={`text-3xl sm:text-4xl font-bold ${primaryText}`}
                    >
                        AI Analysis
                    </h1>

                    <p
                        className={`mt-2 text-sm ${secondaryText}`}
                    >
                        A quick interpretation of your current
                        emotional signals.
                    </p>
                </div>

                {/* NO DATA */}

                {!hasData && (
                    <div
                        className={`${card} rounded-3xl p-10 text-center border`}
                    >
                        <div
                            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-4xl mb-4 ${iconBox}`}
                        >
                            🧠
                        </div>

                        <h2
                            className={`text-xl font-bold ${primaryText}`}
                        >
                            Nothing to analyze yet
                        </h2>

                        <p
                            className={`text-sm mt-2 ${mutedText}`}
                        >
                            Add a journal entry or complete a
                            face scan first.
                        </p>
                    </div>
                )}

                {hasData && (
                    <>
                        {/* LOADING */}

                        {loading && (
                            <div
                                className={`${card} rounded-3xl p-8 text-center border`}
                            >
                                <div className="text-4xl mb-3">
                                    🧠
                                </div>

                                <h2
                                    className={`font-bold ${primaryText}`}
                                >
                                    Analyzing your signals...
                                </h2>

                                <p
                                    className={`text-sm mt-2 ${mutedText}`}
                                >
                                    Groq is preparing your
                                    personalized insight.
                                </p>
                            </div>
                        )}

                        {/* ERROR */}

                        {error && !loading && (
                            <div
                                className={`${card} rounded-3xl p-6 mb-6 border border-red-400/40`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">
                                        ⚠️
                                    </span>

                                    <div className="flex-1">
                                        <p
                                            className={`font-semibold ${
                                                isLight
                                                    ? "text-red-700"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            AI analysis failed
                                        </p>

                                        <p
                                            className={`text-sm mt-1 ${mutedText}`}
                                        >
                                            {error}
                                        </p>
                                    </div>

                                    <button
                                        onClick={
                                            runOverallAnalysis
                                        }
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                                            isLight
                                                ? "bg-purple-600 text-white"
                                                : "bg-emerald-500 text-black"
                                        }`}
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        {overallAnalysis &&
                            !loading && (
                                <>
                                    {/* AI SUMMARY */}

                                    <div
                                        className={`${card} rounded-3xl p-6 mb-6 border`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl ${iconBox}`}
                                            >
                                                🤖
                                            </div>

                                            <div>
                                                <p
                                                    className={`text-xs font-semibold uppercase tracking-wider ${accentText}`}
                                                >
                                                    AI Insight
                                                </p>

                                                <h2
                                                    className={`text-xl sm:text-2xl font-bold mt-1 ${primaryText}`}
                                                >
                                                    {dominantOverall
                                                        ? `${emotionEmoji[dominantOverall.emotion] || "🙂"} ${dominantOverall.emotion}`
                                                        : "Your current mood"}
                                                </h2>

                                                <p
                                                    className={`text-sm leading-relaxed mt-2 ${secondaryText}`}
                                                >
                                                    {
                                                        overallAnalysis.summary
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SOURCE COMPARISON */}

                                    <div
                                        className={`${card} rounded-3xl p-6 mb-6 border`}
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBox}`}
                                            >
                                                🔍
                                            </div>

                                            <div>
                                                <h2
                                                    className={`font-bold ${primaryText}`}
                                                >
                                                    Your Signals
                                                </h2>

                                                <p
                                                    className={`text-xs ${mutedText}`}
                                                >
                                                    Journal vs face
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {hasJournal && (
                                                <div
                                                    className={`${innerCard} rounded-2xl p-4 border`}
                                                >
                                                    <p
                                                        className={`text-xs ${mutedText}`}
                                                    >
                                                        📝 Journal
                                                    </p>

                                                    {journalDominant && (
                                                        <p
                                                            className={`text-lg font-bold mt-2 ${accentText}`}
                                                        >
                                                            {emotionEmoji[
                                                                journalDominant
                                                                    .emotion
                                                            ] || "🙂"}{" "}
                                                            {
                                                                journalDominant.emotion
                                                            }{" "}
                                                            <span
                                                                className={`text-sm ${mutedText}`}
                                                            >
                                                                {
                                                                    journalDominant.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {hasFace && (
                                                <div
                                                    className={`${innerCard} rounded-2xl p-4 border`}
                                                >
                                                    <p
                                                        className={`text-xs ${mutedText}`}
                                                    >
                                                        📷 Face Scan
                                                    </p>

                                                    {faceDominant && (
                                                        <p
                                                            className={`text-lg font-bold mt-2 ${accentText}`}
                                                        >
                                                            {emotionEmoji[
                                                                faceDominant
                                                                    .emotion
                                                            ] || "🙂"}{" "}
                                                            {
                                                                faceDominant.emotion
                                                            }{" "}
                                                            <span
                                                                className={`text-sm ${mutedText}`}
                                                            >
                                                                {
                                                                    faceDominant.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {hasJournal &&
                                            hasFace && (
                                                <div
                                                    className={`mt-4 text-sm rounded-xl px-4 py-3 ${
                                                        journalDominant?.emotion ===
                                                        faceDominant?.emotion
                                                            ? isLight
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-[#064638] text-emerald-300"
                                                            : isLight
                                                            ? "bg-amber-50 text-amber-700"
                                                            : "bg-[#332c08] text-yellow-300"
                                                    }`}
                                                >
                                                    {journalDominant?.emotion ===
                                                    faceDominant?.emotion
                                                        ? "🔗 Your journal and facial signals are broadly aligned."
                                                        : `🔎 Journal shows ${journalDominant?.emotion}, while your face shows ${faceDominant?.emotion}.`}
                                                </div>
                                            )}
                                    </div>

                                    {/* MOOD PATTERN */}

                                    <div
                                        className={`${card} rounded-3xl p-6 mb-6 border`}
                                    >
                                        <div className="flex items-center justify-between mb-5">
                                            <div>
                                                <h2
                                                    className={`font-bold ${primaryText}`}
                                                >
                                                    🌈 Mood Pattern
                                                </h2>

                                                <p
                                                    className={`text-xs mt-1 ${mutedText}`}
                                                >
                                                    Current emotional mix
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {overallEmotions
                                                .slice(0, 5)
                                                .map((item) => (
                                                    <div
                                                        key={
                                                            item.emotion
                                                        }
                                                    >
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span
                                                                className={
                                                                    primaryText
                                                                }
                                                            >
                                                                {emotionEmoji[
                                                                    item.emotion
                                                                ] ||
                                                                    "🙂"}{" "}
                                                                {
                                                                    item.emotion
                                                                }
                                                            </span>

                                                            <span
                                                                className={
                                                                    accentText
                                                                }
                                                            >
                                                                {
                                                                    item.percentage
                                                                }
                                                                %
                                                            </span>
                                                        </div>

                                                        <div
                                                            className={`h-2.5 rounded-full overflow-hidden ${
                                                                isLight
                                                                    ? "bg-purple-100"
                                                                    : "bg-[#022b22]"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    isLight
                                                                        ? "bg-purple-500"
                                                                        : "bg-emerald-500"
                                                                }`}
                                                                style={{
                                                                    width: `${item.percentage}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* WELLNESS */}

                                    <div
                                        className={`${card} rounded-3xl p-6 mb-6 border`}
                                    >
                                        <h2
                                            className={`font-bold mb-4 ${primaryText}`}
                                        >
                                            🌿 Wellness
                                        </h2>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div
                                                className={`${innerCard} rounded-2xl p-4 border`}
                                            >
                                                <p
                                                    className={`text-xs ${mutedText}`}
                                                >
                                                    Stress
                                                </p>

                                                <p
                                                    className={`text-xl font-bold mt-1 ${levelClass(
                                                        stressLevel
                                                    )}`}
                                                >
                                                    {stressLevel}
                                                </p>
                                            </div>

                                            <div
                                                className={`${innerCard} rounded-2xl p-4 border`}
                                            >
                                                <p
                                                    className={`text-xs ${mutedText}`}
                                                >
                                                    Energy
                                                </p>

                                                <p
                                                    className={`text-xl font-bold mt-1 ${levelClass(
                                                        energyLevel
                                                    )}`}
                                                >
                                                    {energyLevel}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PERSONALIZED SUGGESTIONS */}

                                    <div
                                        className={`${card} rounded-3xl p-6 mb-6 border`}
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <div
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBox}`}
                                            >
                                                🌱
                                            </div>

                                            <div>
                                                <h2
                                                    className={`font-bold ${primaryText}`}
                                                >
                                                    For You
                                                </h2>

                                                <p
                                                    className={`text-xs ${mutedText}`}
                                                >
                                                    Based on today's signals
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {suggestions
                                                .slice(0, 3)
                                                .map(
                                                    (
                                                        suggestion,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={
                                                                index
                                                            }
                                                            className={`${innerCard} rounded-xl p-4 border`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <span className="text-lg">
                                                                    {index ===
                                                                    0
                                                                        ? "🌿"
                                                                        : index ===
                                                                          1
                                                                        ? "💚"
                                                                        : "✨"}
                                                                </span>

                                                                <p
                                                                    className={`text-sm leading-relaxed ${secondaryText}`}
                                                                >
                                                                    {
                                                                        suggestion
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                        </div>
                                    </div>

                                    {/* DISCLAIMER */}

                                    <p
                                        className={`text-xs text-center px-4 pb-4 ${mutedText}`}
                                    >
                                        MindEase provides wellness-oriented
                                        insights, not medical diagnoses.
                                        Face Scan reflects visible facial
                                        expressions only.
                                    </p>
                                </>
                            )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AIAnalysis;