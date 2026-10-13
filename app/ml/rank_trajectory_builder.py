from pathlib import Path

import pandas as pd


STATISTICS_DIR = Path(
    "artifacts/rank_baseline/statistics"
)

OUTPUT_DIR = Path(
    "artifacts/rank_baseline/trajectories"
)


class RankTrajectoryBuilder:

    RANKS = [
        "IRON",
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "EMERALD",
        "DIAMOND",
        "MASTER",
        "GRANDMASTER",
        "CHALLENGER",
    ]


    RANK_ORDER = {
        rank: index
        for index, rank
        in enumerate(
            RANKS
        )
    }


    def _load_rank(
        self,
        rank,
    ):

        path = (
            STATISTICS_DIR
            / f"{rank}_role_statistics.csv"
        )


        if not path.exists():

            raise FileNotFoundError(
                f"Missing statistics file: {path}"
            )


        df = pd.read_csv(
            path
        )


        df["rank"] = (
            rank
        )

        df["rank_order"] = (
            self.RANK_ORDER[
                rank
            ]
        )


        return df


    @staticmethod
    def _direction_changes(
        values,
    ):

        changes = 0

        previous_direction = None


        for index in range(
            1,
            len(values),
        ):

            difference = (
                values[index]
                -
                values[index - 1]
            )


            if difference == 0:
                continue


            direction = (
                1
                if difference > 0
                else -1
            )


            if (
                previous_direction
                is not None
                and
                direction
                != previous_direction
            ):

                changes += 1


            previous_direction = (
                direction
            )


        return changes


    @staticmethod
    def _monotonicity_score(
        values,
    ):

        if len(values) < 2:
            return 0.0


        increasing = 0

        decreasing = 0


        total_steps = (
            len(values)
            - 1
        )


        for index in range(
            1,
            len(values),
        ):

            difference = (
                values[index]
                -
                values[index - 1]
            )


            if difference > 0:

                increasing += 1

            elif difference < 0:

                decreasing += 1


        strongest_direction = max(
            increasing,
            decreasing,
        )


        return (
            strongest_direction
            /
            total_steps
        )


    @staticmethod
    def _trend_direction(
        first_value,
        last_value,
    ):

        if last_value > first_value:
            return "INCREASING"

        if last_value < first_value:
            return "DECREASING"

        return "FLAT"


    @staticmethod
    def _minimum_confidence(
        confidences,
    ):

        order = {
            "VERY_LOW": 0,
            "LOW": 1,
            "MEDIUM": 2,
            "HIGH": 3,
        }


        reverse = {
            value: key
            for key, value
            in order.items()
        }


        minimum = min(
            order.get(
                value,
                0,
            )
            for value
            in confidences
        )


        return reverse[
            minimum
        ]


    def build(
        self,
    ):

        frames = []


        for rank in self.RANKS:

            frames.append(
                self._load_rank(
                    rank
                )
            )


        all_stats = pd.concat(
            frames,
            ignore_index=True,
        )


        rows = []


        grouped = (
            all_stats
            .groupby(
                [
                    "role",
                    "metric",
                ]
            )
        )


        for (
            role,
            metric,
        ), group in grouped:


            group = (
                group
                .sort_values(
                    "rank_order"
                )
            )


            # We want a genuine complete-ladder
            # trajectory.
            if (
                len(group)
                != len(
                    self.RANKS
                )
            ):
                continue


            medians = (
                group[
                    "p50"
                ]
                .astype(float)
                .tolist()
            )


            confidences = (
                group[
                    "confidence"
                ]
                .tolist()
            )


            sample_counts = (
                group[
                    "sample_count"
                ]
                .astype(int)
                .tolist()
            )


            first_value = (
                medians[0]
            )

            last_value = (
                medians[-1]
            )


            absolute_change = (
                last_value
                -
                first_value
            )


            percent_change = None


            if first_value != 0:

                percent_change = (
                    absolute_change
                    /
                    first_value
                    *
                    100
                )


            monotonicity = (
                self._monotonicity_score(
                    medians
                )
            )


            direction_changes = (
                self._direction_changes(
                    medians
                )
            )


            row = {
                "role":
                    role,

                "metric":
                    metric,

                "overall_direction":
                    self._trend_direction(
                        first_value,
                        last_value,
                    ),

                "absolute_change":
                    absolute_change,

                "percent_change":
                    percent_change,

                "monotonicity_score":
                    monotonicity,

                "direction_changes":
                    direction_changes,

                "trajectory_confidence":
                    self._minimum_confidence(
                        confidences
                    ),
            }


            # ======================================
            # DYNAMIC RANK COLUMNS
            # ======================================

            for (
                index,
                rank,
            ) in enumerate(
                self.RANKS
            ):

                rank_key = (
                    rank.lower()
                )


                row[
                    f"{rank_key}_p50"
                ] = (
                    medians[
                        index
                    ]
                )


                row[
                    f"{rank_key}_n"
                ] = (
                    sample_counts[
                        index
                    ]
                )


            rows.append(
                row
            )


        result = pd.DataFrame(
            rows
        )


        if not result.empty:

            result[
                "trend_strength"
            ] = (
                result[
                    "percent_change"
                ]
                .abs()
                *
                result[
                    "monotonicity_score"
                ]
            )


            result = (
                result
                .sort_values(
                    [
                        "role",
                        "trend_strength",
                    ],
                    ascending=[
                        True,
                        False,
                    ],
                )
            )


        OUTPUT_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )


        output_path = (
            OUTPUT_DIR
            /
            "IRON_to_CHALLENGER_trajectories.csv"
        )


        result.to_csv(
            output_path,
            index=False,
        )


        print()

        print(
            "IRON -> CHALLENGER "
            "RANK TRAJECTORIES"
        )

        print(
            "=" * 60
        )


        print(
            f"Trajectory rows: "
            f"{len(result)}"
        )


        if not result.empty:

            interesting = {
                "cs_at_10",
                "gold_at_10",
                "xp_at_10",
                "cs_per_min",
                "gold_per_min",
                "deaths",
                "kda",
            }


            preview = (
                result[
                    result[
                        "metric"
                    ]
                    .isin(
                        interesting
                    )
                ]
            )


            display_columns = [
                "role",
                "metric",
            ]


            for rank in self.RANKS:

                display_columns.append(
                    f"{rank.lower()}_p50"
                )


            display_columns.extend(
                [
                    "percent_change",
                    "monotonicity_score",
                    "direction_changes",
                    "trajectory_confidence",
                ]
            )


            print()

            print(
                preview[
                    display_columns
                ]
                .to_string(
                    index=False
                )
            )


        print()

        print(
            f"Saved: "
            f"{output_path}"
        )


        return result