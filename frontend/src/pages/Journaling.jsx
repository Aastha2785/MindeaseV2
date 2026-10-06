import { useState } from "react";
import { analyzeJournal } from "../services/api";

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

function getCurrentUser() {
    const localUser = localStorage.getItem("mindEaseUser");
    const sessionUser = sessionStorage.getItem("mindEaseUser");

    const storedUser = localUser || sessionUser;

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

function Journaling() {
    const [journal, setJournal] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        if (!journal.trim()) {
            setError("Please write something before analyzing.");
            return;
        }

        const user = getCurrentUser();

        if (!user) {
            setError("Please login before using journaling.");
            return;
        }

        if (!user.user_id) {
            setError(
                "User information is missing. Please login again."
            );
            return;
        }

        try {
            setLoading(true);
            setError("");

            const data = await analyzeJournal(
                journal,
                user.user_id
            );

            setAnalysis(data.analysis);

            /*
             * IMPORTANT:
             * Store journal analysis separately for each user.
             */
            const storageKey =
                `mindEaseJournalAnalysis_${user.user_id}`;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    journal: journal,
                    analysis: data.analysis,
                    journal_id: data.journal_id,
                    timestamp:
                        data.created_at ||
                        new Date().toISOString()
                })
            );

            /*
             * Tell Dashboard that new journal data
             * is available.
             */
            window.dispatchEvent(
                new Event("mindEaseJournalUpdated")
            );
        } catch (err) {
            console.error("Journal Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 text-violet-950 px-6 py-8">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-violet-200 shadow-sm mb-5">
                        <span>💜</span>

                        <span className="text-sm font-semibold text-violet-600">
                            MindEase
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-3 text-violet-950">
                        Daily Journaling ✨
                    </h1>

                    <p className="text-violet-700/70 max-w-2xl text-lg">
                        Take a quiet moment to write about your day,
                        your thoughts, or how you're feeling.
                    </p>
                </div>

                {/* Journal Input */}
                <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-violet-200 rounded-3xl p-6 md:p-7 mb-8 shadow-xl shadow-violet-300/20">

                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl" />

                    <div className="relative">

                        <label className="block text-xl font-bold mb-2 text-violet-950">
                            How are you feeling today? 🌷
                        </label>

                        <p className="text-violet-600/60 text-sm mb-5">
                            Write freely. There are no right or wrong
                            answers here.
                        </p>

                        <textarea
                            value={journal}
                            onChange={(e) =>
                                setJournal(e.target.value)
                            }
                            placeholder="Write about your day, your thoughts, feelings, or anything that's on your mind..."
                            className="w-full h-56 bg-violet-50/80 border border-violet-200 rounded-2xl p-5 text-violet-950 placeholder-violet-400/60 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-200/50 resize-none transition"
                        />

                        <div className="flex items-center justify-between mt-4">

                            <p className="text-violet-500/60 text-sm">
                                {journal.length} characters
                            </p>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="px-7 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-purple-300/40"
                            >
                                {loading
                                    ? "✨ Analyzing..."
                                    : "Analyze My Journal ✨"}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Analysis */}
                {analysis && (
                    <div className="space-y-6">

                        {/* Dominant Emotion */}
                        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-violet-200 rounded-3xl p-6 shadow-xl shadow-violet-300/20">

                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-fuchsia-200/40 rounded-full blur-3xl" />

                            <div className="relative">

                                <p className="text-violet-500 text-sm font-semibold mb-3 uppercase tracking-wider">
                                    Dominant Emotion
                                </p>

                                <div className="flex items-center gap-4">

                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 border border-violet-200 flex items-center justify-center text-4xl shadow-sm">
                                        {emotionEmoji[
                                            analysis.dominantEmotion
                                        ] || "🙂"}
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-bold text-violet-800">
                                            {analysis.dominantEmotion}
                                        </h2>

                                        <p className="text-violet-500/70 text-sm mt-1">
                                            Overall intensity:{" "}
                                            <span className="font-semibold text-violet-700">
                                                {analysis.intensity}
                                            </span>
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Emotion Distribution */}
                        <div className="bg-white/80 backdrop-blur-xl border border-violet-200 rounded-3xl p-6 shadow-xl shadow-violet-300/20">

                            <div className="flex justify-between items-center mb-6">

                                <div>
                                    <h2 className="text-xl font-bold text-violet-950">
                                        Emotional Breakdown 💭
                                    </h2>

                                    <p className="text-violet-500/60 text-sm mt-1">
                                        Multiple emotions detected from
                                        your journal
                                    </p>
                                </div>

                                <span className="px-3 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-600 text-sm font-semibold">
                                    {analysis.emotions?.length || 0} emotions
                                </span>

                            </div>

                            <div className="space-y-4">

                                {analysis.emotions?.map((item) => (
                                    <div
                                        key={item.emotion}
                                        className="bg-violet-50/80 border border-violet-200 rounded-2xl p-4"
                                    >

                                        <div className="flex justify-between items-center mb-3">

                                            <span className="text-violet-900 font-medium flex items-center gap-2">
                                                <span>
                                                    {emotionEmoji[
                                                        item.emotion
                                                    ] || "•"}
                                                </span>

                                                {item.emotion}
                                            </span>

                                            <span className="text-violet-600 font-bold">
                                                {item.percentage}%
                                            </span>

                                        </div>

                                        <div className="w-full h-3 bg-violet-100 rounded-full overflow-hidden">

                                            <div
                                                className="h-full bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-400 rounded-full transition-all duration-700 shadow-sm"
                                                style={{
                                                    width: `${item.percentage}%`
                                                }}
                                            />

                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>

                        {/* Saved Status */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-100 to-fuchsia-100 border border-violet-200 shadow-sm">
                            <p className="text-sm text-violet-700 font-medium">
                                ✓ Your journal and emotional analysis
                                have been saved to your MindEase history.
                            </p>
                        </div>

                        {/* Disclaimer */}
                        <div className="p-5 rounded-2xl bg-white/60 border border-violet-200">
                            <p className="text-xs text-violet-500/70 leading-relaxed">
                                MindEase analyzes emotional signals in
                                your writing for wellness purposes.
                                These results are not medical diagnoses
                                and do not determine your actual mental
                                health condition.
                            </p>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}

export default Journaling;