import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CircleHelp,
    Clock3,
    Crown,
    Crosshair,
    Flame,
    Gauge,
    LoaderCircle,
    ScanSearch,
    ShieldAlert,
    Sparkles,
    Swords,
    Target,
    TrendingDown,
    Trophy,
    Zap,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    getPlayerCoaching,
    getPlayerMatches,
    getRankMetrics,
    refreshPlayerCoaching,
} from "../services/coachingApi";

import type {
    DashboardMatch,
    RankMetricsResponse,
} from "../services/coachingApi";

import type {
    CategorySummaryItem,
    CoachingResponse,
    MixedPattern,
    Priority,
    RankReadiness,
    RoleBreakdownItem,
    Strength,
} from "../types/coaching";

import "./DashboardPage.css";

import {
    useAuth,
} from "../auth/AuthContext";
import RankMetricsPanel from "./RankMetricsPanel";



function safeNumber(
    value: unknown,
    fallback = 0,
): number {
    if (
        typeof value === "number"
        && Number.isFinite(value)
    ) {
        return value;
    }

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}


function clamp(
    value: number,
    min: number,
    max: number,
) {
    return Math.min(
        max,
        Math.max(
            min,
            value,
        ),
    );
}


function getPriorityScore(
    priority: Priority,
): number {
    return safeNumber(
        priority.priority_score
        ?? priority.score,
    );
}


function getPriorityLevel(
    priority: Priority,
): string {
    const direct =
        (
            priority as Priority & {
                priority_level?: string;
            }
        ).priority_level;

    if (direct) {
        return direct;
    }

    const score =
        getPriorityScore(
            priority,
        );

    if (score >= 8) {
        return "VERY_HIGH";
    }

    if (score >= 6) {
        return "HIGH";
    }

    if (score >= 4) {
        return "MODERATE";
    }

    return "LOW";
}


function getMatchesAffected(
    priority: Priority,
): number {
    return safeNumber(
        priority.matches_affected
        ?? priority.affected_matches,
    );
}


function getTrendLabel(
    priority: Priority,
): string {
    if (
        typeof priority.trend
        === "string"
    ) {
        return priority.trend;
    }

    const trend =
        priority.trend as
        | {
            direction?: string;
            classification?: string;
        }
        | undefined;

    return (
        trend?.direction
        ?? trend?.classification
        ?? "STABLE"
    );
}


function humanize(
    value?: string | null,
) {
    if (!value) {
        return "Unknown";
    }

    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
            /\b\w/g,
            (letter) =>
                letter.toUpperCase(),
        );
}


function formatPercent(
    value: unknown,
) {
    return `${Math.round(
        safeNumber(value)
        * 100,
    )}%`;
}


function formatDuration(
    value?: number | null,
) {
    if (!value) {
        return "—";
    }

    let seconds =
        safeNumber(value);

    if (seconds > 100000) {
        seconds /= 1000;
    }

    const minutes =
        Math.floor(
            seconds / 60,
        );

    const remaining =
        Math.floor(
            seconds % 60,
        );

    return `${minutes}:${String(
        remaining,
    ).padStart(
        2,
        "0",
    )}`;
}


function formatDate(
    value?: number | string | null,
) {
    if (!value) {
        return "Recent";
    }

    let parsed: Date;

    if (
        typeof value === "number"
    ) {
        const timestamp =
            value < 100000000000
                ? value * 1000
                : value;

        parsed =
            new Date(
                timestamp,
            );
    }
    else {
        parsed =
            new Date(
                value,
            );
    }

    if (
        Number.isNaN(
            parsed.getTime(),
        )
    ) {
        return "Recent";
    }

    return parsed.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
        },
    );
}


function getKda(
    match: DashboardMatch,
) {
    if (
        safeNumber(
            match.deaths,
        ) === 0
    ) {
        return (
            safeNumber(
                match.kills,
            )
            +
            safeNumber(
                match.assists,
            )
        ).toFixed(
            1,
        );
    }

    return (
        (
            safeNumber(
                match.kills,
            )
            +
            safeNumber(
                match.assists,
            )
        )
        /
        safeNumber(
            match.deaths,
            1,
        )
    ).toFixed(
        2,
    );
}


function priorityLevelText(
    level: string,
) {
    switch (
        level
    ) {
        case "VERY_HIGH":
            return "VERY HIGH PRIORITY";

        case "HIGH":
            return "HIGH PRIORITY";

        case "MODERATE":
            return "MODERATE PRIORITY";

        default:
            return "LOW PRIORITY";
    }
}


async function DashboardPage() {
    const navigate =
        useNavigate();

    const {
        riotAccount,
        leagueProfile,
        } = useAuth();

    const riotAccountId = riotAccount?.id;

    const [
        data,
        setData,
    ] = useState<
        CoachingResponse | null
    >(
        null,
    );

    const [
        matches,
        setMatches,
    ] = useState<
        DashboardMatch[]
    >(
        [],
    );

    
    const [
        rankMetrics,
        setRankMetrics,
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
    ] = useState(
        true,
    );

    const [
        judging,
        setJudging,
    ] = useState(
        false,
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );

    const [
        judgementComplete,
        setJudgementComplete,
    ] = useState(
        false,
    );


    const problemsRef =
    useRef<HTMLElement | null>(
        null,
    );

    const strengthsRef =
        useRef<HTMLElement | null>(
            null,
        );

    const categoriesRef =
        useRef<HTMLElement | null>(
            null,
        );

    const matchesRef =
        useRef<HTMLElement | null>(
            null,
        );

    const scrollToSection = (
        ref: React.RefObject<HTMLElement | null>,
    ) => {
        ref.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    const loadDashboard =
        useCallback(
            async (
                showLoading = true,
            ) => {

                try {
                    if (!riotAccountId) {
                        setError(
                            "No Riot account is connected.",
                        );

                        setLoading(
                            false,
                        );

                        return;
                    }
                    if (
                        showLoading
                    ) {
                        setLoading(
                            true,
                        );
                    }

                    setError(
                        null,
                    );

                    const [
                        coachingResponse,
                        matchesResponse,
                        rankMetricsResponse,
                    ] =
                        await Promise.all(
                            [
                                getPlayerCoaching(
                                    riotAccountId,
                                ),

                                getPlayerMatches(
                                    riotAccountId,
                                    10,
                                ),

                                getRankMetrics(),
                            ],
                        );


                    setData(
                        coachingResponse,
                    );


                    setMatches(
                        matchesResponse.matches
                        ?? [],
                    );


                    setRankMetrics(
                        rankMetricsResponse,
                    );
                }
                catch (
                    err
                ) {
                    setError(
                        err
                        instanceof Error
                            ? err.message
                            : "Unable to load DiffTheory dashboard.",
                    );
                }
                finally {
                    if (
                        showLoading
                    ) {
                        setLoading(
                            false,
                        );
                    }
                }
            },
        [
            riotAccountId,
        ],
        );


    useEffect(
        () => {
            loadDashboard();
        },
        [
            loadDashboard,
        ],
    );


    const runJudgement =
        async () => {
            if (!riotAccountId) {
                return;
            }
            try {
                setJudging(
                    true,
                );

                setError(
                    null,
                );

                setJudgementComplete(
                    false,
                );

                await refreshPlayerCoaching(
                    riotAccountId,
                );

                await loadDashboard(
                    false,
                );

                setJudgementComplete(
                    true,
                );
            }
            catch (
                err
            ) {
                setError(
                    err
                    instanceof Error
                        ? err.message
                        : "Judgement Day failed.",
                );
            }
            finally {
                setJudging(
                    false,
                );
            }
        };


    const coaching =
        data?.coaching;

    const record =
        coaching?.record;

    const priorities =
        coaching?.top_priorities
        ?? [];

    const allPriorities =
        coaching?.all_priorities
        ?? priorities;

    const strengths =
        coaching?.strengths
        ?? [];

    const mixedPatterns =
        coaching?.mixed_patterns
        ?? [];

    const readiness =
        coaching?.rank_readiness;
        


    const categories =
        coaching?.category_summary
        ?? {};

    const roles =
        coaching?.role_breakdown
        ?? {};


    const biggestLeak =
        priorities[0];

    const bestWeapon =
        strengths[0];

    const biggestMixedPattern =
        mixedPatterns[0];


    const totalPriorityEvidence =
        useMemo(
            () =>
                priorities.reduce(
                    (
                        total,
                        priority,
                    ) =>
                        total
                        +
                        safeNumber(
                            priority.evidence_count,
                        ),
                    0,
                ),
            [
                priorities,
            ],
        );


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
                    Loading your DiffTheory profile
                </strong>

                <p>
                    Pulling your latest coaching data and matches.
                </p>

            </div>
        );
    }


    const playerName =
        data?.game_name
        ?? "INNOMIGHT";

    const tagLine =
        data?.tag_line
        ?? "DREAM";

    const rank =
        data?.rank
        ?? "UNRANKED";


    return (
        <div className="dashboard">

            {/* ==================================================
                PLAYER HEADER
            ================================================== */}

            <section className="player-header">

                <div className="player-identity">

                    <p className="eyebrow">
                        PLAYER PROFILE
                    </p>

                    <h1>
                        {playerName}

                        <span>
                            #{tagLine}
                        </span>
                    </h1>

                    <div className="player-meta">

                        <span className="rank-pill">

                            <Crown
                                size={14}
                            />

                            {rank}

                        </span>

                        <span>
                            {
                                leagueProfile?.platform
                                    ?.replace(
                                        /1$/,
                                        "",
                                    )
                                ?? "—"
                            }
                        </span>
                        <span className="meta-dot">
                            •
                        </span>

                        <span>
                            {
                                coaching?.matches_analyzed
                                ?? 0
                            }
                            {" "}
                            games analysed
                        </span>

                    </div>

                </div>


                <div className="header-record">

                    <div>
                        <span>
                            RECENT RECORD
                        </span>

                        <strong>

                            <b className="wins">
                                {
                                    record?.wins
                                    ?? 0
                                }W
                            </b>

                            <b className="losses">
                                {
                                    record?.losses
                                    ?? 0
                                }L
                            </b>

                        </strong>
                    </div>

                    <div className="record-divider" />

                    <div>

                        <span>
                            WIN RATE
                        </span>

                        <strong>
                            {
                                Math.round(
                                    (
                                        record?.win_rate
                                        ?? 0
                                    )
                                    * 100,
                                )
                            }%
                        </strong>

                    </div>

                </div>

            </section>


            {/* ==================================================
                JUDGEMENT DAY HERO
            ================================================== */}

            <section className="judgement-card">

                <div className="judgement-grid" />

                <div className="judgement-content">

                    <div className="judge-icon">

                        <ScanSearch
                            size={27}
                        />

                    </div>

                    <p className="judge-kicker">
                        DIFFTHEORY PRESENTS
                    </p>

                    <h2>
                        JUDGEMENT
                        <span>
                            DAY
                        </span>
                    </h2>

                    <h3>
                        Your games already told the story.
                        <br />
                        We just read the evidence.
                    </h3>

                    <p className="judge-copy">
                        DiffTheory analyses your latest games,
                        finds recurring weaknesses, identifies
                        reliable strengths and shows what actually
                        deserves your attention next.
                    </p>

                    <div className="judge-actions">

                        <button
                            className="judge-button"
                            disabled={judging}
                            onClick={
                                runJudgement
                            }
                        >

                            {
                                judging
                                    ? (
                                        <LoaderCircle
                                            size={18}
                                            className="spin"
                                        />
                                    )
                                    : (
                                        <Flame
                                            size={18}
                                        />
                                    )
                            }

                            {
                                judging
                                    ? "JUDGEMENT IN PROGRESS"
                                    : "RUN JUDGEMENT DAY"
                            }

                            {
                                !judging
                                && (
                                    <ArrowRight
                                        size={17}
                                    />
                                )
                            }

                        </button>

                        <span>
                            Latest 10 games
                        </span>

                    </div>

                    {
                        judgementComplete
                        && (
                            <div className="judgement-success">

                                <CheckCircle2
                                    size={15}
                                />

                                Verdict refreshed.
                                Your latest evidence is now loaded.

                            </div>
                        )
                    }

                </div>


                <div className="judgement-side">

                    <p>
                        YOUR CURRENT VERDICT
                    </p>

                    {
                        biggestLeak
                            ? (
                                <>
                                    <span className="verdict-index">
                                        #1 PRIORITY
                                    </span>

                                    <strong>
                                        {
                                            biggestLeak.title
                                        }
                                    </strong>

                                    <p className="verdict-action">
                                        {
                                            biggestLeak.action
                                        }
                                    </p>

                                    <div className="verdict-score">

                                        <span>
                                            PRIORITY SCORE
                                        </span>

                                        <b>
                                            {
                                                getPriorityScore(
                                                    biggestLeak,
                                                ).toFixed(
                                                    2,
                                                )
                                            }

                                            <small>
                                                /10
                                            </small>
                                        </b>

                                    </div>
                                </>
                            )
                            : (
                                <p className="empty-copy">
                                    No recurring priority detected.
                                </p>
                            )
                    }

                </div>

            </section>


            {
                error
                && (
                    <div className="dashboard-error">

                        <AlertTriangle
                            size={18}
                        />

                        {error}

                    </div>
                )
            }


            {
                coaching
                && (
                    <>

                        {/* ==================================================
                            QUICK NUMBERS
                        ================================================== */}

                        <section className="dashboard-stat-strip">

                            <DashboardStat
                                label="GAMES ANALYSED"
                                value={
                                    String(
                                        coaching.matches_analyzed
                                        ?? 0,
                                    )
                                }
                                detail="Current coaching sample"
                                icon={Activity}
                            />

                            <DashboardStat
                                label="TOP PRIORITY"
                                value={
                                    biggestLeak
                                        ? getPriorityScore(
                                            biggestLeak,
                                        ).toFixed(
                                            2,
                                        )
                                        : "—"
                                }
                                detail={
                                    biggestLeak
                                        ? priorityLevelText(
                                            getPriorityLevel(
                                                biggestLeak,
                                            ),
                                        )
                                        : "No major issue"
                                }
                                icon={Flame}
                            />

                            <DashboardStat
                                label="PRIORITY EVIDENCE"
                                value={
                                    String(
                                        totalPriorityEvidence,
                                    )
                                }
                                detail="Observations behind top issues"
                                icon={BarChart3}
                            />

                            <DashboardStat
                                label="ANALYSIS"
                                value={
                                    data?.analysis_version
                                    ?? "—"
                                }
                                detail="DiffTheory engine version"
                                icon={Zap}
                            />

                        </section>

                        <section className="dashboard-jump-nav">

                            <div className="jump-nav-heading">

                                <div>

                                    <p>
                                        EXPLORE YOUR PROFILE
                                    </p>

                                    <h2>
                                        Jump straight to what matters
                                    </h2>

                                </div>

                                <span>
                                    Latest {
                                        coaching.matches_analyzed
                                    } analysed games
                                </span>

                            </div>


                            <div className="jump-nav-grid">

                                <button
                                    type="button"
                                    className="jump-nav-card jump-nav-problems"
                                    onClick={
                                        () =>
                                            scrollToSection(
                                                problemsRef,
                                            )
                                    }
                                >

                                    <div className="jump-nav-icon">

                                        <ShieldAlert
                                            size={20}
                                        />

                                    </div>

                                    <div>

                                        <span>
                                            BIGGEST PROBLEMS
                                        </span>

                                        <strong>
                                            {
                                                priorities.length
                                            }
                                            {" "}
                                            top priorities
                                        </strong>

                                        <p>
                                            See the recurring problems
                                            costing you the most.
                                        </p>

                                    </div>

                                    <ArrowRight
                                        size={17}
                                    />

                                </button>


                                <button
                                    type="button"
                                    className="jump-nav-card jump-nav-strengths"
                                    onClick={
                                        () =>
                                            scrollToSection(
                                                strengthsRef,
                                            )
                                    }
                                >

                                    <div className="jump-nav-icon">

                                        <Sparkles
                                            size={20}
                                        />

                                    </div>

                                    <div>

                                        <span>
                                            STRENGTHS
                                        </span>

                                        <strong>
                                            {
                                                strengths.length
                                            }
                                            {" "}
                                            reliable strengths
                                        </strong>

                                        <p>
                                            See where your gameplay is
                                            consistently working.
                                        </p>

                                    </div>

                                    <ArrowRight
                                        size={17}
                                    />

                                </button>


                                <button
                                    type="button"
                                    className="jump-nav-card jump-nav-categories"
                                    onClick={
                                        () =>
                                            scrollToSection(
                                                categoriesRef,
                                            )
                                    }
                                >

                                    <div className="jump-nav-icon">

                                        <BarChart3
                                            size={20}
                                        />

                                    </div>

                                    <div>

                                        <span>
                                            CATEGORY SCORES
                                        </span>

                                        <strong>
                                            {
                                                Object.keys(
                                                    categories,
                                                ).length
                                            }
                                            {" "}
                                            scored areas
                                        </strong>

                                        <p>
                                            See which parts of your
                                            gameplay carry the most pressure.
                                        </p>

                                    </div>

                                    <ArrowRight
                                        size={17}
                                    />

                                </button>


                                <button
                                    type="button"
                                    className="jump-nav-card jump-nav-matches"
                                    onClick={
                                        () =>
                                            scrollToSection(
                                                matchesRef,
                                            )
                                    }
                                >

                                    <div className="jump-nav-icon">

                                        <Swords
                                            size={20}
                                        />

                                    </div>

                                    <div>

                                        <span>
                                            LAST 10 MATCHES
                                        </span>

                                        <strong>
                                            {
                                                matches.length
                                            }
                                            {" "}
                                            recent games
                                        </strong>

                                        <p>
                                            Open the exact match you
                                            want to analyse in depth.
                                        </p>

                                    </div>

                                    <ArrowRight
                                        size={17}
                                    />

                                </button>

                            </div>

                        </section>


                        {/* ==================================================
                            RANK READINESS
                        ================================================== */}

                        <RankReadinessPanel
                            readiness={
                                readiness
                            }
                            displayedRank={
                                rank
                            }
                        />


                        {/* ==================================================
                            RANK METRICS
                        ================================================== */}

                        {
                            rankMetrics
                            && (
                                <RankMetricsPanel
                                    data={
                                        rankMetrics
                                    }
                                    currentRank={
                                        rank
                                    }
                                />
                            )
                        }


                        {/* ==================================================
                            AT A GLANCE
                        ================================================== */}

                        <div className="section-heading">

                            <div>

                                <p>
                                    YOUR JUDGEMENT
                                </p>

                                <h2>
                                    What matters right now
                                </h2>

                            </div>

                            <span>
                                Evidence from {
                                    coaching.matches_analyzed
                                } recent games
                            </span>

                        </div>


                        <section className="judgement-summary-grid">

                            <SummaryInsight
                                eyebrow="BIGGEST LEAK"
                                title={
                                    biggestLeak?.title
                                    ?? "No major leak detected"
                                }
                                body={
                                    biggestLeak?.description
                                    ?? "No recurring negative pattern is currently strong enough to lead the profile."
                                }
                                metric={
                                    biggestLeak
                                        ? `${getMatchesAffected(
                                            biggestLeak,
                                        )}/${coaching.matches_analyzed} games`
                                        : "—"
                                }
                                icon={TrendingDown}
                                tone="negative"
                            />

                            <SummaryInsight
                                eyebrow="BEST WEAPON"
                                title={
                                    bestWeapon?.title
                                    ?? "Still collecting evidence"
                                }
                                body={
                                    bestWeapon
                                        ? `Reliable positive evidence appears in ${safeNumber(
                                            bestWeapon.matches_supported,
                                        )}/${safeNumber(
                                            bestWeapon.matches_analyzed,
                                            coaching.matches_analyzed,
                                        )} analysed games.`
                                        : "DiffTheory has not found another reliable recurring strength yet."
                                }
                                metric={
                                    bestWeapon
                                        ? `${safeNumber(
                                            bestWeapon.strength_score
                                            ?? bestWeapon.score,
                                        ).toFixed(2)} strength score`
                                        : "No reliable strength"
                                }
                                icon={Trophy}
                                tone="positive"
                            />

                            <SummaryInsight
                                eyebrow="INCONSISTENCY"
                                title={
                                    biggestMixedPattern?.title
                                    ?? "No major mixed pattern"
                                }
                                body={
                                    biggestMixedPattern?.interpretation
                                    ?? (
                                        biggestMixedPattern
                                            ? "You show both positive and negative evidence in this area."
                                            : "No strongly contradictory recurring pattern is currently detected."
                                    )
                                }
                                metric={
                                    biggestMixedPattern
                                        ? `${biggestMixedPattern.positive_matches} good / ${biggestMixedPattern.negative_matches} poor`
                                        : "Stable evidence"
                                }
                                icon={Activity}
                                tone="mixed"
                            />

                        </section>


                        <section
                            ref={
                                problemsRef
                            }
                            className="dashboard-scroll-section"
                        >


                        {/* ==================================================
                            PRIORITY EXPLANATION
                        ================================================== */}

                        <section className="score-explainer">

                            <div className="score-explainer-icon">

                                <CircleHelp
                                    size={22}
                                />

                            </div>

                            <div>

                                <strong>
                                    What is a Priority Score?
                                </strong>

                                <p>
                                    It is an urgency score, not your skill rating.
                                    A higher number means DiffTheory sees this
                                    weakness more frequently, more intensely,
                                    more recently, or through several independent
                                    evidence types.
                                </p>

                            </div>

                            <div className="score-explainer-scale">

                                <span>
                                    0
                                </span>

                                <div>
                                    <i />
                                    <i />
                                    <i />
                                    <i />
                                </div>

                                <span>
                                    10
                                </span>

                                <small>
                                    LOW ATTENTION
                                </small>

                                <small>
                                    FIX THIS FIRST
                                </small>

                            </div>

                        </section>
                    </section>

                        {/* ==================================================
                            TOP PRIORITIES
                        ================================================== */}

                        <div className="section-heading priority-heading">

                            <div>

                                <p>
                                    TOP PRIORITIES
                                </p>

                                <h2>
                                    The problems costing you most
                                </h2>

                            </div>

                            <button
                                className="text-button"
                                onClick={
                                    () =>
                                        navigate(
                                            "/analysis",
                                        )
                                }
                            >
                                Full analysis
                                <ArrowRight
                                    size={15}
                                />
                            </button>

                        </div>


                        <section className="priority-grid">

                            {
                                priorities.map(
                                    (
                                        priority,
                                        index,
                                    ) => (
                                        <PriorityCard
                                            key={
                                                priority.key
                                                ?? priority.title
                                                ?? index
                                            }
                                            priority={
                                                priority
                                            }
                                            index={
                                                index
                                            }
                                            matchesAnalyzed={
                                                coaching.matches_analyzed
                                            }
                                        />
                                    ),
                                )
                            }

                        </section>


                        {
                            allPriorities.length
                            > priorities.length
                            && (
                                <section className="remaining-priorities">

                                    <div>

                                        <span>
                                            MORE SIGNALS FOUND
                                        </span>

                                        <strong>
                                            {
                                                allPriorities.length
                                                - priorities.length
                                            }
                                            {" "}
                                            additional priorities
                                        </strong>

                                        <p>
                                            The dashboard keeps your three
                                            highest-priority problems in focus.
                                            Your full analysis preserves every
                                            qualifying pattern.
                                        </p>

                                    </div>

                                    <button
                                        onClick={
                                            () =>
                                                navigate(
                                                    "/analysis",
                                                )
                                        }
                                    >
                                        VIEW ALL
                                        <ArrowRight
                                            size={15}
                                        />
                                    </button>

                                </section>
                            )
                        }


                        <section
                            ref={
                                strengthsRef
                            }
                            className="dashboard-scroll-section"
                        >

                        {/* ==================================================
                            POSITIVE / MIXED
                        ================================================== */}

                        <div className="two-column-data">

                            <section className="data-panel strengths-panel">

                                <div className="panel-heading">

                                    <div>

                                        <p>
                                            WHAT YOU DO WELL
                                        </p>

                                        <h3>
                                            Reliable strengths
                                        </h3>

                                    </div>

                                    <Sparkles
                                        size={21}
                                    />

                                </div>

                                {
                                    strengths.length
                                    === 0
                                        ? (
                                            <p className="empty-copy">
                                                No reliable recurring strengths
                                                are strong enough to surface yet.
                                            </p>
                                        )
                                        : (
                                            <div className="strength-list">

                                                {
                                                    strengths.map(
                                                        (
                                                            strength,
                                                            index,
                                                        ) => (
                                                            <StrengthRow
                                                                key={
                                                                    strength.key
                                                                    ?? strength.title
                                                                    ?? index
                                                                }
                                                                strength={
                                                                    strength
                                                                }
                                                            />
                                                        ),
                                                    )
                                                }

                                            </div>
                                        )
                                }

                            </section>


                            <section className="data-panel mixed-panel">

                                <div className="panel-heading">

                                    <div>

                                        <p>
                                            INCONSISTENT PATTERNS
                                        </p>

                                        <h3>
                                            You can do it — just not reliably
                                        </h3>

                                    </div>

                                    <Activity
                                        size={21}
                                    />

                                </div>

                                {
                                    mixedPatterns.length
                                    === 0
                                        ? (
                                            <p className="empty-copy">
                                                No major inconsistent patterns
                                                detected.
                                            </p>
                                        )
                                        : (
                                            <div className="mixed-list">

                                                {
                                                    mixedPatterns.map(
                                                        (
                                                            pattern,
                                                        ) => (
                                                            <MixedPatternRow
                                                                key={
                                                                    pattern.key
                                                                }
                                                                pattern={
                                                                    pattern
                                                                }
                                                            />
                                                        ),
                                                    )
                                                }

                                            </div>
                                        )
                                }

                            </section>

                        </div>
                        </section>

                        <section
                            ref={
                                strengthsRef
                            }
                            className="dashboard-scroll-section"
                        >

                        {/* ==================================================
                            CATEGORY PRESSURE
                        ================================================== */}

                        <div className="section-heading">

                            <div>

                                <p>
                                    CATEGORY PRESSURE
                                </p>

                                <h2>
                                    Where your weaknesses cluster
                                </h2>

                            </div>

                        </div>


                        <section className="category-grid">

                            {
                                Object.entries(
                                    categories,
                                ).map(
                                    (
                                        [
                                            category,
                                            item,
                                        ],
                                    ) => (
                                        <CategoryCard
                                            key={
                                                category
                                            }
                                            category={
                                                category
                                            }
                                            item={
                                                item
                                            }
                                        />
                                    ),
                                )
                            }

                        </section>
                        </section>


                        
                        <section
                            ref={
                                matchesRef
                            }
                            className="dashboard-scroll-section"
                        >
                        {/* ==================================================
                            RECENT MATCHES
                        ================================================== */}

                        <div className="section-heading matches-heading">

                            <div>

                                <p>
                                    MATCH-BY-MATCH
                                </p>

                                <h2>
                                    Your last 10 games
                                </h2>

                                <span className="section-description">
                                    Pick a match to see the critical moments,
                                    mistakes, positive plays, economic disruptions
                                    and recommendations from that exact game.
                                </span>

                            </div>

                            <button
                                className="text-button"
                                onClick={
                                    () =>
                                        navigate(
                                            "/matches",
                                        )
                                }
                            >
                                Match history
                                <ArrowRight
                                    size={15}
                                />
                            </button>

                        </div>


                        <section className="matches-panel">

                            {
                                matches.length
                                === 0
                                    ? (
                                        <p className="empty-copy match-empty">
                                            No recent ranked matches available.
                                        </p>
                                    )
                                    : (
                                        <div className="matches-list">

                                            {
                                                matches
                                                .slice(
                                                    0,
                                                    10,
                                                )
                                                .map(
                                                    (
                                                        match,
                                                        index,
                                                    ) => (
                                                        <MatchRow
                                                            key={
                                                                match.match_id
                                                            }
                                                            match={
                                                                match
                                                            }
                                                            index={
                                                                index
                                                            }
                                                            onOpen={
                                                                () =>
                                                                    navigate(
                                                                        `/analysis/${encodeURIComponent(
                                                                            match.match_id,
                                                                        )}`,
                                                                    )
                                                            }
                                                        />
                                                    ),
                                                )
                                            }

                                        </div>
                                    )
                            }

                        </section>
                        </section>


                        {/* ==================================================
                            ROLE BREAKDOWN
                        ================================================== */}

                        <div className="section-heading">

                            <div>

                                <p>
                                    ROLE ANALYSIS
                                </p>

                                <h2>
                                    Your profile changes by role
                                </h2>

                            </div>

                            <button
                                className="text-button"
                                onClick={
                                    () =>
                                        navigate(
                                            "/roles",
                                        )
                                }
                            >
                                Role analysis
                                <ArrowRight
                                    size={15}
                                />
                            </button>

                        </div>


                        <section className="role-grid">

                            {
                                Object.entries(
                                    roles,
                                ).map(
                                    (
                                        [
                                            role,
                                            roleData,
                                        ],
                                    ) => (
                                        <RoleCard
                                            key={
                                                role
                                            }
                                            role={
                                                role
                                            }
                                            data={
                                                roleData
                                            }
                                        />
                                    ),
                                )
                            }

                        </section>


                        {/* ==================================================
                            SCORE LEGEND
                        ================================================== */}

                        <section className="methodology-note">

                            <Gauge
                                size={18}
                            />

                            <div>

                                <strong>
                                    Two different scores. Two different meanings.
                                </strong>

                                <p>
                                    <b>
                                        Priority Score:
                                    </b>
                                    {" "}
                                    higher means a problem is more urgent to fix.
                                    {" "}
                                    <b>
                                        Rank Readiness:
                                    </b>
                                    {" "}
                                    higher means your recent rank-comparative
                                    gameplay more strongly supports progression.
                                    They are not interchangeable.
                                </p>

                            </div>

                        </section>

                    </>
                )
            }

        </div>
    );
}


/* ==========================================================
   RANK READINESS
========================================================== */

function RankReadinessPanel({
    readiness,
    displayedRank,
}: {
    readiness?: RankReadiness;
    displayedRank: string;
}) {
    const hasScore =
        readiness?.score !== null
        && readiness?.score !== undefined
        && readiness?.classification
        !== "INSUFFICIENT_DATA";

    if (
        !readiness
        || !hasScore
    ) {
        return (
            <section className="readiness-card readiness-unavailable">

                <div className="readiness-heading">

                    <div className="readiness-icon">
                        <Gauge
                            size={24}
                        />
                    </div>

                    <div>

                        <p>
                            RANK READINESS
                        </p>

                        <h2>
                            Not enough rank data yet
                        </h2>

                    </div>

                </div>


                <div className="readiness-unavailable-body">

                    <div>

                        <span>
                            CURRENT RANK
                        </span>

                        <strong>
                            {displayedRank}
                        </strong>

                    </div>

                    <div className="readiness-lock-copy">

                        <strong>
                            Readiness score unavailable
                        </strong>

                        <p>
                            {
                                readiness?.summary
                                ?? (
                                    "DiffTheory needs a ranked tier and "
                                    + "rank-comparative evidence before it "
                                    + "can judge whether your gameplay "
                                    + "supports climbing."
                                )
                            }
                        </p>

                    </div>

                </div>


                <div className="readiness-footnote">

                    <CircleHelp
                        size={14}
                    />

                    A neutral 5/10 is not shown when there is
                    insufficient evidence. DiffTheory would rather
                    show no score than invent one.

                </div>

            </section>
        );
    }


    const score =
        clamp(
            safeNumber(
                readiness.score,
            ),
            0,
            10,
        );

    const position =
        `${score * 10}%`;

    return (
        <section className="readiness-card">

            <div className="readiness-main">

                <div>

                    <p className="readiness-kicker">
                        RANK READINESS
                    </p>

                    <div className="readiness-rank-line">

                        <span>
                            {
                                humanize(
                                    readiness.current_rank,
                                )
                            }
                        </span>

                        <ArrowRight
                            size={16}
                        />

                        <strong>
                            {
                                readiness.next_rank
                                    ? humanize(
                                        readiness.next_rank,
                                    )
                                    : "Next level"
                            }
                        </strong>

                    </div>

                    <h2>
                        {
                            readiness.summary
                        }
                    </h2>

                </div>


                <div className="readiness-score">

                    <span>
                        DIFFTHEORY RATING
                    </span>

                    <strong>
                        {
                            score.toFixed(
                                1,
                            )
                        }

                        <small>
                            /10
                        </small>
                    </strong>

                    <b>
                        {
                            humanize(
                                readiness.classification,
                            )
                        }
                    </b>

                </div>

            </div>


            <div className="readiness-scale">

                <div className="readiness-track">

                    <div className="readiness-zone zone-low" />
                    <div className="readiness-zone zone-fit" />
                    <div className="readiness-zone zone-up" />

                    <div
                        className="readiness-marker"
                        style={
                            {
                                left:
                                    position,
                            }
                        }
                    >
                        <span>
                            {
                                score.toFixed(
                                    1,
                                )
                            }
                        </span>
                    </div>

                </div>


                <div className="readiness-labels">

                    <div>

                        <strong>
                            0–4.4
                        </strong>

                        <span>
                            Below current-rank profile
                        </span>

                    </div>

                    <div>

                        <strong>
                            4.5–6.4
                        </strong>

                        <span>
                            Gameplay supports current rank
                        </span>

                    </div>

                    <div>

                        <strong>
                            6.5–10
                        </strong>

                        <span>
                            Increasing rank-up evidence
                        </span>

                    </div>

                </div>

            </div>


            <div className="readiness-bottom">

                <div>

                    <span>
                        EVIDENCE
                    </span>

                    <strong>
                        {
                            readiness.evidence_count
                        }
                        {" "}
                        rank signals
                    </strong>

                </div>

                <div>

                    <span>
                        CONFIDENCE
                    </span>

                    <strong>
                        {
                            readiness.confidence
                        }
                    </strong>

                </div>

                <div>

                    <span>
                        POSITIVE / NEGATIVE
                    </span>

                    <strong>
                        {
                            readiness.positive_signal_count
                        }
                        {" "}
                        /
                        {" "}
                        {
                            readiness.negative_signal_count
                        }
                    </strong>

                </div>

            </div>

        </section>
    );
}


/* ==========================================================
   PRIORITY CARD
========================================================== */

function PriorityCard({
    priority,
    index,
    matchesAnalyzed,
}: {
    priority: Priority;
    index: number;
    matchesAnalyzed: number;
}) {
    const icons = [
        ShieldAlert,
        Target,
        Flame,
    ];

    const Icon =
        icons[index]
        ?? Crosshair;

    const score =
        getPriorityScore(
            priority,
        );

    const level =
        getPriorityLevel(
            priority,
        );

    const matchesAffected =
        getMatchesAffected(
            priority,
        );

    const frequency =
        safeNumber(
            priority.frequency,
        );

    const intensity =
        safeNumber(
            priority.average_intensity,
        );

    const evidenceCount =
        safeNumber(
            priority.evidence_count,
        );

    const signalTypes =
        priority.signal_types
        ?? priority.evidence_types
        ?? [];

    const trend =
        getTrendLabel(
            priority,
        );

    return (
        <article className="priority-card">

            <div className="priority-card-head">

                <span className="priority-number">
                    0{index + 1}
                </span>

                <div className="priority-icon">
                    <Icon
                        size={20}
                    />
                </div>

                <span
                    className={
                        `priority-severity priority-${level.toLowerCase()}`
                    }
                >
                    {
                        priorityLevelText(
                            level,
                        )
                    }
                </span>

            </div>


            <h3>
                {
                    priority.title
                    ?? humanize(
                        priority.key,
                    )
                }
            </h3>

            <p className="priority-description">
                {
                    priority.description
                    ?? "Recurring gameplay issue detected."
                }
            </p>


            <div className="priority-score-section">

                <span>
                    PRIORITY SCORE
                </span>

                <strong>
                    {
                        score.toFixed(
                            2,
                        )
                    }

                    <small>
                        /10
                    </small>
                </strong>

                <p>
                    Higher = more urgent to fix.
                    This is not your overall skill rating.
                </p>

            </div>


            <div className="priority-data-grid">

                <div>

                    <span>
                        AFFECTED
                    </span>

                    <strong>
                        {matchesAffected}
                        /
                        {matchesAnalyzed}
                    </strong>

                    <small>
                        games
                    </small>

                </div>

                <div>

                    <span>
                        FREQUENCY
                    </span>

                    <strong>
                        {
                            formatPercent(
                                frequency,
                            )
                        }
                    </strong>

                    <small>
                        recent sample
                    </small>

                </div>

                <div>

                    <span>
                        INTENSITY
                    </span>

                    <strong>
                        {
                            formatPercent(
                                intensity,
                            )
                        }
                    </strong>

                    <small>
                        average
                    </small>

                </div>

                <div>

                    <span>
                        TREND
                    </span>

                    <strong
                        className={
                            `trend-${trend.toLowerCase()}`
                        }
                    >
                        {
                            humanize(
                                trend,
                            )
                        }
                    </strong>

                    <small>
                        recent vs older
                    </small>

                </div>

            </div>


            <div className="priority-evidence">

                <div>

                    <span>
                        EVIDENCE
                    </span>

                    <strong>
                        {evidenceCount}
                        {" "}
                        observations
                    </strong>

                </div>

                <div className="signal-chips">

                    {
                        signalTypes
                        .slice(
                            0,
                            3,
                        )
                        .map(
                            (
                                signal,
                            ) => (
                                <span
                                    key={
                                        signal
                                    }
                                >
                                    {
                                        humanize(
                                            signal,
                                        )
                                    }
                                </span>
                            ),
                        )
                    }

                    {
                        signalTypes.length
                        > 3
                        && (
                            <span>
                                +
                                {
                                    signalTypes.length
                                    - 3
                                }
                            </span>
                        )
                    }

                </div>

            </div>


            <div className="priority-action-box">

                <span>
                    DO THIS NEXT
                </span>

                <p>
                    {
                        priority.action
                        ?? (
                            "Focus on reducing this pattern "
                            + "in your next games."
                        )
                    }
                </p>

            </div>

        </article>
    );
}


/* ==========================================================
   SUMMARY INSIGHT
========================================================== */

function SummaryInsight({
    eyebrow,
    title,
    body,
    metric,
    icon: Icon,
    tone,
}: {
    eyebrow: string;
    title: string;
    body: string;
    metric: string;
    icon: typeof Target;
    tone:
        | "negative"
        | "positive"
        | "mixed";
}) {
    return (
        <article
            className={
                `summary-insight summary-${tone}`
            }
        >

            <div className="summary-icon">
                <Icon
                    size={20}
                />
            </div>

            <span>
                {eyebrow}
            </span>

            <h3>
                {title}
            </h3>

            <p>
                {body}
            </p>

            <strong>
                {metric}
            </strong>

        </article>
    );
}


/* ==========================================================
   DASHBOARD STAT
========================================================== */

function DashboardStat({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: string;
    detail: string;
    icon: typeof Activity;
}) {
    return (
        <div className="dashboard-stat">

            <div>
                <Icon
                    size={17}
                />
            </div>

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

            <small>
                {detail}
            </small>

        </div>
    );
}


/* ==========================================================
   STRENGTH
========================================================== */

function StrengthRow({
    strength,
}: {
    strength: Strength;
}) {
    const score =
        safeNumber(
            strength.strength_score
            ?? strength.score,
        );

    const supported =
        safeNumber(
            strength.matches_supported,
        );

    const analysed =
        safeNumber(
            strength.matches_analyzed,
        );

    return (
        <div className="strength-row">

            <div className="strength-icon">

                <Sparkles
                    size={16}
                />

            </div>

            <div className="strength-copy">

                <strong>
                    {
                        strength.title
                    }
                </strong>

                <p>
                    Positive evidence in
                    {" "}
                    {supported}/{analysed}
                    {" "}
                    recent games
                </p>

                <div className="strength-progress">

                    <i
                        style={
                            {
                                width:
                                    `${clamp(
                                        safeNumber(
                                            strength.frequency,
                                        )
                                        * 100,
                                        0,
                                        100,
                                    )}%`,
                            }
                        }
                    />

                </div>

            </div>

            <div className="strength-score">

                <span>
                    STRENGTH
                </span>

                <strong>
                    {
                        score.toFixed(
                            2,
                        )
                    }

                    <small>
                        /10
                    </small>
                </strong>

            </div>

        </div>
    );
}


/* ==========================================================
   MIXED PATTERN
========================================================== */

function MixedPatternRow({
    pattern,
}: {
    pattern: MixedPattern;
}) {
    return (
        <div className="mixed-row">

            <div className="mixed-top">

                <div>

                    <span>
                        {
                            pattern.classification
                        }
                    </span>

                    <strong>
                        {
                            pattern.title
                        }
                    </strong>

                </div>

                <Activity
                    size={17}
                />

            </div>


            <p>
                {
                    pattern.interpretation
                    ?? (
                        "Strong positive and negative evidence "
                        + "both appear in your recent games."
                    )
                }
            </p>


            <div className="mixed-score-grid">

                <div>

                    <span>
                        POSITIVE
                    </span>

                    <strong>
                        {
                            safeNumber(
                                pattern.positive_score,
                            ).toFixed(
                                2,
                            )
                        }
                    </strong>

                    <small>
                        {
                            pattern.positive_matches
                        }
                        /
                        {
                            pattern.matches_analyzed
                        }
                        {" "}
                        games
                    </small>

                </div>

                <div>

                    <span>
                        NEGATIVE
                    </span>

                    <strong>
                        {
                            safeNumber(
                                pattern.negative_score,
                            ).toFixed(
                                2,
                            )
                        }
                    </strong>

                    <small>
                        {
                            pattern.negative_matches
                        }
                        /
                        {
                            pattern.matches_analyzed
                        }
                        {" "}
                        games
                    </small>

                </div>

            </div>

        </div>
    );
}


/* ==========================================================
   CATEGORY
========================================================== */

function CategoryCard({
    category,
    item,
}: {
    category: string;
    item: CategorySummaryItem;
}) {
    const score =
        clamp(
            safeNumber(
                item.highest_score,
            ),
            0,
            10,
        );

    return (
        <article className="category-card">

            <div>

                <span>
                    {
                        humanize(
                            category,
                        )
                    }
                </span>

                <strong>
                    {
                        score.toFixed(
                            2,
                        )
                    }
                </strong>

            </div>

            <div className="category-bar">

                <i
                    style={
                        {
                            width:
                                `${score * 10}%`,
                        }
                    }
                />

            </div>

            <p>
                {
                    item.priority_count
                }
                {" "}
                {
                    item.priority_count
                    === 1
                        ? "qualifying priority"
                        : "qualifying priorities"
                }
            </p>

        </article>
    );
}


/* ==========================================================
   MATCH ROW
========================================================== */

function MatchRow({
    match,
    index,
    onOpen,
}: {
    match: DashboardMatch;
    index: number;
    onOpen: () => void;
}) {
    const result =
        match.win
            ? "VICTORY"
            : "DEFEAT";

    return (
        <button
            type="button"
            className={
                `match-row ${
                    match.win
                        ? "match-win"
                        : "match-loss"
                }`
            }
            onClick={
                onOpen
            }
        >

            <div className="match-index">
                {
                    String(
                        index + 1,
                    ).padStart(
                        2,
                        "0",
                    )
                }
            </div>


            <div className="champion-avatar">

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


            <div className="match-champion">

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


            <div className="match-result">

                <strong>
                    {result}
                </strong>

                <span>
                    {
                        formatDate(
                            match.game_creation,
                        )
                    }
                </span>

            </div>


            <div className="match-kda">

                <strong>
                    {match.kills}
                    {" / "}
                    {match.deaths}
                    {" / "}
                    {match.assists}
                </strong>

                <span>
                    {
                        getKda(
                            match,
                        )
                    }
                    {" "}
                    KDA
                </span>

            </div>


            <div className="match-duration">

                <Clock3
                    size={14}
                />

                {
                    formatDuration(
                        match.game_duration,
                    )
                }

            </div>


            <div className="match-analysis-state">

                {
                    match.analysis_cached
                        ? (
                            <>
                                <CheckCircle2
                                    size={14}
                                />

                                ANALYSED
                            </>
                        )
                        : (
                            <>
                                <Clock3
                                    size={14}
                                />

                                PENDING
                            </>
                        )
                }

            </div>


            <div className="match-open">

                <span>
                    OPEN ANALYSIS
                </span>

                <ChevronRight
                    size={18}
                />

            </div>

        </button>
    );
}


/* ==========================================================
   ROLE
========================================================== */

function RoleCard({
    role,
    data,
}: {
    role: string;
    data: RoleBreakdownItem;
}) {
    const record =
        data.record;

    const priority =
        data.top_priorities?.[0];

    return (
        <article className="role-card">

            <div className="role-heading">

                <div className="role-icon">

                    <Swords
                        size={19}
                    />

                </div>

                <div>

                    <span>
                        ROLE
                    </span>

                    <strong>
                        {
                            humanize(
                                role,
                            )
                        }
                    </strong>

                </div>

            </div>


            <div className="role-stats">

                <div>

                    <span>
                        GAMES
                    </span>

                    <strong>
                        {
                            data.matches_analyzed
                        }
                    </strong>

                </div>

                <div>

                    <span>
                        RECORD
                    </span>

                    <strong>
                        {
                            record?.wins
                            ?? 0
                        }W
                        {" "}
                        {
                            record?.losses
                            ?? 0
                        }L
                    </strong>

                </div>

                <div>

                    <span>
                        WIN RATE
                    </span>

                    <strong>
                        {
                            Math.round(
                                (
                                    record?.win_rate
                                    ?? 0
                                )
                                * 100,
                            )
                        }%
                    </strong>

                </div>

            </div>


            {
                priority
                && (
                    <div className="role-priority">

                        <span>
                            MAIN ISSUE
                        </span>

                        <strong>
                            {
                                priority.title
                            }
                        </strong>

                        <small>
                            {
                                getPriorityScore(
                                    priority,
                                ).toFixed(
                                    2,
                                )
                            }
                            /10 priority
                        </small>

                    </div>
                )
            }

        </article>
    );
}


export default DashboardPage;