import {
    Outlet,
} from "react-router-dom";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

import "./layout.css";


export default function AppLayout() {

    return (
        <>
            <Navbar />

            <Sidebar />

            <div className="app-shell">

                <main className="app-content">
                    <Outlet />
                </main>

                <Footer />

            </div>
        </>
    );
}