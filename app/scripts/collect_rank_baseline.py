import argparse

from pathlib import Path

import pandas as pd

from app.database.database import (
    SessionLocal,
)

from app.riot.client import (
    RiotClient,
)

from app.repositories.match_repository import (
    MatchRepository,
)

from app.services.rank_sample_service import (
    RankSampleService,
)

from app.services.rank_baseline_collection_service import (
    RankBaselineCollectionService,
)


# ==================================================
# CONFIG
# ==================================================

PLATFORM = "EUW1"

REGION = "EUROPE"

DEFAULT_TARGET_PLAYERS = 60

DEFAULT_MATCHES_PER_PLAYER = 5

DEFAULT_TARGET_MATCHES = 200


# ==================================================
# OUTPUT
# ==================================================

OUTPUT_DIR = Path(
    "artifacts/rank_baseline"
)


VALID_TIERS = {
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
}


def parse_args():

    parser = argparse.ArgumentParser(
        description=(
            "Collect DiffTheory ranked "
            "baseline match samples."
        )
    )

    parser.add_argument(
        "--tier",
        required=True,
        type=str,
    )

    parser.add_argument(
        "--target-players",
        type=int,
        default=(
            DEFAULT_TARGET_PLAYERS
        ),
    )

    parser.add_argument(
        "--matches-per-player",
        type=int,
        default=(
            DEFAULT_MATCHES_PER_PLAYER
        ),
    )

    parser.add_argument(
        "--target-matches",
        type=int,
        default=(
            DEFAULT_TARGET_MATCHES
        ),
    )

    return parser.parse_args()


def main():

    args = parse_args()


    tier = (
        args.tier
        .strip()
        .upper()
    )


    if tier not in VALID_TIERS:

        raise ValueError(
            f"Unsupported tier: {tier}"
        )


    output_path = (
        OUTPUT_DIR
        / f"{tier}_rank_sample_index.csv"
    )


    db = SessionLocal()

    riot_client = RiotClient()


    try:

        # ==========================================
        # SERVICES
        # ==========================================

        sample_service = (
            RankSampleService(
                riot_client
            )
        )

        repository = (
            MatchRepository(
                db
            )
        )

        collector = (
            RankBaselineCollectionService(
                db=db,

                riot_client=
                    riot_client,

                match_repository=
                    repository,
            )
        )


        # ==========================================
        # SAMPLE RANKED PLAYERS
        # ==========================================

        print()

        print(
            f"Finding "
            f"{tier} players..."
        )


        if (
            tier
            in sample_service.STANDARD_TIERS
        ):

            players = (
                sample_service
                .collect_standard_tier_players(
                    platform=
                        PLATFORM,

                    tier=
                        tier,

                    target_players=
                        args.target_players,
                )
            )

        else:

            players = (
                sample_service
                .collect_elite_tier_players(
                    platform=
                        PLATFORM,

                    tier=
                        tier,

                    target_players=
                        args.target_players,
                )
            )


        print(
            f"Ranked players found: "
            f"{len(players)}"
        )


        if not players:

            raise RuntimeError(
                f"No ranked players "
                f"found for {tier}."
            )


        # ==========================================
        # COLLECT MATCHES
        # ==========================================

        print()

        print(
            "Collecting recent "
            "ranked matches..."
        )


        result = (
            collector
            .collect_for_players(
                players=players,

                region=
                    REGION,

                expected_platform=
                    PLATFORM,

                matches_per_player=
                    args.matches_per_player,

                target_unique_matches=
                    args.target_matches,
            )
        )


        rows = (
            result[
                "rows"
            ]
        )


        # ==========================================
        # SAVE INDEX
        # ==========================================

        OUTPUT_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )


        df = pd.DataFrame(
            rows
        )


        df.to_csv(
            output_path,
            index=False,
        )


        # ==========================================
        # REPORT
        # ==========================================

        print()

        print(
            f"{tier} "
            f"BASELINE COLLECTION"
        )

        print(
            "=" * 40
        )


        print(
            f"Players sampled: "
            f"{len(players)}"
        )

        print(
            f"Unique matches: "
            f"{result['unique_matches']}"
        )

        print(
            f"Rank-labelled rows: "
            f"{len(rows)}"
        )

        print(
            f"New matches saved: "
            f"{result['new_matches_saved']}"
        )

        print(
            f"Existing matches reused: "
            f"{result['existing_matches_reused']}"
        )

        print(
            f"Cross-platform skipped: "
            f"{result['cross_platform_skipped']}"
        )

        print(
            f"Wrong queue skipped: "
            f"{result['wrong_queue_skipped']}"
        )

        print(
            f"Failed matches: "
            f"{result['failed_matches']}"
        )


        # ==========================================
        # DISTRIBUTIONS
        # ==========================================

        if (
            not df.empty
            and
            "role"
            in df.columns
        ):

            print()

            print(
                "ROLE COUNTS"
            )

            print(
                df[
                    "role"
                ].value_counts(
                    dropna=False
                )
            )


        if (
            not df.empty
            and
            "division"
            in df.columns
        ):

            division_counts = (
                df[
                    "division"
                ]
                .dropna()
            )

            if not division_counts.empty:

                print()

                print(
                    "DIVISION COUNTS"
                )

                print(
                    division_counts
                    .value_counts(
                        dropna=False
                    )
                )


        if (
            not df.empty
            and
            "match_platform"
            in df.columns
        ):

            print()

            print(
                "MATCH PLATFORM COUNTS"
            )

            print(
                df[
                    "match_platform"
                ]
                .value_counts(
                    dropna=False
                )
            )


        print()

        print(
            f"Saved: "
            f"{output_path}"
        )


    finally:

        riot_client.close()

        db.close()


if __name__ == "__main__":

    main()