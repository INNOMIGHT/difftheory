import argparse

from app.ml.rank_baseline_statistics_builder import (
    RankBaselineStatisticsBuilder,
)


def parse_args():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--tier",
        required=True,
    )

    return parser.parse_args()


def main():

    args = parse_args()

    tier = (
        args.tier
        .strip()
        .upper()
    )


    builder = (
        RankBaselineStatisticsBuilder()
    )

    builder.build(
        tier=tier
    )


if __name__ == "__main__":

    main()