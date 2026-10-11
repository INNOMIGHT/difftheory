import {
    LoaderCircle,
} from "lucide-react";

import {
    Navigate,
    Outlet,
} from "react-router-dom";

import {
    useAuth,
} from "./AuthContext";


export default function ProtectedRoute() {

    const {
        loading,
        isAuthenticated,
    } = useAuth();


    if (loading) {
        return (
            <div
                style={{
                    minHeight:
                        "100vh",

                    display:
                        "grid",

                    placeItems:
                        "center",
                }}
            >
                <LoaderCircle
                    className="spin"
                    size={32}
                />
            </div>
        );
    }


    if (!isAuthenticated) {
        return (
            <Navigate
                to="/connect"
                replace
            />
        );
    }


    return (
        <Outlet />
    );
}