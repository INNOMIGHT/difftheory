import {
    useMemo,
    useState,
} from "react";

import {
    Line,
    LineChart,
    CartesianGrid,
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

    currentRank?: string;
};


export default function RankMetricsPanel({
    data,
    currentRank,
}: Props) {

    const roles =
        Object.keys(
            data.roles
        );


    const [
        selectedRole,
        setSelectedRole,
    ] = useState(
        roles.includes(
            "MIDDLE"
        )
            ? "MIDDLE"
            : roles[0]
    );


    const roleMetrics =
        data.roles[
            selectedRole
        ]
        ?? [];


    const [
        selectedMetricKey,
        setSelectedMetricKey,
    ] = useState(
        roleMetrics[0]?.key
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
    ) {
        return null;
    }


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
                        How performance changes
                        across the ladder
                    </h2>

                    <p>
                        Median performance benchmarks
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
                                Monotonicity
                            </span>

                            <strong>
                                {
                                    (
                                        selectedMetric
                                        .monotonicity
                                        * 100
                                    )
                                    .toFixed(
                                        0
                                    )
                                }
                                %
                            </strong>

                        </div>

                    </div>


                    <div
                        className="rank-chart-wrapper"
                    >

                        <ResponsiveContainer
                            width="100%"
                            height={360}
                        >

                            <LineChart
                                data={
                                    chartData
                                }
                                margin={
                                    {
                                        top: 20,
                                        right: 24,
                                        bottom: 10,
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
                                    width={55}
                                />

                                <Tooltip
                                    formatter={
                                        (
                                            value
                                        ) => {

                                            if (
                                                value === undefined
                                                || value === null
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

                            </LineChart>

                        </ResponsiveContainer>

                    </div>


                    {
                        currentRank
                        && (

                            <div
                                className="current-rank-note"
                            >

                                Your current rank:
                                {" "}

                                <strong>
                                    {
                                        currentRank
                                    }
                                </strong>

                            </div>
                        )
                    }

                </div>

            </div>

        </section>
    );
}