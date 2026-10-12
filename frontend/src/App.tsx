import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import {
    AuthProvider,
} from "./auth/AuthContext";

import ProtectedRoute
    from "./auth/ProtectedRoute";

import AppLayout
    from "./components/layout/AppLayout";

import DashboardPage
    from "./pages/DashboardPage";

import MatchesPage
    from "./pages/MatchesPage";

import AnalysisPage
    from "./pages/AnalysisPage";

import RanksPage
    from "./pages/RanksPage";

import ConnectPage
    from "./pages/ConnectPage";

import PrivacyPage
    from "./pages/PrivacyPage";

import TermsPage
    from "./pages/TermsPage";


export default function App() {

    return (
        <AuthProvider>

            <Routes>

                {/* Public beta entry */}

                <Route
                    path="/connect"
                    element={
                        <ConnectPage />
                    }
                />


                {/* Authenticated DiffTheory */}

                <Route
                    element={
                        <ProtectedRoute />
                    }
                >

                    <Route
                        element={
                            <AppLayout />
                        }
                    >

                        <Route
                            path="/"
                            element={
                                <DashboardPage />
                            }
                        />

                        <Route
                            path="/matches"
                            element={
                                <MatchesPage />
                            }
                        />

                        <Route
                            path="/analysis"
                            element={
                                <AnalysisPage />
                            }
                        />

                        <Route
                            path="/analysis/:matchId"
                            element={
                                <AnalysisPage />
                            }
                        />

                        <Route
                            path="/ranks"
                            element={
                                <RanksPage />
                            }
                        />

                        <Route
                            path="/strengths"
                            element={
                                <DashboardPage />
                            }
                        />

                        <Route
                            path="/weaknesses"
                            element={
                                <DashboardPage />
                            }
                        />

                        <Route
                            path="/improve"
                            element={
                                <DashboardPage />
                            }
                        />

                        <Route
                            path="/roles"
                            element={
                                <DashboardPage />
                            }
                        />

                    </Route>

                </Route>

                <Route
                    path="/privacy"
                    element={
                        <PrivacyPage />
                    }
                />

                <Route
                    path="/terms"
                    element={
                        <TermsPage />
                    }
                />

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />

            </Routes>

        </AuthProvider>
    );
}