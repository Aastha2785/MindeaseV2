import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function getCurrentUser() {
    const localUser = localStorage.getItem("mindEaseUser");
    const sessionUser = sessionStorage.getItem("mindEaseUser");

    try {
        return JSON.parse(localUser || sessionUser || "null");
    } catch {
        return null;
    }
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getLast7Days() {
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        days.push({
            key: getDateKey(date),
            label: date.toLocaleDateString("en-US", {
                weekday: "short"
            }),
            fullDate: date
        });
    }

    return days;
}

function WeeklyAnalysis() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [user, setUser] = useState(null);
    const [journals, setJournals] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);

        if (!currentUser?.user_id) {
            setLoading(false);
            return;
        }

        const refresh = () => loadWeeklyData(currentUser.user_id);
        refresh();
        window.addEventListener("mindEaseJournalUpdated", refresh);
        window.addEventListener("mindEaseTasksUpdated", refresh);
        window.addEventListener("storage", refresh);
        const interval = window.setInterval(refresh, 60000);

        return () => {
            window.removeEventListener("mindEaseJournalUpdated", refresh);
            window.removeEventListener("mindEaseTasksUpdated", refresh);
            window.removeEventListener("storage", refresh);
            window.clearInterval(interval);
        };
    }, []);

    const loadWeeklyData = async (userId) => {
        try {
            setLoading(true);

            const currentUser = getCurrentUser();
            if (!currentUser?.token) {
                setLoading(false);
                return;
            }

            const journalResponse = await fetch(
                `${API}/journal/history?user_id=${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${currentUser.token}`
                    }
                }
            );

            if (journalResponse.ok) {
                const journalData = await journalResponse.json();

                if (journalData.success && Array.isArray(journalData.journals)) {
                    setJournals(journalData.journals);
                }
            }

            const taskKey = `mindEaseTasks_${userId}`;
            const savedTasks = localStorage.getItem(taskKey);

            if (savedTasks) {
                try {
                    setTasks(JSON.parse(savedTasks));
                } catch {
                    setTasks([]);
                }
            }
        } catch (error) {
            console.error("Weekly Analysis Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const days = getLast7Days();

    const weeklyJournals = useMemo(() => {
        const firstDay = days[0].key;
        const lastDay = days[6].key;

        return journals.filter((journal) => {
            const date = new Date(journal.created_at);
            const key = getDateKey(date);

            return key >= firstDay && key <= lastDay;
        });
    }, [journals, days]);

    const weeklyTasks = useMemo(() => {
        const firstDay = days[0].key;
        const lastDay = days[6].key;

        return tasks.filter((task) => {
            const date = new Date(task.created_at || task.createdAt);
            const key = getDateKey(date);

            return key >= firstDay && key <= lastDay;
        });
    }, [tasks, days]);

    const getMoodValue = (journal) => {
        if (Array.isArray(journal?.emotions) && journal.emotions.length) {
            const weights = {
                Happiness: 100, Excitement: 95, Calm: 85, Content: 80, Neutral: 55,
                Fatigue: 40, Stress: 35, Stressed: 35, Sadness: 25, Sad: 25,
                Anxiety: 30, Anxious: 30, Anger: 25, Fear: 20
            };
            const total = journal.emotions.reduce((sum, item) => {
                const percentage = Number(item.percentage) || 0;
                return sum + percentage * (weights[item.emotion] ?? 50);
            }, 0);
            const percentageTotal = journal.emotions.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
            return percentageTotal ? Math.round(total / percentageTotal) : 0;
        }

        const mood = journal?.overall_mood?.toLowerCase();
        const moodValues = { happiness: 90, happy: 90, calm: 80, content: 75, neutral: 55, fatigue: 40, tired: 40, stress: 35, stressed: 35, anxiety: 30, anxious: 30, sadness: 25, sad: 25 };
        return moodValues[mood] || 0;
    };

    const dailyData = useMemo(() => {
        return days.map((day) => {
            const dayJournals = weeklyJournals.filter((journal) => {
                return getDateKey(new Date(journal.created_at)) === day.key;
            });

            const dayTasks = weeklyTasks.filter((task) => {
                const taskDate = new Date(
                    task.created_at || task.createdAt
                );

                return getDateKey(taskDate) === day.key;
            });

            const moodValues = dayJournals
                .map(getMoodValue)
                .filter((value) => value > 0);

            const mood =
                moodValues.length > 0
                    ? Math.round(
                          moodValues.reduce(
                              (sum, value) => sum + value,
                              0
                          ) / moodValues.length
                      )
                    : 0;

            const completed = dayTasks.filter(
                (task) => task.is_completed || task.completed
            ).length;

            const total = dayTasks.length;

            const productivity =
                total > 0
                    ? Math.round((completed / total) * 100)
                    : 0;

            return {
                ...day,
                mood,
                productivity,
                totalTasks: total,
                completedTasks: completed
            };
        });
    }, [days, weeklyJournals, weeklyTasks]);

    const totalTasks = weeklyTasks.length;

    const completedTasks = weeklyTasks.filter(
        (task) => task.is_completed || task.completed
    ).length;

    const completionRate =
        totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : 0;

    const moodDays = dailyData.filter((day) => day.mood > 0);

    const averageMood =
        moodDays.length > 0
            ? Math.round(
                  moodDays.reduce((sum, day) => sum + day.mood, 0) /
                      moodDays.length
              )
            : 0;

    const mostProductiveDay = useMemo(() => {
        const productiveDays = dailyData.filter(
            (day) => day.totalTasks > 0
        );

        if (productiveDays.length === 0) {
            return "No data";
        }

        return productiveDays.reduce((best, current) =>
            current.productivity > best.productivity
                ? current
                : best
        ).label;
    }, [dailyData]);

    const commonMood = useMemo(() => {
        const moods = weeklyJournals
            .map((journal) => journal.overall_mood)
            .filter(Boolean);

        if (moods.length === 0) {
            return "No data";
        }

        const counts = {};

        moods.forEach((mood) => {
            const normalized = mood.toLowerCase();

            counts[normalized] =
                (counts[normalized] || 0) + 1;
        });

        return Object.keys(counts).reduce((best, mood) =>
            counts[mood] > counts[best] ? mood : best
        );
    }, [weeklyJournals]);

    const weeklyInsight = useMemo(() => {
        if (
            weeklyJournals.length === 0 &&
            weeklyTasks.length === 0
        ) {
            return "There is not enough data yet. Add journal entries and daily tasks throughout the week to unlock your weekly insights.";
        }

        if (
            averageMood >= 75 &&
            completionRate >= 70
        ) {
            return "Your week shows a positive pattern: your mood stayed relatively strong while you maintained good task completion. Keep protecting the routines that appear to support your productivity.";
        }

        if (
            averageMood >= 70 &&
            completionRate < 50
        ) {
            return "Your mood appears relatively positive, but task completion was lower this week. Consider setting fewer, smaller daily goals so productivity feels easier to maintain.";
        }

        if (
            averageMood < 50 &&
            completionRate >= 70
        ) {
            return "You maintained strong task completion despite lower mood indicators. That shows consistency, but make sure productivity is not coming at the expense of rest and recovery.";
        }

        if (
            averageMood < 50 &&
            completionRate < 50
        ) {
            return "Both mood and task completion were lower this week. Consider reducing your workload, prioritizing essential tasks, and making time for activities that help you recover.";
        }

        return "Your week shows a mixed pattern across mood and productivity. Continue tracking both so MindEase can identify more meaningful patterns over time.";
    }, [
        weeklyJournals,
        weeklyTasks,
        averageMood,
        completionRate
    ]);

    if (!user) {
        return (
            <div
                className={`min-h-screen flex items-center justify-center ${
                    isLight
                        ? "bg-[#f3edff] text-purple-950"
                        : "bg-[#06110d] text-white"
                }`}
            >
                <div className="text-center">
                    <div className="text-5xl mb-4">🔐</div>

                    <h1 className="text-2xl font-bold mb-3">
                        Please log in
                    </h1>

                    <button
                        onClick={() => navigate("/login")}
                        className={`px-6 py-3 rounded-xl font-semibold ${
                            isLight
                                ? "bg-purple-600 text-white"
                                : "bg-emerald-500 text-black"
                        }`}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen transition-colors duration-300 ${
                isLight
                    ? "bg-[#f3edff] text-purple-950"
                    : "bg-[#06110d] text-white"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <button
                            onClick={() => navigate("/")}
                            className={`mb-4 text-sm ${
                                isLight
                                    ? "text-purple-600 hover:text-purple-800"
                                    : "text-emerald-400 hover:text-emerald-300"
                            }`}
                        >
                            ← Back to Dashboard
                        </button>

                        <h1 className="text-4xl font-bold">
                            Weekly Analysis 📊
                        </h1>

                        <p
                            className={`mt-2 ${
                                isLight
                                    ? "text-purple-700"
                                    : "text-gray-400"
                            }`}
                        >
                            Your mood and productivity patterns over the last 7 days
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="text-4xl mb-4">⏳</div>
                        <p>Loading your weekly analysis...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">

                            <div
                                className={`rounded-2xl p-5 border ${
                                    isLight
                                        ? "bg-[#e8ddff] border-purple-200"
                                        : "bg-[#0d2119] border-emerald-900"
                                }`}
                            >
                                <p className="text-2xl mb-2">😊</p>

                                <p
                                    className={`text-sm ${
                                        isLight
                                            ? "text-purple-700"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Average Mood
                                </p>

                                <h2 className="text-3xl font-bold mt-1">
                                    {averageMood
                                        ? `${averageMood}%`
                                        : "—"}
                                </h2>
                            </div>

                            <div
                                className={`rounded-2xl p-5 border ${
                                    isLight
                                        ? "bg-[#e8ddff] border-purple-200"
                                        : "bg-[#0d2119] border-emerald-900"
                                }`}
                            >
                                <p className="text-2xl mb-2">📔</p>

                                <p
                                    className={`text-sm ${
                                        isLight
                                            ? "text-purple-700"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Journal Entries
                                </p>

                                <h2 className="text-3xl font-bold mt-1">
                                    {weeklyJournals.length}
                                </h2>
                            </div>

                            <div
                                className={`rounded-2xl p-5 border ${
                                    isLight
                                        ? "bg-[#e8ddff] border-purple-200"
                                        : "bg-[#0d2119] border-emerald-900"
                                }`}
                            >
                                <p className="text-2xl mb-2">✅</p>

                                <p
                                    className={`text-sm ${
                                        isLight
                                            ? "text-purple-700"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Task Completion
                                </p>

                                <h2 className="text-3xl font-bold mt-1">
                                    {completionRate}%
                                </h2>
                            </div>

                            <div
                                className={`rounded-2xl p-5 border ${
                                    isLight
                                        ? "bg-[#e8ddff] border-purple-200"
                                        : "bg-[#0d2119] border-emerald-900"
                                }`}
                            >
                                <p className="text-2xl mb-2">🌤️</p>

                                <p
                                    className={`text-sm ${
                                        isLight
                                            ? "text-purple-700"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Common Mood
                                </p>

                                <h2 className="text-2xl font-bold mt-2 capitalize">
                                    {commonMood}
                                </h2>
                            </div>

                            <div
                                className={`rounded-2xl p-5 border ${
                                    isLight
                                        ? "bg-[#e8ddff] border-purple-200"
                                        : "bg-[#0d2119] border-emerald-900"
                                }`}
                            >
                                <p className="text-2xl mb-2">🏆</p>

                                <p
                                    className={`text-sm ${
                                        isLight
                                            ? "text-purple-700"
                                            : "text-gray-400"
                                    }`}
                                >
                                    Most Productive
                                </p>

                                <h2 className="text-2xl font-bold mt-2">
                                    {mostProductiveDay}
                                </h2>
                            </div>
                        </div>

                        {/* Mood Graph */}
                        <div
                            className={`rounded-3xl p-6 border mb-8 ${
                                isLight
                                    ? "bg-[#e8ddff] border-purple-200"
                                    : "bg-[#0d2119] border-emerald-900"
                            }`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        Weekly Mood
                                    </h2>

                                    <p
                                        className={`text-sm mt-1 ${
                                            isLight
                                                ? "text-purple-700"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        Mood trend based on your journal entries
                                    </p>
                                </div>

                                <span className="text-2xl">
                                    😊
                                </span>
                            </div>

                            <div className="h-64 flex items-end justify-between gap-3">
                                {dailyData.map((day) => (
                                    <div
                                        key={day.key}
                                        className="flex-1 h-full flex flex-col justify-end items-center"
                                    >
                                        <div className="w-full max-w-[60px] h-full flex items-end">
                                            <div
                                                className={`w-full rounded-t-xl transition-all ${
                                                    isLight
                                                        ? "bg-purple-500"
                                                        : "bg-emerald-500"
                                                }`}
                                                style={{
                                                    height:
                                                        day.mood > 0
                                                            ? `${Math.max(
                                                                  day.mood,
                                                                  8
                                                              )}%`
                                                            : "5%"
                                                }}
                                            />
                                        </div>

                                        <span
                                            className={`text-xs mt-3 ${
                                                isLight
                                                    ? "text-purple-700"
                                                    : "text-gray-400"
                                            }`}
                                        >
                                            {day.label}
                                        </span>

                                        <span className="text-xs font-semibold mt-1">
                                            {day.mood > 0
                                                ? `${day.mood}%`
                                                : "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Productivity Graph */}
                        <div
                            className={`rounded-3xl p-6 border mb-8 ${
                                isLight
                                    ? "bg-[#e8ddff] border-purple-200"
                                    : "bg-[#0d2119] border-emerald-900"
                            }`}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        Weekly Productivity
                                    </h2>

                                    <p
                                        className={`text-sm mt-1 ${
                                            isLight
                                                ? "text-purple-700"
                                                : "text-gray-400"
                                        }`}
                                    >
                                        Daily task completion
                                    </p>
                                </div>

                                <span className="text-2xl">
                                    🚀
                                </span>
                            </div>

                            <div className="h-64 flex items-end justify-between gap-3">
                                {dailyData.map((day) => (
                                    <div
                                        key={day.key}
                                        className="flex-1 h-full flex flex-col justify-end items-center"
                                    >
                                        <div className="w-full max-w-[60px] h-full flex items-end">
                                            <div
                                                className={`w-full rounded-t-xl transition-all ${
                                                    isLight
                                                        ? "bg-indigo-500"
                                                        : "bg-teal-500"
                                                }`}
                                                style={{
                                                    height:
                                                        day.totalTasks > 0
                                                            ? `${Math.max(
                                                                  day.productivity,
                                                                  8
                                                              )}%`
                                                            : "5%"
                                                }}
                                            />
                                        </div>

                                        <span
                                            className={`text-xs mt-3 ${
                                                isLight
                                                    ? "text-purple-700"
                                                    : "text-gray-400"
                                            }`}
                                        >
                                            {day.label}
                                        </span>

                                        <span className="text-xs font-semibold mt-1">
                                            {day.totalTasks > 0
                                                ? `${day.productivity}%`
                                                : "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mood vs Productivity */}
                        <div
                            className={`rounded-3xl p-6 border mb-8 ${
                                isLight
                                    ? "bg-[#e8ddff] border-purple-200"
                                    : "bg-[#0d2119] border-emerald-900"
                            }`}
                        >
                            <h2 className="text-xl font-bold">
                                Mood vs Productivity
                            </h2>

                            <p
                                className={`text-sm mt-1 mb-6 ${
                                    isLight
                                        ? "text-purple-700"
                                        : "text-gray-400"
                                }`}
                            >
                                Compare your daily mood and task completion.
                            </p>

                            <div className="space-y-5">
                                {dailyData.map((day) => (
                                    <div key={day.key}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">
                                                {day.label}
                                            </span>

                                            <span
                                                className={
                                                    isLight
                                                        ? "text-purple-700"
                                                        : "text-gray-400"
                                                }
                                            >
                                                Mood{" "}
                                                {day.mood || "—"}% · Productivity{" "}
                                                {day.totalTasks > 0
                                                    ? `${day.productivity}%`
                                                    : "—"}
                                            </span>
                                        </div>

                                        <div
                                            className={`h-3 rounded-full overflow-hidden ${
                                                isLight
                                                    ? "bg-purple-100"
                                                    : "bg-black/40"
                                            }`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${
                                                    isLight
                                                        ? "bg-purple-500"
                                                        : "bg-emerald-500"
                                                }`}
                                                style={{
                                                    width: `${day.mood}%`
                                                }}
                                            />
                                        </div>

                                        <div
                                            className={`h-2 mt-2 rounded-full overflow-hidden ${
                                                isLight
                                                    ? "bg-indigo-100"
                                                    : "bg-black/30"
                                            }`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${
                                                    isLight
                                                        ? "bg-indigo-500"
                                                        : "bg-teal-500"
                                                }`}
                                                style={{
                                                    width: `${day.productivity}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weekly Insight */}
                        <div
                            className={`rounded-3xl p-7 border ${
                                isLight
                                    ? "bg-gradient-to-br from-purple-100 to-indigo-100 border-purple-200"
                                    : "bg-gradient-to-br from-emerald-950 to-[#0d2119] border-emerald-900"
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl">
                                    💡
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold">
                                        Your Weekly Insight
                                    </h2>

                                    <p
                                        className={`mt-3 leading-7 ${
                                            isLight
                                                ? "text-purple-900"
                                                : "text-gray-300"
                                        }`}
                                    >
                                        {weeklyInsight}
                                    </p>

                                    <p
                                        className={`text-xs mt-4 ${
                                            isLight
                                                ? "text-purple-600"
                                                : "text-gray-500"
                                        }`}
                                    >
                                        These patterns describe associations in
                                        your tracked data and do not establish
                                        medical or causal conclusions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default WeeklyAnalysis;