import {
    BarChart3,
    Home,
    LogOut,
    Menu,
    Swords,
} from "lucide-react";

import {
    NavLink,
    useNavigate,
} from "react-router-dom";

import {
    useAuth,
} from "../../auth/AuthContext";

import ThemeToggle
    from "../ui/ThemeToggle";

import "./layout.css";


export default function Navbar() {

    const navigate =
        useNavigate();

    const {
        riotAccount,
        logout,
    } = useAuth();


    async function handleLogout() {

        await logout();

        navigate(
            "/connect",
            {
                replace:
                    true,
            },
        );
    }


    return (
        <header className="navbar">

            <NavLink
                to="/"
                className="brand"
            >

                <div className="brand-mark">
                    DT
                </div>

                <div className="brand-text">

                    <strong>
                        DIFF
                        <span>
                            THEORY
                        </span>
                    </strong>

                    <small>
                        BEYOND THE STATS
                    </small>

                </div>

            </NavLink>


            <nav className="top-navigation">

                <NavLink
                    to="/"
                    end
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "top-nav-link active"
                                : "top-nav-link"
                    }
                >
                    <Home size={15} />
                    <span>Home</span>
                </NavLink>


                <NavLink
                    to="/matches"
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "top-nav-link active"
                                : "top-nav-link"
                    }
                >
                    <Swords size={15} />
                    <span>Matches</span>
                </NavLink>


                <NavLink
                    to="/analysis"
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "top-nav-link active"
                                : "top-nav-link"
                    }
                >
                    <BarChart3 size={15} />
                    <span>Analysis</span>
                </NavLink>


                <NavLink
                    to="/ranks"
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "top-nav-link active"
                                : "top-nav-link"
                    }
                >
                    <Menu size={15} />
                    <span>Ranks</span>
                </NavLink>

            </nav>


            <div className="navbar-actions">

                {
                    riotAccount
                    && (
                        <span className="navbar-player">
                            {riotAccount.game_name}
                            <b>
                                #{riotAccount.tag_line}
                            </b>
                        </span>
                    )
                }

                <ThemeToggle />

                <button
                    type="button"
                    className="ghost-button"
                    onClick={
                        handleLogout
                    }
                >
                    <LogOut
                        size={14}
                    />

                    Sign Out
                </button>

            </div>

        </header>
    );
}