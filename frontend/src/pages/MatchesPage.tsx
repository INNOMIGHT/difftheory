import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    Swords,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    getPlayerMatches,
} from "../services/coachingApi";

import type {
    DashboardMatch,
} from "../services/coachingApi";

import "./MatchesPage.css";
import {
    useAuth,
} from "../auth/AuthContext";





function safeNumber(
    value: unknown,
    fallback = 0,
): number {
    if (
        typeof value === "number"
        && Number.isFinite(
            value,
        )
    ) {
        return value;
    }

    const parsed =
        Number(
            value,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : fallback;
}


function humanize(
    value?: string | null,
): string {
    if (!value) {
        return "Unknown";
    }

    return value
        .replaceAll(
            "_",
            " ",
        )
        .toLowerCase()
        .replace(
            /\b\w/g,
            (
                letter,
            ) =>
                letter.toUpperCase(),
        );
}


function formatDuration(
    value?: number | null,
): string {
    if (!value) {
        return "—";
    }

    let seconds =
        safeNumber(
            value,
        );

    if (
        seconds
        > 100000
    ) {
        seconds /=
            1000;
    }

    const minutes =
        Math.floor(
            seconds / 60,
        );

    const remainingSeconds =
        Math.floor(
            seconds % 60,
        );

    return `${minutes}:${String(
        remainingSeconds,
    ).padStart(
        2,
        "0",
    )}`;
}


function formatDate(
    value?: number | string | null,
): string {
    if (!value) {
        return "Recent";
    }

    let date: Date;

    if (
        typeof value
        === "number"
    ) {
        const timestamp =
            value
            < 100000000000
                ? value * 1000
                : value;

        date =
            new Date(
                timestamp,
            );
    }
    else {
        date =
            new Date(
                value,
            );
    }

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "Recent";
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    );
}


function getKda(
    match: DashboardMatch,
): string {
    const kills =
        safeNumber(
            match.kills,
        );

    const deaths =
        safeNumber(
            match.deaths,
        );

    const assists =
        safeNumber(
            match.assists,
        );

    if (
        deaths === 0
    ) {
        return (
            kills
            + assists
        ).toFixed(
            1,
        );
    }

    return (
        (
            kills
            + assists
        )
        /
        deaths
    ).toFixed(
        2,
    );
}


function MatchesPage() {
    const navigate =
        useNavigate();

    const [
        matches,
        setMatches,
    ] = useState<
        DashboardMatch[]
    >(
        [],
    );

    const [
        loading,
        setLoading,
    ] = useState(
        true,
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );

        const {
    riotAccount,
    } = useAuth();

    const riotAccountId =
        riotAccount?.id;



    useEffect(
        () => {

            if (
                !riotAccountId
            ) {
                setLoading(
                    false,
                );

                setError(
                    "No Riot account is connected.",
                );

                return;
            }


            const currentRiotAccountId =
                riotAccountId;


            let active =
                true;


            async function loadMatches() {

                try {

                    setLoading(
                        true,
                    );

                    setError(
                        null,
                    );


                    const result =
                        await getPlayerMatches(
                            currentRiotAccountId,
                            20,
                        );


                    if (
                        active
                    ) {
                        setMatches(
                            result.matches
                            ?? [],
                        );
                    }

                }
                catch (
                    err
                ) {

                    if (
                        active
                    ) {
                        setError(
                            err instanceof Error
                                ? err.message
                                : "Unable to load match history.",
                        );
                    }

                }
                finally {

                    if (
                        active
                    ) {
                        setLoading(
                            false,
                        );
                    }

                }
            }


            loadMatches();


            return () => {
                active =
                    false;
            };

        },
        [
            riotAccountId,
        ],
    );


    if (
        loading
    ) {
        return (
            <div className="matches-state">

                <LoaderCircle
                    size={30}
                    className="spin"
                />

                <strong>
                    Loading match history
                </strong>

                <p>
                    Pulling your recent ranked games.
                </p>

            </div>
        );
    }


    return (
        <div className="matches-page">

            <header className="matches-header">

                <div>

                    <p>
                        MATCH HISTORY
                    </p>

                    <h1>
                        Your recent games
                    </h1>

                    <span>
                        Open any match to see the same full
                        DiffTheory analysis available from
                        your dashboard.
                    </span>

                </div>


                <div className="matches-header-stat">

                    <span>
                        MATCHES LOADED
                    </span>

                    <strong>
                        {
                            matches.length
                        }
                    </strong>

                </div>

            </header>


            {
                error
                && (
                    <div className="matches-error">

                        <AlertTriangle
                            size={18}
                        />

                        {error}

                    </div>
                )
            }


            {
                matches.length
                === 0
                    ? (
                        <section className="matches-empty">

                            <Swords
                                size={28}
                            />

                            <strong>
                                No recent matches found
                            </strong>

                            <p>
                                Once ranked match data is available,
                                your games will appear here.
                            </p>

                        </section>
                    )
                    : (
                        <section className="match-history-panel">

                            <div className="match-history-header">

                                <span>
                                    #
                                </span>

                                <span>
                                    CHAMPION
                                </span>

                                <span>
                                    RESULT
                                </span>

                                <span>
                                    K / D / A
                                </span>

                                <span>
                                    KDA
                                </span>

                                <span>
                                    DURATION
                                </span>

                                <span>
                                    DATE
                                </span>

                                <span>
                                    ANALYSIS
                                </span>

                            </div>


                            <div className="match-history-list">

                                {
                                    matches.map(
                                        (
                                            match,
                                            index,
                                        ) => (
                                            <button
                                                type="button"
                                                key={
                                                    match.match_id
                                                }
                                                className={
                                                    `match-history-row ${
                                                        match.win
                                                            ? "match-history-win"
                                                            : "match-history-loss"
                                                    }`
                                                }
                                                onClick={
                                                    () =>
                                                        navigate(
                                                            `/analysis/${encodeURIComponent(
                                                                match.match_id,
                                                            )}`,
                                                        )
                                                }
                                            >

                                                <div className="match-history-index">

                                                    {
                                                        String(
                                                            index + 1,
                                                        ).padStart(
                                                            2,
                                                            "0",
                                                        )
                                                    }

                                                </div>


                                                <div className="match-history-champion">

                                                    <div className="match-history-avatar">

                                                        {
                                                            (
                                                                match.champion
                                                                ?? "?"
                                                            )
                                                            .charAt(
                                                                0,
                                                            )
                                                            .toUpperCase()
                                                        }

                                                    </div>


                                                    <div>

                                                        <strong>
                                                            {
                                                                match.champion
                                                                ?? "Unknown Champion"
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                humanize(
                                                                    match.role,
                                                                )
                                                            }
                                                        </span>

                                                    </div>

                                                </div>


                                                <div className="match-history-result">

                                                    <strong>
                                                        {
                                                            match.win
                                                                ? "VICTORY"
                                                                : "DEFEAT"
                                                        }
                                                    </strong>

                                                </div>


                                                <div className="match-history-kda">

                                                    <strong>
                                                        {
                                                            safeNumber(
                                                                match.kills,
                                                            )
                                                        }
                                                        {" / "}
                                                        {
                                                            safeNumber(
                                                                match.deaths,
                                                            )
                                                        }
                                                        {" / "}
                                                        {
                                                            safeNumber(
                                                                match.assists,
                                                            )
                                                        }
                                                    </strong>

                                                </div>


                                                <div className="match-history-ratio">

                                                    <strong>
                                                        {
                                                            getKda(
                                                                match,
                                                            )
                                                        }
                                                    </strong>

                                                    <span>
                                                        KDA
                                                    </span>

                                                </div>


                                                <div className="match-history-duration">

                                                    <Clock3
                                                        size={13}
                                                    />

                                                    {
                                                        formatDuration(
                                                            match.game_duration,
                                                        )
                                                    }

                                                </div>


                                                <div className="match-history-date">

                                                    {
                                                        formatDate(
                                                            match.game_creation,
                                                        )
                                                    }

                                                </div>


                                                <div className="match-history-analysis">

                                                    {
                                                        match.analysis_cached
                                                            ? (
                                                                <>
                                                                    <CheckCircle2
                                                                        size={14}
                                                                    />

                                                                    <span>
                                                                        ANALYSED
                                                                    </span>
                                                                </>
                                                            )
                                                            : (
                                                                <>
                                                                    <Clock3
                                                                        size={14}
                                                                    />

                                                                    <span>
                                                                        PENDING
                                                                    </span>
                                                                </>
                                                            )
                                                    }

                                                    <ArrowRight
                                                        size={15}
                                                    />

                                                </div>

                                            </button>
                                        ),
                                    )
                                }

                            </div>

                        </section>
                    )
            }

        </div>
    );
}


export default MatchesPage;