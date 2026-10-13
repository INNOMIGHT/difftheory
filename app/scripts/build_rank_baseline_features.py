import argparse

from app.database.database import (
    SessionLocal,
)

from app.ml.participant_baseline_feature_builder import (
    ParticipantBaselineFeatureBuilder,
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


    db = SessionLocal()


    try:

        builder = (
            ParticipantBaselineFeatureBuilder(
                db
            )
        )

        builder.build(
            tier=tier
        )

    finally:

        db.close()


if __name__ == "__main__":

    main()