import {
    Moon,
    Sun,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";


type Theme =
    | "dark"
    | "light";


export default function ThemeToggle() {

    const [
        theme,
        setTheme,
    ] = useState<Theme>(() => {

        const saved =
            localStorage.getItem(
                "difftheory-theme",
            );

        return saved === "light"
            ? "light"
            : "dark";
    });


    useEffect(
        () => {

            document.documentElement.setAttribute(
                "data-theme",
                theme,
            );

            localStorage.setItem(
                "difftheory-theme",
                theme,
            );

        },
        [
            theme,
        ],
    );


    return (
        <button
            className="theme-toggle"
            type="button"
            onClick={() =>
                setTheme(
                    current =>
                        current === "dark"
                            ? "light"
                            : "dark",
                )
            }
            aria-label={
                theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            }
            title={
                theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            }
        >
            {
                theme === "dark"
                    ? <Sun size={18} />
                    : <Moon size={18} />
            }
        </button>
    );
}