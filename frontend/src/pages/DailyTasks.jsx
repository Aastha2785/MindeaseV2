import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";

function getCurrentUser() {
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

function DailyTasks() {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const [tasks, setTasks] = useState([]);
    const [taskText, setTaskText] = useState("");
    const [deadline, setDeadline] = useState("");
    const [loaded, setLoaded] = useState(false);

    const user = getCurrentUser();
    const userId = user?.user_id;

    const storageKey = userId
        ? `mindEaseTasks_${userId}`
        : null;

    // ================= LOAD TASKS =================

    useEffect(() => {
        setLoaded(false);

        if (!storageKey) {
            setTasks([]);
            setLoaded(true);
            return;
        }

        try {
            const savedTasks = localStorage.getItem(storageKey);

            if (savedTasks) {
                const parsedTasks = JSON.parse(savedTasks);

                if (Array.isArray(parsedTasks)) {
                    setTasks(parsedTasks);
                } else {
                    setTasks([]);
                }
            } else {
                setTasks([]);
            }
        } catch (error) {
            console.error("Failed to load tasks:", error);
            setTasks([]);
        }

        setLoaded(true);
    }, [storageKey]);

    // ================= SAVE TASKS =================

    useEffect(() => {
        if (!loaded || !storageKey) {
            return;
        }

        localStorage.setItem(
            storageKey,
            JSON.stringify(tasks)
        );

        window.dispatchEvent(
            new Event("mindEaseTasksUpdated")
        );
    }, [tasks, loaded, storageKey]);

    // ================= ADD TASK =================

    const addTask = () => {
        if (!userId) {
            alert("Please log in before adding a task.");
            return;
        }

        if (!taskText.trim() || !deadline) {
            return;
        }

        const newTask = {
            id: Date.now(),
            task: taskText.trim(),
            deadline: deadline,
            completed: false,
            createdAt: new Date().toISOString()
        };

        setTasks((prevTasks) => [
            ...prevTasks,
            newTask
        ]);

        setTaskText("");
        setDeadline("");
    };

    // ================= TOGGLE TASK =================

    const toggleTask = (id) => {
        setTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === id
                    ? {
                          ...task,
                          completed: !task.completed
                      }
                    : task
            )
        );
    };

    // ================= DELETE TASK =================

    const deleteTask = (id) => {
        setTasks((prevTasks) =>
            prevTasks.filter(
                (task) => task.id !== id
            )
        );
    };

    // ================= STATISTICS =================

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
        (task) => task.completed
    ).length;

    const pendingTasks =
        totalTasks - completedTasks;

    const completionPercentage =
        totalTasks === 0
            ? 0
            : Math.round(
                  (completedTasks / totalTasks) * 100
              );

    // ================= THEME =================

    const pageClass = isLight
        ? "min-h-screen bg-[#f5efff] text-[#2d1747]"
        : "min-h-screen bg-black text-white";

    const headerText = isLight
        ? "text-[#32174d]"
        : "text-white";

    const secondaryText = isLight
        ? "text-[#80639b]"
        : "text-emerald-100/60";

    const mutedText = isLight
        ? "text-[#987eae]"
        : "text-emerald-100/40";

    const accentText = isLight
        ? "text-[#9148d1]"
        : "text-emerald-300";

    const cardClass = isLight
        ? "bg-[#e9ddf7] border border-[#d4bceb] shadow-[0_8px_24px_rgba(111,60,150,0.08)]"
        : "bg-emerald-950/90 border border-emerald-700/60 shadow-lg";

    const taskListCardClass = isLight
        ? "bg-[#ded0ed] border border-[#cbb7df] shadow-[0_8px_24px_rgba(111,60,150,0.08)]"
        : "bg-emerald-950/90 border border-emerald-700/60 shadow-lg";

    const iconBoxClass = isLight
        ? "bg-[#dcc8f0] border border-[#c49ee5]"
        : "bg-emerald-800 border border-emerald-600/50";

    const inputClass = isLight
        ? "bg-[#f8f3ff] border-[#ceb4e8] text-[#32174d] placeholder-[#a88ebc] focus:border-[#a855f7] focus:ring-[#a855f7]/10"
        : "bg-emerald-900/80 border-emerald-700/60 text-white placeholder-emerald-100/30 focus:border-emerald-400 focus:ring-emerald-400/10";

    const buttonClass = isLight
        ? "bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-md shadow-purple-300/20"
        : "bg-emerald-400 hover:bg-emerald-300 text-emerald-950 shadow-md";

    // ================= UI =================

    return (
        <div className={pageClass}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

                {/* HEADER */}

                <div className="mb-6">
                    <p
                        className={`text-xs font-semibold uppercase tracking-[0.22em] mb-2 ${
                            isLight
                                ? "text-[#9b4de0]"
                                : "text-emerald-300"
                        }`}
                    >
                        MindEase
                    </p>

                    <h1
                        className={`text-3xl md:text-4xl font-bold mb-2 ${headerText}`}
                    >
                        Daily Tasks
                    </h1>

                    <p
                        className={`text-sm max-w-2xl ${secondaryText}`}
                    >
                        Plan your day, track your progress,
                        and build productive habits.
                    </p>
                </div>

                {/* STATISTICS */}

                <div
                    className={`${cardClass} rounded-2xl px-5 py-4 mb-5`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconBoxClass}`}
                            >
                                📋
                            </div>

                            <div>
                                <p className={`text-xs ${secondaryText}`}>
                                    Total Tasks
                                </p>

                                <p className={`text-xl font-bold ${accentText}`}>
                                    {totalTasks}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconBoxClass}`}
                            >
                                ✅
                            </div>

                            <div>
                                <p className={`text-xs ${secondaryText}`}>
                                    Completed
                                </p>

                                <p className={`text-xl font-bold ${accentText}`}>
                                    {completedTasks}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1">
                            <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconBoxClass}`}
                            >
                                📈
                            </div>

                            <div>
                                <p className={`text-xs ${secondaryText}`}>
                                    Completion Rate
                                </p>

                                <p className={`text-xl font-bold ${accentText}`}>
                                    {completionPercentage}%
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ADD TASK */}

                <div
                    className={`${cardClass} rounded-2xl p-4 mb-5`}
                >
                    <div className="flex items-center gap-3 mb-3">

                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconBoxClass}`}
                        >
                            ➕
                        </div>

                        <div>
                            <h2
                                className={`text-lg font-bold ${headerText}`}
                            >
                                Add a Task
                            </h2>

                            <p className={`text-xs ${mutedText}`}>
                                What would you like to accomplish today?
                            </p>
                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_auto] gap-2">

                        <input
                            type="text"
                            placeholder="What do you want to accomplish?"
                            value={taskText}
                            onChange={(e) =>
                                setTaskText(e.target.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    addTask();
                                }
                            }}
                            className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none border focus:ring-2 ${inputClass}`}
                        />

                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) =>
                                setDeadline(e.target.value)
                            }
                            className={`w-full rounded-lg px-3 py-2.5 text-sm outline-none border focus:ring-2 ${inputClass}`}
                        />

                        <button
                            onClick={addTask}
                            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition ${buttonClass}`}
                        >
                            Add Task
                        </button>

                    </div>
                </div>

                {/* TASK LIST */}

                <div>

                    <div className="flex items-center justify-between mb-3">

                        <div>
                            <h2
                                className={`text-xl font-bold ${headerText}`}
                            >
                                Today's Tasks
                            </h2>

                            <p
                                className={`text-xs mt-0.5 ${mutedText}`}
                            >
                                Stay consistent, one task at a time.
                            </p>
                        </div>

                        {pendingTasks > 0 && (
                            <span
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                    isLight
                                        ? "bg-[#e5d5f4] border border-[#cdb1e9] text-[#9148d1]"
                                        : "bg-emerald-950/90 border border-emerald-700/60 text-emerald-300"
                                }`}
                            >
                                {pendingTasks} pending
                            </span>
                        )}

                    </div>

                    {/* EMPTY STATE */}

                    {tasks.length === 0 ? (
                        <div
                            className={`${taskListCardClass} rounded-2xl p-8 text-center`}
                        >
                            <div className="text-4xl mb-3">
                                🌱
                            </div>

                            <h3
                                className={`text-lg font-semibold mb-1 ${headerText}`}
                            >
                                No tasks yet
                            </h3>

                            <p
                                className={`text-sm ${mutedText}`}
                            >
                                Add your first task and start
                                building your productive day.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">

                            {tasks.map((task) => {
                                const deadlineDate =
                                    new Date(task.deadline);

                                return (
                                    <div
                                        key={task.id}
                                        className={`rounded-xl px-4 py-3 flex items-center gap-3 transition border ${
                                            isLight
                                                ? task.completed
                                                    ? "bg-[#d1c3df] border-[#c2b2d2] opacity-60"
                                                    : "bg-[#ded0ed] border-[#cbb7df] hover:bg-[#d9c9e9]"
                                                : task.completed
                                                ? "bg-emerald-950/90 border-emerald-800 opacity-60"
                                                : "bg-emerald-950/90 border-emerald-700/60 hover:bg-emerald-950"
                                        }`}
                                    >

                                        {/* CHECKBOX */}

                                        <button
                                            onClick={() =>
                                                toggleTask(task.id)
                                            }
                                            className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 transition text-sm ${
                                                task.completed
                                                    ? isLight
                                                        ? "bg-[#a855f7] border-[#a855f7] text-white"
                                                        : "bg-emerald-400 border-emerald-400 text-emerald-950"
                                                    : isLight
                                                    ? "border-[#b88bdd] hover:border-[#9333ea] hover:bg-[#ddc9ef]"
                                                    : "border-emerald-600 hover:border-emerald-400 hover:bg-emerald-800"
                                            }`}
                                        >
                                            {task.completed && "✓"}
                                        </button>

                                        {/* TASK */}

                                        <div className="flex-1 min-w-0">

                                            <p
                                                className={`text-sm font-medium ${
                                                    task.completed
                                                        ? isLight
                                                            ? "line-through text-[#927ca3]"
                                                            : "line-through text-emerald-100/40"
                                                        : isLight
                                                        ? "text-[#32174d]"
                                                        : "text-emerald-50"
                                                }`}
                                            >
                                                {task.task}
                                            </p>

                                            <p
                                                className={`text-xs mt-0.5 ${mutedText}`}
                                            >
                                                Deadline:{" "}
                                                {deadlineDate.toLocaleString()}
                                            </p>

                                        </div>

                                        {/* STATUS */}

                                        <span
                                            className={`hidden sm:block text-[11px] px-2.5 py-1 rounded-full ${
                                                task.completed
                                                    ? isLight
                                                        ? "bg-[#d8c5e9] text-[#8d45c3] border border-[#c4a8dc]"
                                                        : "bg-emerald-800 text-emerald-300 border border-emerald-700"
                                                    : isLight
                                                    ? "bg-[#e1d0f0] text-[#9148d1] border border-[#cdb1e9]"
                                                    : "bg-emerald-900 text-emerald-300 border border-emerald-700/60"
                                            }`}
                                        >
                                            {task.completed
                                                ? "Completed"
                                                : "Pending"}
                                        </span>

                                        {/* DELETE */}

                                        <button
                                            onClick={() =>
                                                deleteTask(task.id)
                                            }
                                            className={
                                                isLight
                                                    ? "text-[#a58cad] hover:text-red-500 transition text-base"
                                                    : "text-emerald-100/30 hover:text-red-300 transition text-base"
                                            }
                                            title="Delete task"
                                        >
                                            🗑️
                                        </button>

                                    </div>
                                );
                            })}

                        </div>
                    )}

                </div>

                {/* FOOTER */}

                <div
                    className={`mt-5 px-4 py-3 rounded-xl border ${
                        isLight
                            ? "bg-[#e9ddf7] border-[#d4bceb]"
                            : "bg-emerald-950/80 border-emerald-800/60"
                    }`}
                >
                    <p
                        className={`text-[11px] leading-relaxed ${mutedText}`}
                    >
                        Your task progress is stored separately
                        for each MindEase account in this browser.
                    </p>
                </div>

            </div>
        </div>
    );
}

export default DailyTasks;