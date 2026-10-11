import {
    BarChart3,
    BrainCircuit,
    Crosshair,
    Gauge,
    ShieldCheck,
    Swords,
    TrendingUp,
} from "lucide-react";

import {
    NavLink,
} from "react-router-dom";

import "./layout.css";

const profileLinks = [
    {
        path: "/",
        label: "Overview",
        icon: Gauge,
    },
    {
        path: "/strengths",
        label: "Strengths",
        icon: ShieldCheck,
    },
    {
        path: "/weaknesses",
        label: "Weaknesses",
        icon: Crosshair,
    },
    {
        path: "/improve",
        label: "How To Improve",
        icon: TrendingUp,
    },
    {
        path: "/roles",
        label: "Role Analysis",
        icon: Swords,
    },
];

export default function Sidebar() {

    return (
        <aside className="sidebar">

            <section>

                <p className="sidebar-label">
                    YOUR PROFILE
                </p>

                {
                    profileLinks.map(
                        ({
                            path,
                            label,
                            icon: Icon,
                        }) => (

                            <NavLink
                                key={path}
                                to={path}
                                className={({ isActive }) =>
                                    isActive
                                        ? "sidebar-item active"
                                        : "sidebar-item"
                                }
                            >

                                <Icon size={17} />

                                {label}

                            </NavLink>

                        ),
                    )
                }

            </section>

            <section>

                <p className="sidebar-label">
                    EXPLORE
                </p>

                <NavLink
                    to="/ranks"
                    className={({ isActive }) =>
                        isActive
                            ? "sidebar-item active"
                            : "sidebar-item"
                    }
                >
                    <BarChart3 size={17} />

                    Rank Metrics
                </NavLink>

            </section>

            <div className="engine-card">

                <div className="engine-icon">
                    <BrainCircuit size={19} />
                </div>

                <div>
                    <strong>
                        DiffTheory Engine
                    </strong>

                    <small>
                        Systems operational
                    </small>
                </div>

                <span className="status-dot" />

            </div>

        </aside>
    );
}