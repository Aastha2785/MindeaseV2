const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const getCurrentUser = () => {
    const raw =
        sessionStorage.getItem("mindEaseUser") ||
        localStorage.getItem("mindEaseUser");

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const getAuthHeaders = () => {
    const user = getCurrentUser();

    if (!user?.token) {
        throw new Error("Please login first");
    }

    return {
        Authorization: `Bearer ${user.token}`
    };
};

const parseResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || `Request failed with status ${response.status}`
        );
    }

    return data;
};

export const analyzeJournal = async (journal, user_id) => {
    const user = getCurrentUser();

    if (!user?.user_id || !user?.token) {
        throw new Error("Please login first");
    }

    // The backend uses the authenticated user as the source of truth.
    // Keep user_id for compatibility with the existing API contract.
    const response = await fetch(`${API_URL}/journal/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
        },
        body: JSON.stringify({
            journal,
            user_id: user.user_id || user_id
        })
    });

    return parseResponse(response);
};

export const analyzeFace = async (image) => {
    const response = await fetch(`${API_URL}/face/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
        },
        body: JSON.stringify({ image })
    });

    return parseResponse(response);
};

export const apiFetch = async (path, options = {}) => {
    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    return parseResponse(response);
};
