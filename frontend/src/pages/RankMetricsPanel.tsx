import {
    useMemo,
    useState,
} from "react";

import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type {
    RankMetricsResponse,
} from "../services/coachingApi";

import "./DashboardPage.css";


const ROLE_LABELS: Record<
    string,
    string
> = {
    TOP:
        "Top",

    JUNGLE:
        "Jungle",

    MIDDLE:
        "Mid",

    BOTTOM:
        "ADC",

    UTILITY:
        "Support",
};


type Props = {
    data: RankMetricsResponse;
};


function formatMetricValue(
    metricKey: string,
    value: number | null,
) {

    if (
        value === null
        || value === undefined
    ) {
        return "—";
    }


    switch (
        metricKey
    ) {

        case "gold_per_min":
        case "gold_at_10":
        case "xp_at_10":
        case "xp_per_min":
            return Math.round(
                value
            ).toLocaleString();


        case "deaths":
            return value.toFixed(
                1
            );


        case "cs_at_10":
            return value.toFixed(
                1
            );


        default:
            return value.toFixed(
                2
            );
    }
}


export default function RankMetricsPanel({
    data,
}: Props) {

    const roles =
        Object.keys(
            data.roles
        );


    const [
        selectedRole,
        setSelectedRole,
    ] =
        useState(
            roles.includes(
                "MIDDLE"
            )
                ? "MIDDLE"
                : roles[0]
        );


    const roleData =
        data.roles[
            selectedRole
        ];


    const roleMetrics =
        roleData?.metrics
        ?? [];


    const [
        selectedMetricKey,
        setSelectedMetricKey,
    ] =
        useState(
            roleMetrics.find(
                (
                    metric
                ) =>
                    metric.key
                    === "cs_per_min"
            )
            ?.key
            ??
            roleMetrics[
                0
            ]?.key
            ??
            "cs_per_min"
        );


    const selectedMetric =
        roleMetrics.find(
            (
                metric
            ) =>
                metric.key
                === selectedMetricKey
        )
        ?? roleMetrics[0];


    const chartData =
        useMemo(
            () => {

                if (
                    !selectedMetric
                ) {
                    return [];
                }


                return (
                    selectedMetric
                    .values
                    .map(
                        (
                            item
                        ) => ({
                            rank:
                                item.rank,

                            value:
                                item.value,
                        })
                    )
                );
            },
            [
                selectedMetric,
            ],
        );


    if (
        !selectedMetric
        || !selectedRole
    ) {

        return null;
    }


    const playerValue =
        selectedMetric
        .player_value;


    const currentRank =
        data.current_rank;


    const currentRankBenchmark =
        selectedMetric
        .values
        .find(
            (
                item
            ) =>
                item.rank
                === currentRank
        )
        ?.value
        ?? null;


    const currentRankIndex =
        currentRank
            ? data.ranks.indexOf(
                currentRank
            )
            : -1;


    const nextRank =
        (
            currentRankIndex >= 0
            &&
            currentRankIndex
            <
            data.ranks.length - 1
        )
            ? data.ranks[
                currentRankIndex + 1
            ]
            : null;


    const nextRankBenchmark =
        nextRank
            ? (
                selectedMetric
                .values
                .find(
                    (
                        item
                    ) =>
                        item.rank
                        === nextRank
                )
                ?.value
                ?? null
            )
            : null;


    const playerVsCurrent =
        (
            playerValue !== null
            &&
            currentRankBenchmark !== null
        )
            ? (
                playerValue
                - currentRankBenchmark
            )
            : null;


    const playerVsNext =
        (
            playerValue !== null
            &&
            nextRankBenchmark !== null
        )
            ? (
                playerValue
                - nextRankBenchmark
            )
            : null;


    return (
        <section
            className="rank-metrics-card"
        >

            <div
                className="rank-metrics-header"
            >

                <div>

                    <p
                        className="eyebrow"
                    >
                        RANK METRICS
                    </p>

                    <h2>
                        Your gameplay against
                        the League ladder
                    </h2>

                    <p>
                        Compare your recent
                        role-specific performance
                        against median benchmarks
                        from Iron through Challenger.
                    </p>

                </div>

            </div>


            <div
                className="rank-role-tabs"
            >

                {
                    roles.map(
                        (
                            role
                        ) => (

                            <button
                                key={
                                    role
                                }
                                type="button"
                                className={
                                    role
                                    === selectedRole
                                        ? "active"
                                        : ""
                                }
                                onClick={
                                    () => {

                                        setSelectedRole(
                                            role
                                        );


                                        const nextMetrics =
                                            data.roles[
                                                role
                                            ]
                                            ?.metrics
                                            ?? [];


                                        const preferredMetric =
                                            nextMetrics.find(
                                                (
                                                    metric
                                                ) =>
                                                    metric.key
                                                    === "cs_per_min"
                                            );


                                        setSelectedMetricKey(
                                            preferredMetric?.key
                                            ??
                                            nextMetrics[
                                                0
                                            ]?.key
                                            ??
                                            ""
                                        );
                                    }
                                }
                            >

                                {
                                    ROLE_LABELS[
                                        role
                                    ]
                                    ?? role
                                }

                            </button>
                        )
                    )
                }

            </div>


            <div
                className="rank-metrics-layout"
            >

                <aside
                    className="rank-metric-selector"
                >

                    {
                        roleMetrics.map(
                            (
                                metric
                            ) => (

                                <button
                                    key={
                                        metric.key
                                    }
                                    type="button"
                                    className={
                                        metric.key
                                        === selectedMetric.key
                                            ? "active"
                                            : ""
                                    }
                                    onClick={
                                        () =>
                                            setSelectedMetricKey(
                                                metric.key
                                            )
                                    }
                                >

                                    <span>
                                        {
                                            metric.label
                                        }
                                    </span>

                                    <small>

                                        {
                                            metric.direction
                                            === "LOWER_BETTER"
                                                ? "Lower is better"
                                                : "Higher is better"
                                        }

                                    </small>

                                </button>
                            )
                        )
                    }

                </aside>


                <div
                    className="rank-metric-chart"
                >

                    <div
                        className="rank-chart-head"
                    >

                        <div>

                            <span>
                                {
                                    ROLE_LABELS[
                                        selectedRole
                                    ]
                                    ?? selectedRole
                                }
                                {" · "}
                                {
                                    selectedMetric.label
                                }
                            </span>

                            <strong>

                                {
                                    selectedMetric.direction
                                    === "LOWER_BETTER"
                                        ? "Lower values are generally better"
                                        : "Higher values are generally better"
                                }

                            </strong>

                        </div>


                        <div
                            className="rank-chart-meta"
                        >

                            <span>
                                Recent games
                            </span>

                            <strong>
                                {
                                    roleData
                                    ?.player_matches
                                    ?? 0
                                }
                            </strong>

                        </div>

                    </div>


                    <div
                        className="rank-chart-wrapper"
                    >

                        <ResponsiveContainer
                            width="100%"
                            height={420}
                        >

                            <LineChart
                                data={
                                    chartData
                                }
                                margin={
                                    {
                                        top: 35,
                                        right: 35,
                                        bottom: 20,
                                        left: 10,
                                    }
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="rgba(255,255,255,0.08)"
                                />


                                <XAxis
                                    dataKey="rank"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={
                                        {
                                            fill:
                                                "rgba(255,255,255,0.65)",
                                        }
                                    }
                                />


                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={65}
                                    tick={
                                        {
                                            fill:
                                                "rgba(255,255,255,0.65)",
                                        }
                                    }
                                />


                                <Tooltip
                                    contentStyle={
                                        {
                                            background:
                                                "#111318",

                                            border:
                                                "1px solid rgba(255,255,255,0.12)",

                                            borderRadius:
                                                "12px",

                                            color:
                                                "#ffffff",

                                            boxShadow:
                                                "0 12px 30px rgba(0,0,0,0.35)",
                                        }
                                    }
                                    labelStyle={
                                        {
                                            color:
                                                "rgba(255,255,255,0.72)",

                                            fontWeight:
                                                700,
                                        }
                                    }
                                    itemStyle={
                                        {
                                            color:
                                                "#ffffff",
                                        }
                                    }
                                    formatter={
                                        (
                                            value
                                        ) => {

                                            if (
                                                value === undefined
                                                ||
                                                value === null
                                            ) {

                                                return [
                                                    "—",
                                                    selectedMetric.label,
                                                ];
                                            }


                                            return [
                                                formatMetricValue(
                                                    selectedMetric.key,
                                                    Number(
                                                        value
                                                    ),
                                                ),

                                                selectedMetric.label,
                                            ];
                                        }
                                    }
                                />


                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name={
                                        selectedMetric.label
                                    }
                                    stroke="currentColor"
                                    strokeWidth={3}
                                    dot={
                                        {
                                            r: 5,
                                        }
                                    }
                                    activeDot={
                                        {
                                            r: 7,
                                        }
                                    }
                                />


                                {
                                    (
                                        currentRank
                                        &&
                                        playerValue
                                        !== null
                                    )
                                    && (

                                        <ReferenceDot
                                            x={
                                                currentRank
                                            }
                                            y={
                                                playerValue
                                            }
                                            r={9}
                                            fill="#ff4d67"
                                            stroke="#ffffff"
                                            strokeWidth={3}
                                            label={
                                                {
                                                    value:
                                                        "YOU",

                                                    position:
                                                        "top",

                                                    fill:
                                                        "#ff4d67",

                                                    fontWeight:
                                                        800,
                                                }
                                            }
                                        />
                                    )
                                }

                            </LineChart>

                        </ResponsiveContainer>

                    </div>


                    <div
                        className="rank-player-comparison"
                    >

                        <div>

                            <span>
                                YOUR RECENT MEDIAN
                            </span>

                            <strong>
                                {
                                    formatMetricValue(
                                        selectedMetric.key,
                                        playerValue
                                    )
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                {
                                    currentRank
                                    ?? "CURRENT RANK"
                                }
                                {" "}
                                MEDIAN
                            </span>

                            <strong>
                                {
                                    formatMetricValue(
                                        selectedMetric.key,
                                        currentRankBenchmark
                                    )
                                }
                            </strong>

                        </div>


                        <div>

                            <span>
                                {
                                    nextRank
                                    ?? "NEXT RANK"
                                }
                                {" "}
                                MEDIAN
                            </span>

                            <strong>
                                {
                                    formatMetricValue(
                                        selectedMetric.key,
                                        nextRankBenchmark
                                    )
                                }
                            </strong>

                        </div>

                    </div>


                    <div
                        className="rank-metric-deltas"
                    >

                        {
                            playerVsCurrent !== null
                            && (

                                <div>

                                    <span>
                                        VS CURRENT RANK
                                    </span>

                                    <strong>
                                        {
                                            playerVsCurrent >= 0
                                                ? "+"
                                                : ""
                                        }

                                        {
                                            formatMetricValue(
                                                selectedMetric.key,
                                                playerVsCurrent
                                            )
                                        }
                                    </strong>

                                </div>
                            )
                        }


                        {
                            playerVsNext !== null
                            && (

                                <div>

                                    <span>
                                        VS NEXT RANK
                                    </span>

                                    <strong>
                                        {
                                            playerVsNext >= 0
                                                ? "+"
                                                : ""
                                        }

                                        {
                                            formatMetricValue(
                                                selectedMetric.key,
                                                playerVsNext
                                            )
                                        }
                                    </strong>

                                </div>
                            )
                        }

                    </div>

                </div>

            </div>

        </section>
    );
}