import { useEffect, useRef, useState } from "react";
import { analyzeFace } from "../services/api";
import { useTheme } from "../context/ThemeContext";

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
    // Session user gets priority because it represents
    // the currently logged-in session.
    const sessionUser = sessionStorage.getItem("mindEaseUser");
    const localUser = localStorage.getItem("mindEaseUser");

    const storedUser = sessionUser || localUser;

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser);
    } catch {
        return null;
    }
}

function FaceScan() {
    const { theme } = useTheme();
    const isLight = theme === "light";

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [cameraOn, setCameraOn] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (
            cameraOn &&
            videoRef.current &&
            streamRef.current
        ) {
            videoRef.current.srcObject = streamRef.current;

            videoRef.current
                .play()
                .catch(() => {});
        }
    }, [cameraOn]);

    const startCamera = async () => {
        try {
            setError("");
            setSaved(false);

            if (!navigator.mediaDevices?.getUserMedia) {
                setError(
                    "Camera access is not supported in this browser."
                );
                return;
            }

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 640,
                        height: 480,
                        facingMode: "user"
                    },
                    audio: false
                });

            streamRef.current = stream;
            setCameraOn(true);
        } catch (err) {
            console.error(err);

            setError(
                "Unable to access the camera. Please allow camera permission."
            );
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current = null;
        }

        setCameraOn(false);
    };

    const captureExpression = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
            setError("Camera is not ready.");
            return;
        }

        if (
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {
            setError(
                "Camera is still loading. Please try again."
            );
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const image = canvas.toDataURL(
            "image/jpeg",
            0.8
        );

        setCapturedImage(image);
        setAnalysis(null);
        setSaved(false);
        setError("");

        stopCamera();
    };

    const handleAnalyze = async () => {
        if (!capturedImage) {
            setError("Please capture a selfie first.");
            return;
        }

        const user = getCurrentUser();

        if (!user) {
            setError(
                "Please login before using Face Scan."
            );
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

            const data = await analyzeFace(
                capturedImage
            );

            setAnalysis(data.analysis);

            // Store face analysis separately for this user.
            const analysisKey =
                `mindEaseFaceAnalysis_${user.user_id}`;

            localStorage.setItem(
                analysisKey,
                JSON.stringify({
                    analysis: data.analysis,
                    timestamp:
                        new Date().toISOString()
                })
            );

            window.dispatchEvent(
                new Event("mindEaseFaceUpdated")
            );
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                    "Unable to analyze the selfie."
            );
        } finally {
            setLoading(false);
        }
    };

    const saveSelfie = () => {
        if (!capturedImage) {
            setError("Please capture a selfie first.");
            return;
        }

        const user = getCurrentUser();

        if (!user) {
            setError(
                "Please login before saving a selfie."
            );
            return;
        }

        if (!user.user_id) {
            setError(
                "User information is missing. Please login again."
            );
            return;
        }

        try {
            /*
             * IMPORTANT
             *
             * Selfies are stored using the SAME key
             * that History.jsx must read.
             *
             * Example:
             *
             * user 1 -> mindEaseSelfieHistory_v2_1
             * user 4 -> mindEaseSelfieHistory_v2_4
             *
             * Each user has completely separate selfie history.
             */

            const storageKey =
                `mindEaseSelfieHistory_v2_${user.user_id}`;

            let existingHistory = [];

            try {
                existingHistory = JSON.parse(
                    localStorage.getItem(storageKey) || "[]"
                );

                if (!Array.isArray(existingHistory)) {
                    existingHistory = [];
                }
            } catch {
                existingHistory = [];
            }

            const selfieRecord = {
                id: Date.now(),
                image: capturedImage,
                timestamp:
                    new Date().toISOString()
            };

            const updatedHistory = [
                selfieRecord,
                ...existingHistory
            ];

            localStorage.setItem(
                storageKey,
                JSON.stringify(updatedHistory)
            );

            // Notify History.jsx that a new selfie was saved.
            window.dispatchEvent(
                new Event(
                    "mindEaseSelfieHistoryUpdated"
                )
            );

            setSaved(true);
            setError("");
        } catch (err) {
            console.error(err);

            setError(
                "Unable to save the selfie. Your browser storage may be full."
            );
        }
    };

    const retake = () => {
        stopCamera();

        setCapturedImage(null);
        setAnalysis(null);
        setSaved(false);
        setError("");
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });
            }
        };
    }, []);

    const cardClass = isLight
        ? "bg-purple-100 border-purple-200 text-purple-950"
        : "bg-emerald-950 border-emerald-800 text-white";

    const secondaryText = isLight
        ? "text-purple-700"
        : "text-emerald-200";

    const primaryButton = isLight
        ? "bg-purple-600 hover:bg-purple-700 text-white"
        : "bg-emerald-500 hover:bg-emerald-400 text-black";

    return (
        <div
            className={`min-h-screen px-6 py-8 ${
                isLight
                    ? "bg-gradient-to-br from-purple-100 via-lavender-100 to-pink-100"
                    : "bg-gradient-to-br from-emerald-950 via-emerald-900 to-black"
            }`}
        >
            <div className="max-w-5xl mx-auto">

                <div className="mb-8">
                    <h1
                        className={`text-3xl font-bold ${
                            isLight
                                ? "text-purple-950"
                                : "text-white"
                        }`}
                    >
                        📸 Face Scan
                    </h1>

                    <p
                        className={`mt-2 ${secondaryText}`}
                    >
                        Capture your facial expression and let
                        MindEase analyze the emotions it can observe.
                    </p>
                </div>

                <div
                    className={`rounded-3xl border p-6 shadow-xl ${cardClass}`}
                >
                    <canvas
                        ref={canvasRef}
                        className="hidden"
                    />

                    {!cameraOn && !capturedImage && (
                        <div className="text-center py-16">
                            <div className="text-7xl mb-6">
                                📷
                            </div>

                            <h2 className="text-2xl font-bold mb-3">
                                Ready for a Face Scan?
                            </h2>

                            <p
                                className={`max-w-xl mx-auto mb-8 ${secondaryText}`}
                            >
                                Take a selfie using your camera.
                                Your image will only be saved to
                                History if you explicitly choose
                                "Save Selfie".
                            </p>

                            <button
                                onClick={startCamera}
                                className={`px-7 py-3 rounded-xl font-semibold transition ${primaryButton}`}
                            >
                                Start Camera
                            </button>
                        </div>
                    )}

                    {cameraOn && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full max-w-2xl rounded-2xl border-4 border-emerald-400 shadow-lg"
                                />
                            </div>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={
                                        captureExpression
                                    }
                                    className={`px-7 py-3 rounded-xl font-semibold transition ${primaryButton}`}
                                >
                                    📸 Capture Selfie
                                </button>

                                <button
                                    onClick={stopCamera}
                                    className={`px-7 py-3 rounded-xl font-semibold ${
                                        isLight
                                            ? "bg-purple-200 hover:bg-purple-300 text-purple-900"
                                            : "bg-emerald-800 hover:bg-emerald-700 text-white"
                                    }`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {capturedImage && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">
                                    Your Captured Selfie
                                </h2>

                                <div className="flex justify-center">
                                    <img
                                        src={capturedImage}
                                        alt="Captured selfie"
                                        className="w-full max-w-2xl rounded-2xl border-4 border-emerald-400 shadow-xl"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4">

                                <button
                                    onClick={
                                        handleAnalyze
                                    }
                                    disabled={loading}
                                    className={`px-6 py-3 rounded-xl font-semibold transition ${primaryButton} disabled:opacity-50`}
                                >
                                    {loading
                                        ? "Analyzing..."
                                        : "🤖 Analyze Expression"}
                                </button>

                                <button
                                    onClick={saveSelfie}
                                    disabled={saved}
                                    className={`px-6 py-3 rounded-xl font-semibold transition ${
                                        saved
                                            ? "bg-green-500 text-white cursor-default"
                                            : isLight
                                                ? "bg-purple-300 hover:bg-purple-400 text-purple-950"
                                                : "bg-emerald-700 hover:bg-emerald-600 text-white"
                                    }`}
                                >
                                    {saved
                                        ? "✓ Saved to History"
                                        : "💾 Save Selfie"}
                                </button>

                                <button
                                    onClick={retake}
                                    className={`px-6 py-3 rounded-xl font-semibold ${
                                        isLight
                                            ? "bg-purple-200 hover:bg-purple-300 text-purple-900"
                                            : "bg-emerald-800 hover:bg-emerald-700 text-white"
                                    }`}
                                >
                                    🔄 Retake
                                </button>
                            </div>

                            <p
                                className={`text-center text-sm ${secondaryText}`}
                            >
                                Your selfie is not saved automatically.
                                Click <strong>Save Selfie</strong> only if
                                you want it stored in History.
                            </p>

                            {saved && (
                                <div className="text-center text-green-500 font-semibold">
                                    ✓ Selfie saved successfully.
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 text-center">
                            {error}
                        </div>
                    )}
                </div>

                {analysis && (
                    <div
                        className={`mt-8 rounded-3xl border p-6 shadow-xl ${cardClass}`}
                    >
                        <h2 className="text-2xl font-bold mb-6">
                            🧠 Expression Analysis
                        </h2>

                        {analysis.emotions && (
                            <div className="space-y-4">
                                {analysis.emotions.map(
                                    (item, index) => (
                                        <div
                                            key={`${item.emotion}-${index}`}
                                        >
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold">
                                                    {emotionEmoji[
                                                        item.emotion
                                                    ] || "🙂"}{" "}
                                                    {item.emotion}
                                                </span>

                                                <span className="font-bold">
                                                    {
                                                        item.percentage
                                                    }
                                                    %
                                                </span>
                                            </div>

                                            <div
                                                className={`h-3 rounded-full overflow-hidden ${
                                                    isLight
                                                        ? "bg-purple-200"
                                                        : "bg-emerald-900"
                                                }`}
                                            >
                                                <div
                                                    className={`h-full rounded-full ${
                                                        isLight
                                                            ? "bg-purple-500"
                                                            : "bg-emerald-400"
                                                    }`}
                                                    style={{
                                                        width: `${item.percentage}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {analysis.dominantEmotion && (
                            <div
                                className={`mt-6 p-4 rounded-xl ${
                                    isLight
                                        ? "bg-purple-200"
                                        : "bg-emerald-900"
                                }`}
                            >
                                <strong>
                                    Dominant observed emotion:
                                </strong>{" "}
                                {emotionEmoji[
                                    analysis.dominantEmotion
                                ] || "🙂"}{" "}
                                {analysis.dominantEmotion}
                            </div>
                        )}

                        <p
                            className={`mt-5 text-sm ${secondaryText}`}
                        >
                            This analysis describes observable facial
                            expressions and is not a medical diagnosis.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FaceScan;