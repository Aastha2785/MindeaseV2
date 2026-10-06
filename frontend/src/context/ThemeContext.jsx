import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("mindEaseTheme");

        return savedTheme === "light" ? "light" : "dark";
    });

    useEffect(() => {
        const root = document.documentElement;

        root.setAttribute("data-theme", theme);

        root.classList.remove("theme-dark", "theme-light");

        root.classList.add(
            theme === "light" ? "theme-light" : "theme-dark"
        );

        localStorage.setItem("mindEaseTheme", theme);

        // Apply theme directly to the page background
        if (theme === "light") {
            document.body.style.background =
                "linear-gradient(135deg, #f7f1ff 0%, #eee3ff 50%, #f9f5ff 100%)";

            document.body.style.color = "#32184f";
        } else {
            document.body.style.background =
                "linear-gradient(135deg, #02130d 0%, #05271b 50%, #031a12 100%)";

            document.body.style.color = "#f2fff8";
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark"
        );
    };

    const isLight = theme === "light";

    return (
        <ThemeContext.Provider
            value={{
                theme,
                isLight,
                toggleTheme
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}