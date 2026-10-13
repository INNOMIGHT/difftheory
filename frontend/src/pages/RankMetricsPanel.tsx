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
            roleMetrics[
                0
            ]?.key
            ?? "cs_per_min"
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
                        with median benchmarks
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


                                        setSelectedMetricKey(
                                            nextMetrics[
                                                0
                                            ]?.key
                                            ?? ""
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
                                        top: 30,
                                        right: 30,
                                        bottom: 20,
                                        left: 10,
                                    }
                                }
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />


                                <XAxis
                                    dataKey="rank"
                                    tickLine={false}
                                    axisLine={false}
                                />


                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />


                                <Tooltip
                                    formatter={
                                        (
                                            value
                                        ) => {

                                            if (
                                                value
                                                === undefined
                                                ||
                                                value
                                                === null
                                            ) {

                                                return [
                                                    "—",
                                                    selectedMetric.label,
                                                ];
                                            }


                                            return [
                                                Number(
                                                    value
                                                ).toFixed(
                                                    2
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
                                    playerValue
                                    !== null

                                        ? playerValue.toFixed(
                                            2
                                        )

                                        : "—"
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
                                    currentRankBenchmark
                                    !== null

                                        ? currentRankBenchmark
                                            .toFixed(
                                                2
                                            )

                                        : "—"
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
                                    nextRankBenchmark
                                    !== null

                                        ? nextRankBenchmark
                                            .toFixed(
                                                2
                                            )

                                        : "—"
                                }
                            </strong>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}