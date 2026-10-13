import argparse

from app.ml.rank_comparison_builder import (
    RankComparisonBuilder,
)


def parse_args():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--lower",
        required=True,
    )

    parser.add_argument(
        "--higher",
        required=True,
    )

    return parser.parse_args()


def main():

    args = parse_args()


    lower_rank = (
        args.lower
        .strip()
        .upper()
    )

    higher_rank = (
        args.higher
        .strip()
        .upper()
    )


    builder = (
        RankComparisonBuilder()
    )


    builder.build(
        lower_rank=
            lower_rank,

        higher_rank=
            higher_rank,
    )


if __name__ == "__main__":

    main()