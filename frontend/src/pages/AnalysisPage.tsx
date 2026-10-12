import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CircleHelp,
    Clock3,
    Coins,
    Crosshair,
    Gauge,
    LoaderCircle,
    Medal,
    ShieldAlert,
    Skull,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Wheat,
    Zap,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    getMatchAnalysis,
} from "../services/coachingApi";

import type {
    MatchAnalysis,
    MatchAnalysisResponse,
} from "../services/coachingApi";

import "./AnalysisPage.css";


import {
    useAuth,
} from "../auth/AuthContext";





const INITIAL_TIMELINE_COUNT = 5;
const INITIAL_SIGNAL_COUNT = 6;


type UnknownRecord =
    Record<string, unknown>;


interface TimelineMoment {
    kind:
        | "critical"
        | "positive";

    minute: number | null;

    title: string;

    severity: number | null;

    source?: string;

    data: UnknownRecord;
}


/* ==========================================================
   BASIC HELPERS
========================================================== */

function isRecord(
    value: unknown,
): value is UnknownRecord {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(
            value,
        )
    );
}


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


function optionalNumber(
    value: unknown,
): number | null {
    if (
        typeof value === "number"
        && Number.isFinite(
            value,
        )
    ) {
        return value;
    }

    if (
        value === null
        || value === undefined
        || value === ""
    ) {
        return null;
    }

    const parsed =
        Number(
            value,
        );

    return Number.isFinite(
        parsed,
    )
        ? parsed
        : null;
}


function textValue(
    value: unknown,
    fallback = "—",
): string {
    if (
        value === null
        || value === undefined
        || value === ""
    ) {
        return fallback;
    }

    if (
        typeof value === "string"
        || typeof value === "number"
        || typeof value === "boolean"
    ) {
        return String(
            value,
        );
    }

    return fallback;
}


function humanize(
    value: unknown,
): string {
    const text =
        textValue(
            value,
            "",
        );

    if (!text) {
        return "Unknown";
    }

    return text
        .replaceAll(
            "_",
            " ",
        )
        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2",
        )
        .toLowerCase()
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character.toUpperCase(),
        );
}


function getFirst(
    record: UnknownRecord | null | undefined,
    keys: string[],
): unknown {
    if (!record) {
        return undefined;
    }

    for (
        const key
        of keys
    ) {
        if (
            record[key] !== undefined
            && record[key] !== null
        ) {
            return record[
                key
            ];
        }
    }

    return undefined;
}


function getRecord(
    value: unknown,
): UnknownRecord | null {
    return isRecord(
        value,
    )
        ? value
        : null;
}


function omitKeys(
    record: UnknownRecord | null,
    keys: string[],
): UnknownRecord | null {
    if (
        !record
    ) {
        return null;
    }

    return Object.fromEntries(
        Object.entries(
            record,
        ).filter(
            (
                [
                    key,
                ],
            ) =>
                !keys.includes(
                    key,
                ),
        ),
    );
}


function getRecordArray(
    value: unknown,
): UnknownRecord[] {
    if (
        !Array.isArray(
            value,
        )
    ) {
        return [];
    }

    return value.filter(
        isRecord,
    );
}


function getUnknownArray(
    value: unknown,
): unknown[] {
    return Array.isArray(
        value,
    )
        ? value
        : [];
}


function formatMinute(
    value: unknown,
) {
    const minute =
        optionalNumber(
            value,
        );

    if (
        minute === null
    ) {
        return "Unknown time";
    }

    const whole =
        Math.floor(
            minute,
        );

    const seconds =
        Math.round(
            (
                minute
                - whole
            )
            * 60,
        );

    return `${whole}:${String(
        seconds,
    ).padStart(
        2,
        "0",
    )}`;
}


function formatValue(
    value: unknown,
): string {
    if (
        value === null
        || value === undefined
    ) {
        return "—";
    }

    if (
        typeof value === "boolean"
    ) {
        return value
            ? "Yes"
            : "No";
    }

    if (
        typeof value === "number"
    ) {
        if (
            Number.isInteger(
                value,
            )
        ) {
            return value.toLocaleString();
        }

        return value.toFixed(
            2,
        );
    }

    if (
        typeof value === "string"
    ) {
        return humanize(
            value,
        );
    }

    if (
        Array.isArray(
            value,
        )
    ) {
        if (
            value.every(
                (
                    item,
                ) =>
                    typeof item
                    === "string",
            )
        ) {
            return value
                .map(
                    humanize,
                )
                .join(
                    ", ",
                );
        }

        return `${value.length} items`;
    }

    return "Details available";
}


function getMomentTitle(
    moment: UnknownRecord,
    fallback: string,
) {
    return textValue(
        getFirst(
            moment,
            [
                "title",
                "description",
                "label",
                "type",
                "key",
                "event_type",
            ],
        ),
        fallback,
    );
}


function getMomentMinute(
    moment: UnknownRecord,
): number | null {
    return optionalNumber(
        getFirst(
            moment,
            [
                "minute",
                "time_minute",
                "game_minute",
            ],
        ),
    );
}


function getMomentSeverity(
    moment: UnknownRecord,
): number | null {
    return optionalNumber(
        getFirst(
            moment,
            [
                "severity",
                "impact_severity",
                "score",
            ],
        ),
    );
}


/* ==========================================================
   PAGE
========================================================== */

function AnalysisPage() {
    const {
        matchId,
    } =
        useParams<{
            matchId: string;
        }>();

    const navigate =
        useNavigate();

    const {
        riotAccount,
    } = useAuth();

    const riotAccountId =
        riotAccount?.id;

    const [
        response,
        setResponse,
    ] = useState<
        MatchAnalysisResponse | null
    >(
        null,
    );

    const [
        loading,
        setLoading,
    ] = useState(
        Boolean(
            matchId,
        ),
    );

    const [
        error,
        setError,
    ] = useState<
        string | null
    >(
        null,
    );


    useEffect(
        () => {

            if (
                !matchId
            ) {
                setLoading(
                    false,
                );

                return;
            }

            if (
                !riotAccountId
            ) {
                setError(
                    "No Riot account is connected.",
                );

                setLoading(
                    false,
                );

                return;
            }

            const currentMatchId =
                matchId;

            const currentRiotAccountId =
                riotAccountId;

            let active =
                true;


            async function load() {

                try {

                    setLoading(
                        true,
                    );

                    setError(
                        null,
                    );

                    const result =
                        await getMatchAnalysis(
                            currentRiotAccountId,
                            currentMatchId,
                        );

                    if (
                        active
                    ) {
                        setResponse(
                            result,
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
                                : "Unable to load match analysis.",
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


            load();


            return () => {
                active =
                    false;
            };

        },
        [
            matchId,
            riotAccountId,
        ],
    );
    if (
        !matchId
    ) {
        return (
            <div className="match-analysis-empty">

                <div className="analysis-empty-icon">

                    <Crosshair
                        size={30}
                    />

                </div>

                <p className="analysis-eyebrow">
                    MATCH ANALYSIS
                </p>

                <h1>
                    Pick a game to investigate
                </h1>

                <p>
                    Open one of your recent games from the
                    dashboard or match history to see its
                    DiffTheory breakdown.
                </p>

                <button
                    onClick={
                        () =>
                            navigate(
                                "/matches",
                            )
                    }
                >
                    VIEW MATCHES

                    <ChevronRight
                        size={16}
                    />

                </button>

            </div>
        );
    }


    if (
        loading
    ) {
        return (
            <div className="analysis-state">

                <LoaderCircle
                    className="spin"
                    size={30}
                />

                <strong>
                    Reconstructing the game
                </strong>

                <p>
                    Loading DiffTheory's cached analysis for this match.
                </p>

            </div>
        );
    }


    if (
        error
        || !response
    ) {
        return (
            <div className="analysis-state analysis-error-state">

                <AlertTriangle
                    size={30}
                />

                <strong>
                    Analysis unavailable
                </strong>

                <p>
                    {
                        error
                        ?? "This match could not be loaded."
                    }
                </p>

                <button
                    onClick={
                        () =>
                            navigate(
                                "/",
                            )
                    }
                >
                    RETURN TO DASHBOARD
                </button>

            </div>
        );
    }


    return (
        <SingleMatchAnalysis
            response={
                response
            }
            onBack={
                () =>
                    navigate(
                        "/",
                    )
            }
        />
    );
}


/* ==========================================================
   MAIN MATCH ANALYSIS
========================================================== */

function SingleMatchAnalysis({
    response,
    onBack,
}: {
    response: MatchAnalysisResponse;
    onBack: () => void;
}) {
    const analysis =
        response.analysis;

    const [
        showAllTimeline,
        setShowAllTimeline,
    ] = useState(
        false,
    );

    const [
        showAllSignals,
        setShowAllSignals,
    ] = useState(
        false,
    );


    const performance =
        getRecord(
            analysis.performance,
        );

    const rankPerformance =
        getRecord(
            analysis.rank_performance,
        );

    const impactSummary =
        getRecord(
            analysis.impact_summary,
        );

    const deathPatterns =
        getRecord(
            analysis.death_patterns,
        );

    const lossContext =
        getRecord(
            analysis.loss_context,
        );

    const cleanedLossContext =
        omitKeys(
            lossContext,
            [
                "highest_leverage_opportunities",
                "highest_leverage_opportunity",
                "leverage_opportunities",
                "opportunities",
            ],
        );

    const economyEfficiency =
        getRecord(
            analysis.economy_efficiency,
        );

    const economicAnalysis =
        getRecord(
            analysis.economic_disruption_analysis,
        );

    const criticalMoments =
        getRecordArray(
            analysis.critical_moments,
        );

    const positiveMoments =
        getRecordArray(
            analysis.positive_moments,
        );

    const farmingDisruptions =
        getRecordArray(
            analysis.farming_disruptions,
        );

    const economicDisruptions =
        getRecordArray(
            analysis.economic_disruptions,
        );

    const coachingSignals =
        getRecordArray(
            analysis.coaching_signals,
        );


    const timeline =
        useMemo(
            () => {
                const moments:
                    TimelineMoment[] =
                    [];

                for (
                    const moment
                    of criticalMoments
                ) {
                    moments.push({
                        kind:
                            "critical",

                        minute:
                            getMomentMinute(
                                moment,
                            ),

                        title:
                            getMomentTitle(
                                moment,
                                "Critical moment",
                            ),

                        severity:
                            getMomentSeverity(
                                moment,
                            ),

                        source:
                            textValue(
                                moment.source,
                                "",
                            ),

                        data:
                            moment,
                    });
                }

                for (
                    const moment
                    of positiveMoments
                ) {
                    moments.push({
                        kind:
                            "positive",

                        minute:
                            getMomentMinute(
                                moment,
                            ),

                        title:
                            getMomentTitle(
                                moment,
                                "Positive moment",
                            ),

                        severity:
                            getMomentSeverity(
                                moment,
                            ),

                        source:
                            textValue(
                                moment.source,
                                "",
                            ),

                        data:
                            moment,
                    });
                }

                return moments.sort(
                    (
                        a,
                        b,
                    ) =>
                        (
                            a.minute
                            ?? 999
                        )
                        -
                        (
                            b.minute
                            ?? 999
                        ),
                );
            },
            [
                criticalMoments,
                positiveMoments,
            ],
        );


    const visibleTimeline =
        showAllTimeline
            ? timeline
            : timeline.slice(
                0,
                INITIAL_TIMELINE_COUNT,
            );


    const visibleSignals =
        showAllSignals
            ? coachingSignals
            : coachingSignals.slice(
                0,
                INITIAL_SIGNAL_COUNT,
            );


    const kills =
        optionalNumber(
            getFirst(
                performance,
                [
                    "kills",
                    "kill_count",
                ],
            ),
        );

    const deaths =
        optionalNumber(
            getFirst(
                performance,
                [
                    "deaths",
                    "death_count",
                ],
            ),
        );

    const assists =
        optionalNumber(
            getFirst(
                performance,
                [
                    "assists",
                    "assist_count",
                ],
            ),
        );


    const hasKda =
        kills !== null
        || deaths !== null
        || assists !== null;


    const criticalSeverityFive =
        criticalMoments.filter(
            (
                moment,
            ) =>
                safeNumber(
                    getMomentSeverity(
                        moment,
                    ),
                )
                >= 5,
        ).length;


    const leverageOpportunities =
        getFirst(
            lossContext,
            [
                "highest_leverage_opportunities",
                "highest_leverage_opportunity",
                "leverage_opportunities",
                "opportunities",
            ],
        );

    return (
        <div className="match-analysis-page">

            {/* ==================================================
                BACK
            ================================================== */}

            <button
                type="button"
                className="analysis-back"
                onClick={
                    onBack
                }
            >

                <ArrowLeft
                    size={16}
                />

                BACK TO DASHBOARD

            </button>


            {/* ==================================================
                MATCH HERO
            ================================================== */}

            <section
                className={
                    `analysis-hero ${
                        analysis.win
                            ? "analysis-win"
                            : "analysis-loss"
                    }`
                }
            >

                <div className="analysis-hero-grid" />

                <div className="analysis-champion-mark">

                    {
                        (
                            analysis.champion
                            ?? "?"
                        )
                        .charAt(
                            0,
                        )
                        .toUpperCase()
                    }

                </div>


                <div className="analysis-hero-main">

                    <p className="analysis-eyebrow">
                        DIFFTHEORY MATCH ANALYSIS
                    </p>

                    <div className="analysis-result-line">

                        <span
                            className={
                                analysis.win
                                    ? "result-win"
                                    : "result-loss"
                            }
                        >
                            {
                                analysis.win
                                    ? "VICTORY"
                                    : "DEFEAT"
                            }
                        </span>

                        <span>
                            {
                                analysis.match_id
                                ?? response.match_id
                            }
                        </span>

                    </div>

                    <h1>
                        {
                            analysis.champion
                            ?? "Unknown Champion"
                        }

                        <span>
                            {
                                humanize(
                                    analysis.role,
                                )
                            }
                        </span>
                    </h1>

                    <p className="analysis-hero-copy">
                        DiffTheory reconstructs the moments,
                        decisions and patterns that shaped this game.
                    </p>

                </div>


                <div className="analysis-hero-side">

                    {
                        hasKda
                        && (
                            <div className="hero-kda">

                                <span>
                                    K / D / A
                                </span>

                                <strong>
                                    {
                                        kills
                                        ?? 0
                                    }
                                    {" / "}
                                    {
                                        deaths
                                        ?? 0
                                    }
                                    {" / "}
                                    {
                                        assists
                                        ?? 0
                                    }
                                </strong>

                            </div>
                        )
                    }

                    <div>

                        <span>
                            ROLE
                        </span>

                        <strong>
                            {
                                humanize(
                                    analysis.role,
                                )
                            }
                        </strong>

                    </div>

                    <div>

                        <span>
                            RANK CONTEXT
                        </span>

                        <strong>
                            {
                                analysis.rank
                                ?? "UNRANKED"
                            }
                        </strong>

                    </div>

                    <div>

                        <span>
                            ENGINE
                        </span>

                        <strong>
                            {
                                response.analysis_version
                            }
                        </strong>

                    </div>

                </div>

            </section>


            {/* ==================================================
                QUICK NUMBERS
            ================================================== */}

            <section className="analysis-stat-strip">

                <AnalysisStat
                    icon={
                        ShieldAlert
                    }
                    label="CRITICAL MOMENTS"
                    value={
                        String(
                            criticalMoments.length,
                        )
                    }
                    detail={
                        `${criticalSeverityFive} max-severity`
                    }
                    tone="negative"
                />

                <AnalysisStat
                    icon={
                        Sparkles
                    }
                    label="POSITIVE MOMENTS"
                    value={
                        String(
                            positiveMoments.length,
                        )
                    }
                    detail="Useful plays detected"
                    tone="positive"
                />

                <AnalysisStat
                    icon={
                        Brain
                    }
                    label="COACHING SIGNALS"
                    value={
                        String(
                            coachingSignals.length,
                        )
                    }
                    detail="Evidence observations"
                    tone="neutral"
                />

                <AnalysisStat
                    icon={
                        Activity
                    }
                    label="CONTEXT WINDOWS"
                    value={
                        String(
                            safeNumber(
                                analysis.contextual_interval_count,
                            ),
                        )
                    }
                    detail="Game-state intervals analysed"
                    tone="neutral"
                />

            </section>


            {/* ==================================================
                IMPACT SUMMARY
            ================================================== */}

            <SectionHeading
                eyebrow="THE VERDICT"
                title="Impact summary"
                copy={
                    "Start here. This is DiffTheory's highest-level "
                    + "reading of your impact on this game."
                }
            />


            <ImpactSummaryPanel
                impactSummary={
                    impactSummary
                }
            />


            {/* ==================================================
                LOSS CONTEXT
            ================================================== */}

            {
                !analysis.win
                && (
                    <>
                        <SectionHeading
                            eyebrow="LOSS CONTEXT"
                            title="What happened around you"
                            copy={
                                "Separates your individual patterns "
                                + "from the wider state of the game."
                            }
                        />

                        <AnalysisSummaryPanel
                            title="Loss Context"
                            icon={
                                TrendingDown
                            }
                            record={
                                cleanedLossContext
                            }
                            emptyText={
                                "No additional loss-context analysis was produced."
                            }
                            tone="negative"
                        />
                    </>
                )
            }


            {/* ==================================================
                HIGHEST LEVERAGE OPPORTUNITIES
            ================================================== */}

            <SectionHeading
                eyebrow="HIGHEST LEVERAGE"
                title="Where this game could have changed most"
                copy={
                    "These are the situations DiffTheory considers "
                    + "the strongest opportunities for a better outcome."
                }
            />


            <LeverageOpportunityPanel
                value={
                    leverageOpportunities
                }
            />


            {/* ==================================================
                WHAT TO DO NEXT
            ================================================== */}

            <SectionHeading
                eyebrow="NEXT GAME"
                title="What to do next"
                copy={
                    "The practical actions to carry into your next game."
                }
            />


            <RecommendationsPanel
                recommendations={
                    analysis.recommendations
                }
            />


            {/* ==================================================
                TIMELINE
            ================================================== */}

            <SectionHeading
                eyebrow="GAME TIMELINE"
                title="What changed during the game"
                copy={
                    "Critical and positive moments are shown together "
                    + "chronologically. DiffTheory describes what "
                    + "followed each moment rather than claiming "
                    + "a single event caused the result."
                }
            />


            <section className="timeline-panel">

                {
                    timeline.length
                    === 0
                        ? (
                            <EmptyAnalysisState
                                text={
                                    "No critical or positive timeline moments were stored for this match."
                                }
                            />
                        )
                        : (
                            <>
                                <div className="analysis-timeline">

                                    {
                                        visibleTimeline.map(
                                            (
                                                moment,
                                                index,
                                            ) => (
                                                <TimelineRow
                                                    key={
                                                        `${moment.kind}-${moment.minute}-${index}`
                                                    }
                                                    moment={
                                                        moment
                                                    }
                                                    index={
                                                        index
                                                    }
                                                />
                                            ),
                                        )
                                    }

                                </div>


                                {
                                    timeline.length
                                    > INITIAL_TIMELINE_COUNT
                                    && (
                                        <ViewAllButton
                                            expanded={
                                                showAllTimeline
                                            }
                                            onClick={
                                                () =>
                                                    setShowAllTimeline(
                                                        (
                                                            current,
                                                        ) =>
                                                            !current,
                                                    )
                                            }
                                            collapsedLabel={
                                                `VIEW ALL ${timeline.length} MOMENTS`
                                            }
                                            expandedLabel={
                                                "SHOW FEWER MOMENTS"
                                            }
                                        />
                                    )
                                }

                            </>
                        )
                }

            </section>


            {/* ==================================================
                COACHING SIGNALS
            ================================================== */}

            <SectionHeading
                eyebrow="EVIDENCE"
                title="Coaching signals"
                copy={
                    "The individual evidence observations feeding "
                    + "DiffTheory's higher-level coaching judgement."
                }
            />


            <section className="signal-section">

                <div className="signal-analysis-grid">

                    {
                        coachingSignals.length
                        === 0
                            ? (
                                <EmptyAnalysisState
                                    text={
                                        "No coaching signals were stored for this match."
                                    }
                                />
                            )
                            : visibleSignals.map(
                                (
                                    signal,
                                    index,
                                ) => (
                                    <CoachingSignalCard
                                        key={
                                            `${textValue(
                                                signal.key,
                                                "signal",
                                            )}-${index}`
                                        }
                                        signal={
                                            signal
                                        }
                                    />
                                ),
                            )
                    }

                </div>


                {
                    coachingSignals.length
                    > INITIAL_SIGNAL_COUNT
                    && (
                        <ViewAllButton
                            expanded={
                                showAllSignals
                            }
                            onClick={
                                () =>
                                    setShowAllSignals(
                                        (
                                            current,
                                        ) =>
                                            !current,
                                    )
                            }
                            collapsedLabel={
                                `VIEW ALL ${coachingSignals.length} SIGNALS`
                            }
                            expandedLabel={
                                "SHOW FEWER SIGNALS"
                            }
                        />
                    )
                }

            </section>


            {/* ==================================================
                RESOURCE GAME
            ================================================== */}

            <SectionHeading
                eyebrow="RESOURCE GAME"
                title="Farm and economy"
                copy={
                    "Where resource collection was disrupted and "
                    + "what happened to your economic position."
                }
            />


            <section className="resource-grid">

                <DisruptionPanel
                    icon={
                        Wheat
                    }
                    eyebrow="FARMING"
                    title="Farming disruptions"
                    items={
                        farmingDisruptions
                    }
                    emptyText={
                        "No farming disruptions were detected."
                    }
                />

                <DisruptionPanel
                    icon={
                        Coins
                    }
                    eyebrow="ECONOMY"
                    title="Economic disruptions"
                    items={
                        economicDisruptions
                    }
                    emptyText={
                        "No economic disruptions were detected."
                    }
                />

            </section>


            {
                (
                    economyEfficiency
                    || economicAnalysis
                )
                && (
                    <section className="resource-detail-grid">

                        {
                            economyEfficiency
                            && (
                                <AnalysisSummaryPanel
                                    title="Economy Efficiency"
                                    icon={
                                        Coins
                                    }
                                    record={
                                        economyEfficiency
                                    }
                                    emptyText=""
                                    tone="neutral"
                                />
                            )
                        }

                        {
                            economicAnalysis
                            && (
                                <AnalysisSummaryPanel
                                    title="Economic Disruption Analysis"
                                    icon={
                                        BarChart3
                                    }
                                    record={
                                        economicAnalysis
                                    }
                                    emptyText=""
                                    tone="neutral"
                                />
                            )
                        }

                    </section>
                )
            }


            {/* ==================================================
                DEATH PATTERNS
            ================================================== */}

            <SectionHeading
                eyebrow="SURVIVAL"
                title="Death pattern analysis"
                copy={
                    "Repeated timing and context patterns around "
                    + "your deaths in this game."
                }
            />


            <AnalysisSummaryPanel
                title="Death Patterns"
                icon={
                    Skull
                }
                record={
                    deathPatterns
                }
                emptyText={
                    "No recurring death pattern was detected for this match."
                }
                tone="negative"
            />


            {/* ==================================================
                PERFORMANCE
            ================================================== */}

            <SectionHeading
                eyebrow="PERFORMANCE"
                title="Match performance"
                copy={
                    "Raw and derived performance observations stored "
                    + "by the DiffTheory analysis engine."
                }
            />


            <section className="performance-grid">

                <AnalysisSummaryPanel
                    title="Core Performance"
                    icon={
                        Gauge
                    }
                    record={
                        performance
                    }
                    emptyText={
                        "No core performance summary is available."
                    }
                    tone="neutral"
                />

                <AnalysisSummaryPanel
                    title="Rank-relative Performance"
                    icon={
                        Medal
                    }
                    record={
                        rankPerformance
                    }
                    emptyText={
                        analysis.rank
                            ? "No supported rank-relative comparison was produced."
                            : "Rank-relative comparison is unavailable because this player is currently unranked."
                    }
                    tone="primary"
                />

            </section>


            {/* ==================================================
                METHODOLOGY
            ================================================== */}

            <section className="analysis-methodology">

                <CircleHelp
                    size={18}
                />

                <div>

                    <strong>
                        DiffTheory reports evidence, not certainty.
                    </strong>

                    <p>
                        Statements such as a deficit widening after a
                        death describe the observed sequence of game
                        states. They do not prove that one event alone
                        caused the game's result.
                    </p>

                </div>

            </section>

        </div>
    );
}


/* ==========================================================
   IMPACT SUMMARY
========================================================== */

function ImpactSummaryPanel({
    impactSummary,
}: {
    impactSummary:
        | UnknownRecord
        | null;
}) {
    if (
        !impactSummary
    ) {
        return (
            <section className="impact-summary-hero">

                <EmptyAnalysisState
                    text={
                        "No impact summary was generated for this game."
                    }
                />

            </section>
        );
    }


    const netImpact =
        getFirst(
            impactSummary,
            [
                "net_impact",
                "netImpact",
                "overall_impact",
                "overallImpact",
                "impact",
            ],
        );


    const excludedKeys =
        [
            "net_impact",
            "netImpact",
            "overall_impact",
            "overallImpact",
            "impact",

            "highest_leverage_opportunities",
            "highest_leverage_opportunity",
            "leverage_opportunities",
            "opportunities",
        ];


    return (
        <section className="impact-summary-hero">

            <div className="impact-summary-main">

                <div className="impact-summary-icon">

                    <Zap
                        size={27}
                    />

                </div>

                <div>

                    <span className="impact-summary-label">
                        NET IMPACT
                    </span>

                    <div className="net-impact-value">

                        {
                            netImpact
                            !== undefined
                                ? formatValue(
                                    netImpact,
                                )
                                : "See breakdown"
                        }

                    </div>

                    <p>
                        DiffTheory's combined reading of the
                        highest-impact positive and negative moments
                        detected in this match.
                    </p>

                </div>

            </div>


            <div className="impact-summary-breakdown">

                <RecordInspector
                    record={
                        impactSummary
                    }
                    excludeKeys={
                        excludedKeys
                    }
                />

            </div>

        </section>
    );
}


/* ==========================================================
   LEVERAGE OPPORTUNITIES
========================================================== */

function LeverageOpportunityPanel({
    value,
}: {
    value: unknown;
}) {
    const opportunities =
        getUnknownArray(
            value,
        );


    if (
        opportunities.length
        > 0
    ) {
        return (
            <section className="leverage-panel">

                <div className="leverage-hero">

                    <div className="leverage-hero-icon">

                        <Target
                            size={27}
                        />

                    </div>

                    <div>

                        <span>
                            HIGHEST LEVERAGE OPPORTUNITIES
                        </span>

                        <strong>
                            {
                                opportunities.length
                            }
                            {" "}
                            moments where a better decision
                            could have mattered most
                        </strong>

                        <p>
                            These are not simply your biggest mistakes.
                            They are the situations where DiffTheory
                            sees the strongest opportunity to improve
                            your decision-making and preserve game state.
                        </p>

                    </div>

                </div>


                <div className="leverage-opportunity-list">

                    {
                        opportunities.map(
                            (
                                opportunity,
                                index,
                            ) => (
                                <LeverageOpportunityCard
                                    key={
                                        index
                                    }
                                    value={
                                        opportunity
                                    }
                                    index={
                                        index
                                    }
                                />
                            ),
                        )
                    }

                </div>

            </section>
        );
    }


    if (
        isRecord(
            value,
        )
    ) {
        return (
            <section className="leverage-panel">

                <div className="leverage-hero">

                    <div className="leverage-hero-icon">

                        <Target
                            size={27}
                        />

                    </div>

                    <div>

                        <span>
                            HIGHEST LEVERAGE OPPORTUNITY
                        </span>

                        <strong>
                            The biggest actionable window in this game
                        </strong>

                    </div>

                </div>


                <div className="leverage-single-record">

                    <RecordInspector
                        record={
                            value
                        }
                    />

                </div>

            </section>
        );
    }


    if (
        value !== null
        && value !== undefined
    ) {
        return (
            <section className="leverage-panel">

                <div className="leverage-hero">

                    <div className="leverage-hero-icon">

                        <Target
                            size={27}
                        />

                    </div>

                    <div>

                        <span>
                            HIGHEST LEVERAGE OPPORTUNITY
                        </span>

                        <strong>
                            {
                                formatValue(
                                    value,
                                )
                            }
                        </strong>

                    </div>

                </div>

            </section>
        );
    }


    return (
        <section className="leverage-panel leverage-empty">

            <Target
                size={24}
            />

            <div>

                <strong>
                    No high-leverage opportunity detected.
                </strong>

                <p>
                    DiffTheory did not isolate a specific
                    decision window as a highest-leverage
                    opportunity in this match.
                </p>

            </div>

        </section>
    );
}


function LeverageOpportunityCard({
    value,
    index,
}: {
    value: unknown;
    index: number;
}) {
    const record =
        getRecord(
            value,
        );

    if (
        !record
    ) {
        return null;
    }


    const minute =
        optionalNumber(
            getFirst(
                record,
                [
                    "minute",
                    "game_minute",
                ],
            ),
        );


    const type =
        textValue(
            getFirst(
                record,
                [
                    "type",
                    "category",
                    "key",
                ],
            ),
            "Opportunity",
        );


    const title =
        textValue(
            getFirst(
                record,
                [
                    "title",
                    "description",
                    "recommendation",
                    "action",
                ],
            ),
            "High-leverage opportunity",
        );


    const evidence =
        getRecord(
            record.evidence,
        );


    return (
        <article className="leverage-opportunity-card">

            <div className="leverage-opportunity-rank">

                <span>
                    {
                        String(
                            index + 1,
                        ).padStart(
                            2,
                            "0",
                        )
                    }
                </span>

            </div>


            <div className="leverage-opportunity-main">

                <div className="leverage-opportunity-meta">

                    {
                        minute
                        !== null
                        && (
                            <span className="leverage-minute">

                                <Clock3
                                    size={13}
                                />

                                {
                                    formatMinute(
                                        minute,
                                    )
                                }

                            </span>
                        )
                    }

                    <span className="leverage-type">

                        {
                            humanize(
                                type,
                            )
                        }

                    </span>

                </div>


                <h3>
                    {title}
                </h3>


                {
                    evidence
                    && (
                        <LeverageEvidence
                            evidence={
                                evidence
                            }
                        />
                    )
                }

            </div>

        </article>
    );
}


function LeverageEvidence({
    evidence,
}: {
    evidence: UnknownRecord;
}) {
    const nearbyAllies =
        optionalNumber(
            evidence.nearby_allies,
        );

    const nearbyEnemies =
        optionalNumber(
            evidence.nearby_enemies,
        );

    const numberDifference =
        optionalNumber(
            evidence.number_difference,
        );

    const outnumbered =
        evidence.outnumbered;

    const objective =
        evidence.objective;

    const secondsAfterDeath =
        optionalNumber(
            evidence.seconds_after_death,
        );


    const hasFightContext =
        nearbyAllies !== null
        || nearbyEnemies !== null
        || numberDifference !== null;


    const hasObjectiveContext =
        objective !== undefined
        || secondsAfterDeath !== null;


    return (
        <div className="leverage-evidence">

            {
                hasFightContext
                && (
                    <div className="leverage-evidence-highlight">

                        <div>

                            <span>
                                ALLIES NEARBY
                            </span>

                            <strong>
                                {
                                    nearbyAllies
                                    ?? "—"
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                ENEMIES NEARBY
                            </span>

                            <strong>
                                {
                                    nearbyEnemies
                                    ?? "—"
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                NUMBER ADVANTAGE
                            </span>

                            <strong
                                className={
                                    (
                                        numberDifference
                                        ?? 0
                                    )
                                    < 0
                                        ? "leverage-negative"
                                        : ""
                                }
                            >
                                {
                                    numberDifference
                                    !== null
                                        ? (
                                            numberDifference
                                            > 0
                                                ? `+${numberDifference}`
                                                : numberDifference
                                        )
                                        : "—"
                                }
                            </strong>

                        </div>


                        {
                            outnumbered
                            !== undefined
                            && (
                                <div>

                                    <span>
                                        OUTNUMBERED
                                    </span>

                                    <strong
                                        className={
                                            outnumbered
                                                ? "leverage-negative"
                                                : ""
                                        }
                                    >
                                        {
                                            outnumbered
                                                ? "YES"
                                                : "NO"
                                        }
                                    </strong>

                                </div>
                            )
                        }

                    </div>
                )
            }


            {
                hasObjectiveContext
                && (
                    <div className="objective-opportunity">

                        <div className="objective-opportunity-icon">

                            <Target
                                size={18}
                            />

                        </div>

                        <div>

                            <span>
                                OBJECTIVE WINDOW
                            </span>

                            <strong>
                                {
                                    humanize(
                                        objective,
                                    )
                                }
                            </strong>

                            {
                                secondsAfterDeath
                                !== null
                                && (
                                    <p>
                                        Objective occurred
                                        {" "}
                                        <b>
                                            {
                                                secondsAfterDeath.toFixed(
                                                    1,
                                                )
                                            }
                                            s
                                        </b>
                                        {" "}
                                        after your death.
                                    </p>
                                )
                            }

                        </div>

                    </div>
                )
            }


            {
                !hasFightContext
                && !hasObjectiveContext
                && (
                    <RecordInspector
                        record={
                            evidence
                        }
                        compact
                    />
                )
            }

        </div>
    );
}


/* ==========================================================
   VIEW ALL
========================================================== */

function ViewAllButton({
    expanded,
    onClick,
    collapsedLabel,
    expandedLabel,
}: {
    expanded: boolean;
    onClick: () => void;
    collapsedLabel: string;
    expandedLabel: string;
}) {
    return (
        <button
            type="button"
            className="analysis-view-all"
            onClick={
                onClick
            }
        >

            <span>
                {
                    expanded
                        ? expandedLabel
                        : collapsedLabel
                }
            </span>

            <ChevronDown
                size={16}
                className={
                    expanded
                        ? "expanded"
                        : ""
                }
            />

        </button>
    );
}


/* ==========================================================
   STAT
========================================================== */

function AnalysisStat({
    icon: Icon,
    label,
    value,
    detail,
    tone,
}: {
    icon: typeof Activity;
    label: string;
    value: string;
    detail: string;

    tone:
        | "negative"
        | "positive"
        | "neutral";
}) {
    return (
        <div
            className={
                `analysis-stat stat-${tone}`
            }
        >

            <Icon
                size={18}
            />

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
   SECTION HEADING
========================================================== */

function SectionHeading({
    eyebrow,
    title,
    copy,
}: {
    eyebrow: string;
    title: string;
    copy?: string;
}) {
    return (
        <div className="analysis-section-heading">

            <p>
                {eyebrow}
            </p>

            <h2>
                {title}
            </h2>

            {
                copy
                && (
                    <span>
                        {copy}
                    </span>
                )
            }

        </div>
    );
}


/* ==========================================================
   TIMELINE ROW
========================================================== */

function TimelineRow({
    moment,
    index,
}: {
    moment: TimelineMoment;
    index: number;
}) {
    const [
        expanded,
        setExpanded,
    ] = useState(
        index < 2,
    );

    return (
        <article
            className={
                `timeline-row timeline-${moment.kind}`
            }
        >

            <div className="timeline-marker">

                {
                    moment.kind
                    === "critical"
                        ? (
                            <ShieldAlert
                                size={15}
                            />
                        )
                        : (
                            <Sparkles
                                size={15}
                            />
                        )
                }

            </div>


            <div className="timeline-time">

                <Clock3
                    size={12}
                />

                {
                    formatMinute(
                        moment.minute,
                    )
                }

            </div>


            <div className="timeline-content">

                <div className="timeline-title-row">

                    <div>

                        <span>
                            {
                                moment.kind
                                === "critical"
                                    ? "CRITICAL MOMENT"
                                    : "POSITIVE MOMENT"
                            }
                        </span>

                        <h3>
                            {
                                moment.title
                            }
                        </h3>

                    </div>


                    {
                        moment.severity
                        !== null
                        && (
                            <span className="timeline-severity">
                                Severity
                                {" "}
                                {
                                    moment.severity
                                }
                                /5
                            </span>
                        )
                    }

                </div>


                <MomentPreview
                    record={
                        moment.data
                    }
                />


                <button
                    type="button"
                    className="timeline-expand"
                    onClick={
                        () =>
                            setExpanded(
                                (
                                    current,
                                ) =>
                                    !current,
                            )
                    }
                >

                    {
                        expanded
                            ? "HIDE EVIDENCE"
                            : "VIEW EVIDENCE"
                    }

                    <ChevronDown
                        size={14}
                        className={
                            expanded
                                ? "expanded"
                                : ""
                        }
                    />

                </button>


                {
                    expanded
                    && (
                        <RecordInspector
                            record={
                                moment.data
                            }
                            excludeKeys={[
                                "title",
                                "minute",
                                "severity",
                                "source",
                            ]}
                        />
                    )
                }

            </div>

        </article>
    );
}


/* ==========================================================
   MOMENT PREVIEW
========================================================== */

function MomentPreview({
    record,
}: {
    record: UnknownRecord;
}) {
    const evidence =
        getRecord(
            record.evidence,
        );

    const reasons =
        Array.isArray(
            evidence?.reasons,
        )
            ? evidence.reasons
            : Array.isArray(
                record.reasons,
            )
                ? record.reasons
                : [];


    if (
        reasons.length
        === 0
    ) {
        return null;
    }


    return (
        <div className="moment-reasons">

            {
                reasons
                .slice(
                    0,
                    5,
                )
                .map(
                    (
                        reason,
                        index,
                    ) => (
                        <span
                            key={
                                index
                            }
                        >
                            {
                                humanize(
                                    reason,
                                )
                            }
                        </span>
                    ),
                )
            }

        </div>
    );
}


/* ==========================================================
   COACHING SIGNAL
========================================================== */

function CoachingSignalCard({
    signal,
}: {
    signal: UnknownRecord;
}) {
    const positive =
        Boolean(
            signal.positive,
        );

    const severity =
        optionalNumber(
            signal.severity,
        );

    return (
        <article
            className={
                `coaching-signal-card ${
                    positive
                        ? "signal-positive"
                        : "signal-negative"
                }`
            }
        >

            <div className="signal-card-top">

                <div>

                    {
                        positive
                            ? (
                                <TrendingUp
                                    size={17}
                                />
                            )
                            : (
                                <TrendingDown
                                    size={17}
                                />
                            )
                    }

                </div>

                <span>
                    {
                        positive
                            ? "POSITIVE SIGNAL"
                            : "COACHING SIGNAL"
                    }
                </span>


                {
                    severity
                    !== null
                    && (
                        <b>
                            {
                                severity
                            }
                            /5
                        </b>
                    )
                }

            </div>


            <h3>
                {
                    textValue(
                        getFirst(
                            signal,
                            [
                                "title",
                                "key",
                                "type",
                            ],
                        ),
                        "Gameplay signal",
                    )
                }
            </h3>


            <div className="signal-meta">

                {
                    signal.key
                    !== undefined
                    && (
                        <span>
                            {
                                humanize(
                                    signal.key,
                                )
                            }
                        </span>
                    )
                }

                {
                    signal.source
                    !== undefined
                    && (
                        <span>
                            {
                                humanize(
                                    signal.source,
                                )
                            }
                        </span>
                    )
                }

                {
                    signal.minute
                    !== undefined
                    && (
                        <span>
                            {
                                formatMinute(
                                    signal.minute,
                                )
                            }
                        </span>
                    )
                }

            </div>


            {
                isRecord(
                    signal.evidence,
                )
                && (
                    <RecordInspector
                        record={
                            signal.evidence
                        }
                        compact
                    />
                )
            }

        </article>
    );
}


/* ==========================================================
   DISRUPTION PANEL
========================================================== */

function DisruptionPanel({
    icon: Icon,
    eyebrow,
    title,
    items,
    emptyText,
}: {
    icon: typeof Wheat;
    eyebrow: string;
    title: string;
    items: UnknownRecord[];
    emptyText: string;
}) {
    return (
        <section className="disruption-panel">

            <div className="disruption-heading">

                <div className="disruption-icon">

                    <Icon
                        size={19}
                    />

                </div>

                <div>

                    <span>
                        {eyebrow}
                    </span>

                    <h3>
                        {title}
                    </h3>

                </div>


                <strong>
                    {
                        items.length
                    }
                </strong>

            </div>


            {
                items.length
                === 0
                    ? (
                        <EmptyAnalysisState
                            text={
                                emptyText
                            }
                        />
                    )
                    : (
                        <div className="disruption-list">

                            {
                                items.map(
                                    (
                                        item,
                                        index,
                                    ) => (
                                        <div
                                            className="disruption-row"
                                            key={
                                                index
                                            }
                                        >

                                            <div>

                                                <span>
                                                    {
                                                        item.minute
                                                        !== undefined
                                                            ? formatMinute(
                                                                item.minute,
                                                            )
                                                            : `#${index + 1}`
                                                    }
                                                </span>

                                                <strong>
                                                    {
                                                        getMomentTitle(
                                                            item,
                                                            `${humanize(
                                                                eyebrow,
                                                            )} disruption`,
                                                        )
                                                    }
                                                </strong>

                                            </div>

                                            <RecordInspector
                                                record={
                                                    item
                                                }
                                                compact
                                                excludeKeys={[
                                                    "minute",
                                                    "title",
                                                ]}
                                            />

                                        </div>
                                    ),
                                )
                            }

                        </div>
                    )
            }

        </section>
    );
}


/* ==========================================================
   SUMMARY PANEL
========================================================== */

function AnalysisSummaryPanel({
    title,
    icon: Icon,
    record,
    emptyText,
    tone,
}: {
    title: string;
    icon: typeof Zap;

    record:
        | UnknownRecord
        | null;

    emptyText: string;

    tone:
        | "primary"
        | "negative"
        | "neutral";
}) {
    return (
        <section
            className={
                `analysis-summary-panel summary-tone-${tone}`
            }
        >

            <div className="summary-panel-heading">

                <div>

                    <Icon
                        size={19}
                    />

                </div>

                <h3>
                    {title}
                </h3>

            </div>


            {
                record
                    ? (
                        <RecordInspector
                            record={
                                record
                            }
                        />
                    )
                    : (
                        <EmptyAnalysisState
                            text={
                                emptyText
                            }
                        />
                    )
            }

        </section>
    );
}


/* ==========================================================
   RECORD INSPECTOR
========================================================== */

function RecordInspector({
    record,
    compact = false,
    excludeKeys = [],
}: {
    record: UnknownRecord;
    compact?: boolean;
    excludeKeys?: string[];
}) {
    const entries =
        Object.entries(
            record,
        )
        .filter(
            (
                [
                    key,
                    value,
                ],
            ) =>
                !excludeKeys.includes(
                    key,
                )
                &&
                value !== null
                &&
                value !== undefined
                &&
                value !== "",
        );


    if (
        entries.length
        === 0
    ) {
        return null;
    }


    return (
        <div
            className={
                compact
                    ? "record-grid record-grid-compact"
                    : "record-grid"
            }
        >

            {
                entries.map(
                    (
                        [
                            key,
                            value,
                        ],
                    ) => (
                        <RecordValue
                            key={
                                key
                            }
                            label={
                                key
                            }
                            value={
                                value
                            }
                            compact={
                                compact
                            }
                        />
                    ),
                )
            }

        </div>
    );
}


/* ==========================================================
   RECORD VALUE
========================================================== */

function RecordValue({
    label,
    value,
    compact,
}: {
    label: string;
    value: unknown;
    compact: boolean;
}) {
    if (
        isRecord(
            value,
        )
    ) {
        return (
            <details className="record-nested">

                <summary>

                    <span>
                        {
                            humanize(
                                label,
                            )
                        }
                    </span>

                    <ChevronRight
                        size={13}
                    />

                </summary>

                <RecordInspector
                    record={
                        value
                    }
                    compact
                />

            </details>
        );
    }


    if (
        Array.isArray(
            value,
        )
    ) {
        if (
            value.length
            === 0
        ) {
            return null;
        }

        if (
            value.every(
                (
                    item,
                ) =>
                    typeof item
                    === "string"
                    || typeof item
                    === "number",
            )
        ) {
            return (
                <div className="record-array">

                    <span>
                        {
                            humanize(
                                label,
                            )
                        }
                    </span>

                    <div>

                        {
                            value.map(
                                (
                                    item,
                                    index,
                                ) => (
                                    <b
                                        key={
                                            index
                                        }
                                    >
                                        {
                                            humanize(
                                                item,
                                            )
                                        }
                                    </b>
                                ),
                            )
                        }

                    </div>

                </div>
            );
        }


        return (
            <details className="record-nested">

                <summary>

                    <span>
                        {
                            humanize(
                                label,
                            )
                        }
                    </span>

                    <small>
                        {
                            value.length
                        }
                        {" "}
                        items
                    </small>

                    <ChevronRight
                        size={13}
                    />

                </summary>

                <div className="nested-array">

                    {
                        value
                        .filter(
                            isRecord,
                        )
                        .map(
                            (
                                item,
                                index,
                            ) => (
                                <RecordInspector
                                    key={
                                        index
                                    }
                                    record={
                                        item
                                    }
                                    compact
                                />
                            ),
                        )
                    }

                </div>

            </details>
        );
    }


    return (
        <div
            className={
                compact
                    ? "record-item record-item-compact"
                    : "record-item"
            }
        >

            <span>
                {
                    humanize(
                        label,
                    )
                }
            </span>

            <strong>
                {
                    formatValue(
                        value,
                    )
                }
            </strong>

        </div>
    );
}


/* ==========================================================
   RECOMMENDATIONS
========================================================== */

function RecommendationsPanel({
    recommendations,
}: {
    recommendations:
        MatchAnalysis["recommendations"];
}) {
    const items =
        Array.isArray(
            recommendations,
        )
            ? recommendations
            : recommendations
                ? Object.entries(
                    recommendations,
                )
                : [];


    if (
        items.length
        === 0
    ) {
        return (
            <section className="recommendations-panel">

                <EmptyAnalysisState
                    text={
                        "No match-specific recommendation was generated."
                    }
                />

            </section>
        );
    }


    return (
        <section className="recommendations-panel">

            {
                items.map(
                    (
                        recommendation,
                        index,
                    ) => {
                        if (
                            Array.isArray(
                                recommendation,
                            )
                            && recommendation.length
                            === 2
                            && typeof recommendation[0]
                            === "string"
                        ) {
                            return (
                                <RecommendationCard
                                    key={
                                        recommendation[0]
                                    }
                                    index={
                                        index
                                    }
                                    title={
                                        humanize(
                                            recommendation[0],
                                        )
                                    }
                                    value={
                                        recommendation[1]
                                    }
                                />
                            );
                        }

                        return (
                            <RecommendationCard
                                key={
                                    index
                                }
                                index={
                                    index
                                }
                                value={
                                    recommendation
                                }
                            />
                        );
                    },
                )
            }

        </section>
    );
}


function RecommendationCard({
    index,
    title,
    value,
}: {
    index: number;
    title?: string;
    value: unknown;
}) {
    const record =
        getRecord(
            value,
        );

    const inferredTitle =
        record
            ? textValue(
                getFirst(
                    record,
                    [
                        "title",
                        "recommendation",
                        "action",
                        "message",
                    ],
                ),
                "",
            )
            : "";


    return (
        <article className="recommendation-card">

            <div className="recommendation-number">

                {
                    String(
                        index + 1,
                    ).padStart(
                        2,
                        "0",
                    )
                }

            </div>

            <div className="recommendation-icon">

                <Target
                    size={18}
                />

            </div>

            <div>

                <span>
                    NEXT-GAME FOCUS
                </span>

                <h3>
                    {
                        title
                        || inferredTitle
                        || "Recommendation"
                    }
                </h3>

                {
                    record
                        ? (
                            <RecordInspector
                                record={
                                    record
                                }
                                compact
                                excludeKeys={[
                                    "title",
                                ]}
                            />
                        )
                        : (
                            <p>
                                {
                                    formatValue(
                                        value,
                                    )
                                }
                            </p>
                        )
                }

            </div>

        </article>
    );
}


/* ==========================================================
   EMPTY
========================================================== */

function EmptyAnalysisState({
    text,
}: {
    text: string;
}) {
    return (
        <div className="analysis-empty-inline">

            <CheckCircle2
                size={16}
            />

            <span>
                {text}
            </span>

        </div>
    );
}


export default AnalysisPage;