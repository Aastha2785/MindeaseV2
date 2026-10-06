import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

function getCurrentUser() {
    // Always prefer the current session user.
    const sessionUser = sessionStorage.getItem("mindEaseUser");
    const localUser = localStorage.getItem("mindEaseUser");

    const savedUser = sessionUser || localUser;

    if (!savedUser) {
        return null;
    }

    try {
        return JSON.parse(savedUser);
    } catch {
        return null;
    }
}

// PostgreSQL stores the journal created_at column as TIMESTAMP WITHOUT TIME ZONE.
// Supabase therefore can return values such as "2026-10-06 07:56:00" without
// a timezone suffix. In MindEase those values represent UTC because NOW() is
// used by PostgreSQL while the database session runs in UTC.
//
// Always normalize a timezone-less database timestamp as UTC first, then
// convert it to India Standard Time (Asia/Kolkata) for display.
function parseMindEaseTimestamp(dateString) {
    if (!dateString) return null;

    if (dateString instanceof Date) {
        return dateString;
    }

    const value = String(dateString).trim();

    if (!value) return null;

    // If the value already contains a timezone (Z or +/-HH:mm), preserve it.
    // Otherwise, explicitly treat the database value as UTC.
    const normalizedValue = value.includes("T")
        ? value
        : value.replace(" ", "T");

    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(
        normalizedValue
    );

    const utcValue = hasTimezone
        ? normalizedValue
        : `${normalizedValue}Z`;

    const date = new Date(utcValue);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(dateString) {
    const date = parseMindEaseTimestamp(dateString);

    if (!date) return "unknown";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

function formatGroupDate(dateString) {
    const date = parseMindEaseTimestamp(dateString);

    if (!date) return "Unknown date";

    return date.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(dateString) {
    const date = parseMindEaseTimestamp(dateString);

    if (!date) return "Unknown time";

    return date.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function getMoodEmoji(mood) {
    const emojis = {
        Happiness: "😊",
        Calm: "😌",
        Neutral: "😐",
        Stress: "😣",
        Sadness: "😔",
        Anxiety: "😰",
        Anger: "😡",
        Fatigue: "😴",
        Excitement: "🤩",
        Fear: "😨"
    };

    return emojis[mood] || "🙂";
}

export default function History() {
    const { theme } = useTheme();

    const [journals, setJournals] = useState([]);
    const [selfies, setSelfies] = useState([]);

    const [loadingJournals, setLoadingJournals] =
        useState(true);

    const [deletingJournal, setDeletingJournal] =
        useState(null);

    const [deletingSelfie, setDeletingSelfie] =
        useState(null);

    const user = getCurrentUser();
    const userId = user?.user_id;

    const isLight = theme === "light";

    // =====================================================
    // LOAD JOURNALS
    // =====================================================

    const loadJournals = async () => {
        if (!userId) {
            setJournals([]);
            setLoadingJournals(false);
            return;
        }

        try {
            setLoadingJournals(true);

            if (!user?.token) {
                throw new Error("Please login again.");
            }

            const response = await fetch(
                `${API}/journal/history?user_id=${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                }
            );

            const data = await response.json();

            if (data.success) {
                setJournals(data.journals || []);
            } else {
                setJournals([]);
            }
        } catch (error) {
            console.error(
                "Failed to load journal history:",
                error
            );

            setJournals([]);
        } finally {
            setLoadingJournals(false);
        }
    };

    // =====================================================
    // LOAD SELFIES
    // =====================================================

    const loadSelfies = () => {
        if (!userId) {
            setSelfies([]);
            return;
        }

        /*
         * IMPORTANT:
         *
         * FaceScan.jsx saves selfies using:
         *
         * mindEaseSelfieHistory_v2_<user_id>
         *
         * Therefore History MUST read the exact same key.
         */

        const key =
            `mindEaseSelfieHistory_v2_${userId}`;

        try {
            const saved = JSON.parse(
                localStorage.getItem(key) || "[]"
            );

            if (Array.isArray(saved)) {
                setSelfies(saved);
            } else {
                setSelfies([]);
            }
        } catch (error) {
            console.error(
                "Failed to load selfies:",
                error
            );

            setSelfies([]);
        }
    };

    // =====================================================
    // INITIAL LOAD + EVENT LISTENERS
    // =====================================================

    useEffect(() => {
        loadJournals();
        loadSelfies();

        const handleSelfieUpdate = () => {
            loadSelfies();
        };

        const handleStorage = (event) => {
            /*
             * Listen for changes to THIS user's selfie history.
             */

            if (
                event.key ===
                `mindEaseSelfieHistory_v2_${userId}`
            ) {
                loadSelfies();
            }

            /*
             * Also reload when the logged-in user changes.
             */

            if (event.key === "mindEaseUser") {
                loadSelfies();
            }
        };

        window.addEventListener(
            "mindEaseSelfieHistoryUpdated",
            handleSelfieUpdate
        );

        window.addEventListener(
            "storage",
            handleStorage
        );

        return () => {
            window.removeEventListener(
                "mindEaseSelfieHistoryUpdated",
                handleSelfieUpdate
            );

            window.removeEventListener(
                "storage",
                handleStorage
            );
        };
    }, [userId]);

    // =====================================================
    // DELETE JOURNAL
    // =====================================================

    const deleteJournal = async (journalId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this journal?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingJournal(journalId);

            if (!user?.token) {
                throw new Error("Please login again.");
            }

            const response = await fetch(
                `${API}/journal/${journalId}?user_id=${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${user.token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                        "Failed to delete journal"
                );
            }

            setJournals((currentJournals) =>
                currentJournals.filter(
                    (journal) =>
                        journal.journal_id !== journalId
                )
            );
        } catch (error) {
            console.error(
                "Delete journal error:",
                error
            );

            alert(
                error.message ||
                    "Failed to delete journal"
            );
        } finally {
            setDeletingJournal(null);
        }
    };

    // =====================================================
    // DELETE SELFIE
    // =====================================================

    const deleteSelfie = (selfieId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this selfie?"
        );

        if (!confirmed) {
            return;
        }

        if (!userId) {
            alert("Please login again.");
            return;
        }

        try {
            setDeletingSelfie(selfieId);

            /*
             * MUST use the same v2 user-specific key
             * used by FaceScan.jsx.
             */

            const key =
                `mindEaseSelfieHistory_v2_${userId}`;

            const updated = selfies.filter(
                (selfie) =>
                    selfie.id !== selfieId
            );

            localStorage.setItem(
                key,
                JSON.stringify(updated)
            );

            setSelfies(updated);

            window.dispatchEvent(
                new Event(
                    "mindEaseSelfieHistoryUpdated"
                )
            );
        } catch (error) {
            console.error(
                "Delete selfie error:",
                error
            );

            alert(
                "Failed to delete selfie"
            );
        } finally {
            setDeletingSelfie(null);
        }
    };

    // =====================================================
    // GROUP JOURNALS
    // =====================================================

    const groupedJournals =
        journals.reduce(
            (groups, journal) => {
                const key =
                    getDateKey(
                        journal.created_at
                    );

                if (!groups[key]) {
                    groups[key] = [];
                }

                groups[key].push(journal);

                return groups;
            },
            {}
        );

    const groupedJournalEntries =
        Object.entries(groupedJournals);

    // =====================================================
    // THEME
    // =====================================================

    const pageClass = isLight
        ? "min-h-screen bg-[#f4edfb] text-[#33253f]"
        : "min-h-screen bg-[#03150f] text-white";

    const headingClass = isLight
        ? "text-[#382545]"
        : "text-white";

    const subtitleClass = isLight
        ? "text-[#745d83]"
        : "text-emerald-100/70";

    const dateCardClass = isLight
        ? "bg-[#eadcf7] border border-[#d6bdf0]"
        : "bg-[#06251a] border border-emerald-400/20";

    const journalDividerClass = isLight
        ? "border-[#d7c4e6]"
        : "border-emerald-400/10";

    const emptyCardClass = isLight
        ? "bg-[#eadcf7] border border-[#d6bdf0]"
        : "bg-[#06251a] border border-emerald-400/20";

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className={pageClass}>
            <div className="max-w-5xl mx-auto px-5 py-8">

                {/* HEADER */}

                <div className="mb-7">
                    <h1
                        className={`text-3xl font-bold ${headingClass}`}
                    >
                        History
                    </h1>

                    <p
                        className={`mt-1 text-sm ${subtitleClass}`}
                    >
                        Your journal entries and saved selfies
                    </p>
                </div>

                {/* =================================================
                    JOURNAL HISTORY
                ================================================= */}

                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2
                            className={`text-xl font-semibold ${headingClass}`}
                        >
                            📝 Journal History
                        </h2>

                        <span
                            className={`text-sm ${subtitleClass}`}
                        >
                            {journals.length}{" "}
                            {journals.length === 1
                                ? "entry"
                                : "entries"}
                        </span>
                    </div>

                    {loadingJournals ? (
                        <div
                            className={`rounded-2xl border p-6 text-center ${emptyCardClass}`}
                        >
                            <p className={subtitleClass}>
                                Loading your journals...
                            </p>
                        </div>
                    ) : groupedJournalEntries.length === 0 ? (
                        <div
                            className={`rounded-2xl border p-6 text-center ${emptyCardClass}`}
                        >
                            <div className="text-3xl mb-2">
                                📝
                            </div>

                            <p
                                className={`font-medium ${headingClass}`}
                            >
                                No journal entries yet
                            </p>

                            <p
                                className={`text-sm mt-1 ${subtitleClass}`}
                            >
                                Your journal entries will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedJournalEntries.map(
                                ([dateKey, dateJournals]) => (
                                    <article
                                        key={dateKey}
                                        className={`rounded-2xl border overflow-hidden ${dateCardClass}`}
                                    >
                                        {/* DATE HEADER */}

                                        <div className="px-5 py-3 border-b border-inherit flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    📅
                                                </span>

                                                <h3
                                                    className={`font-semibold ${headingClass}`}
                                                >
                                                    {formatGroupDate(
                                                        dateJournals[0]
                                                            .created_at
                                                    )}
                                                </h3>
                                            </div>

                                            <span
                                                className={`text-xs ${subtitleClass}`}
                                            >
                                                {dateJournals.length}{" "}
                                                {dateJournals.length === 1
                                                    ? "journal"
                                                    : "journals"}
                                            </span>
                                        </div>

                                        {/* JOURNALS */}

                                        <div>
                                            {dateJournals.map(
                                                (
                                                    journal,
                                                    index
                                                ) => (
                                                    <div
                                                        key={
                                                            journal.journal_id
                                                        }
                                                        className={`px-5 py-4 ${
                                                            index !==
                                                            dateJournals.length - 1
                                                                ? `border-b ${journalDividerClass}`
                                                                : ""
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl">
                                                                    {getMoodEmoji(
                                                                        journal.overall_mood
                                                                    )}
                                                                </span>

                                                                <div>
                                                                    <div
                                                                        className={`font-semibold ${headingClass}`}
                                                                    >
                                                                        {
                                                                            journal.overall_mood
                                                                        }
                                                                    </div>

                                                                    <div
                                                                        className={`text-xs ${subtitleClass}`}
                                                                    >
                                                                        {formatTime(
                                                                            journal.created_at
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() =>
                                                                    deleteJournal(
                                                                        journal.journal_id
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingJournal ===
                                                                    journal.journal_id
                                                                }
                                                                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition text-xs font-medium disabled:opacity-50"
                                                            >
                                                                {deletingJournal ===
                                                                journal.journal_id
                                                                    ? "Deleting..."
                                                                    : "🗑️ Delete"}
                                                            </button>
                                                        </div>

                                                        <p
                                                            className={`mt-3 text-sm leading-6 ${
                                                                isLight
                                                                    ? "text-[#554260]"
                                                                    : "text-emerald-50/80"
                                                            }`}
                                                        >
                                                            {
                                                                journal.journal_text
                                                            }
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </article>
                                )
                            )}
                        </div>
                    )}
                </section>

                {/* =================================================
                    SELFIE HISTORY
                ================================================= */}

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2
                            className={`text-xl font-semibold ${headingClass}`}
                        >
                            📸 Selfie History
                        </h2>

                        <span
                            className={`text-sm ${subtitleClass}`}
                        >
                            {selfies.length}{" "}
                            {selfies.length === 1
                                ? "selfie"
                                : "selfies"}
                        </span>
                    </div>

                    {selfies.length === 0 ? (
                        <div
                            className={`rounded-2xl border p-6 text-center ${emptyCardClass}`}
                        >
                            <div className="text-3xl mb-2">
                                📸
                            </div>

                            <p
                                className={`font-medium ${headingClass}`}
                            >
                                No saved selfies yet
                            </p>

                            <p
                                className={`text-sm mt-1 ${subtitleClass}`}
                            >
                                Saved selfies from Face Scan will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {selfies.map((selfie) => (
                                <div
                                    key={selfie.id}
                                    className={`rounded-2xl border overflow-hidden ${dateCardClass}`}
                                >
                                    <img
                                        src={selfie.image}
                                        alt="Saved selfie"
                                        className="w-full aspect-square object-cover"
                                    />

                                    <div className="p-3">
                                        <p
                                            className={`text-xs ${subtitleClass}`}
                                        >
                                            {(() => {
                                                const selfieDate =
                                                    parseMindEaseTimestamp(
                                                        selfie.timestamp
                                                    );

                                                return selfieDate
                                                    ? selfieDate.toLocaleString(
                                                          "en-IN",
                                                          {
                                                              timeZone: "Asia/Kolkata",
                                                              day: "2-digit",
                                                              month: "short",
                                                              year: "numeric",
                                                              hour: "2-digit",
                                                              minute: "2-digit",
                                                              hour12: true
                                                          }
                                                      )
                                                    : "Unknown time";
                                            })()}
                                        </p>

                                        <button
                                            onClick={() =>
                                                deleteSelfie(
                                                    selfie.id
                                                )
                                            }
                                            disabled={
                                                deletingSelfie ===
                                                selfie.id
                                            }
                                            className="mt-2 w-full px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition text-xs font-medium disabled:opacity-50"
                                        >
                                            {deletingSelfie ===
                                            selfie.id
                                                ? "Deleting..."
                                                : "🗑️ Delete"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}