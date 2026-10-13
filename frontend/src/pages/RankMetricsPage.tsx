import {
    useEffect,
    useState,
} from "react";

import {
    LoaderCircle,
    AlertTriangle,
} from "lucide-react";

import {
    Navigate,
} from "react-router-dom";

import {
    useAuth,
} from "../auth/AuthContext";

import {
    getRankMetrics,
} from "../services/coachingApi";

import type {
    RankMetricsResponse,
} from "../services/coachingApi";

import RankMetricsPanel
    from "./RankMetricsPanel";

import "./DashboardPage.css";


export default function RankMetricsPage() {

    const {
        riotAccount,
    } = useAuth();


    const riotAccountId =
        riotAccount?.id;


    const [
        data,
        setData,
    ] =
        useState<
            RankMetricsResponse
            | null
        >(
            null
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        error,
        setError,
    ] =
        useState<
            string
            | null
        >(
            null
        );


    useEffect(
        () => {

            if (
                !riotAccountId
            ) {

                setLoading(
                    false
                );

                return;
            }


            let cancelled =
                false;


            const loadRankMetrics =
                async () => {

                    try {

                        setLoading(
                            true
                        );

                        setError(
                            null
                        );


                        const response =
                            await getRankMetrics(
                                riotAccountId
                            );


                        if (
                            cancelled
                        ) {

                            return;
                        }


                        setData(
                            response
                        );

                    }
                    catch (
                        err
                    ) {

                        if (
                            cancelled
                        ) {

                            return;
                        }


                        setError(
                            err
                            instanceof Error

                                ? err.message

                                : "Unable to load rank metrics."
                        );

                    }
                    finally {

                        if (
                            !cancelled
                        ) {

                            setLoading(
                                false
                            );
                        }
                    }
                };


            loadRankMetrics();


            return () => {

                cancelled =
                    true;
            };

        },
        [
            riotAccountId,
        ],
    );


    if (
        !riotAccountId
    ) {

        return (
            <Navigate
                to="/connect"
                replace
            />
        );
    }


    if (
        loading
    ) {

        return (
            <div className="dashboard-state">

                <LoaderCircle
                    className="spin"
                    size={30}
                />

                <strong>
                    Loading rank metrics
                </strong>

                <p>
                    Comparing your recent gameplay
                    with the League ladder.
                </p>

            </div>
        );
    }


    if (
        error
    ) {

        return (
            <div className="dashboard-state">

                <AlertTriangle
                    size={26}
                />

                <strong>
                    Unable to load rank metrics
                </strong>

                <p>
                    {error}
                </p>

            </div>
        );
    }


    if (
        !data
    ) {

        return (
            <div className="dashboard-state">

                <strong>
                    No rank metrics available
                </strong>

            </div>
        );
    }


    return (
        <div className="dashboard">

            <RankMetricsPanel
                data={
                    data
                }
            />

        </div>
    );
}