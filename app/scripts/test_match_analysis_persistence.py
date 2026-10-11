from app.database.database import (
    SessionLocal,
)

from app.repositories.analytics_repository import (
    AnalyticsRepository,
)

from app.analysis.match_analysis_persistence_service import (
    MatchAnalysisPersistenceService,
)

from app.analysis.analysis_version import (
    ANALYSIS_VERSION,
)


RIOT_ACCOUNT_ID = 1

PLAYER_RANK = "GOLD"

MATCH_LIMIT = 1


def main():

    db = SessionLocal()

    try:

        analytics_repository = (
            AnalyticsRepository(
                db
            )
        )

        persistence_service = (
            MatchAnalysisPersistenceService(
                db=db
            )
        )

        # ==================================================
        # ACCOUNT
        # ==================================================

        account_result = (
            analytics_repository
            .get_riot_account(
                RIOT_ACCOUNT_ID
            )
        )

        if account_result is None:

            raise RuntimeError(
                "Riot account not found."
            )

        riot_account, league_profile = (
            account_result
        )

        # ==================================================
        # MATCH
        # ==================================================

        match_results = (
            analytics_repository
            .get_player_matches(
                puuid=
                    riot_account.puuid,

                limit=
                    MATCH_LIMIT,
            )
        )

        if not match_results:

            raise RuntimeError(
                "No ranked matches found."
            )

        item = (
            match_results[
                0
            ]
        )

        match = (
            item[
                "match"
            ]
        )

        participant = (
            item[
                "player"
            ]
        )

        participants = (
            item[
                "participants"
            ]
        )

        # ==================================================
        # TIMELINE
        # ==================================================

        all_frames = (
            analytics_repository
            .get_timeline_frames(
                [
                    match.id
                ]
            )
        )

        all_events = (
            analytics_repository
            .get_timeline_events(
                [
                    match.id
                ]
            )
        )

        player_frames = [
            frame
            for frame in all_frames
            if (
                frame.participant_id
                ==
                participant.participant_id
            )
        ]

        match_events = [
            event
            for event in all_events
            if (
                event.match_id
                ==
                match.id
            )
        ]

        print()

        print(
            "DIFFTHEORY MATCH ANALYSIS PERSISTENCE"
        )

        print(
            "=" * 70
        )

        print(
            f"Player: "
            f"{riot_account.game_name}"
            f"#{riot_account.tag_line}"
        )

        print(
            f"Match: "
            f"{match.match_id}"
        )

        print(
            f"Analysis version: "
            f"{ANALYSIS_VERSION}"
        )

        # ==================================================
        # FIRST CALL
        # ==================================================

        print()
        print(
            "FIRST CALL"
        )

        print(
            "-" * 70
        )

        first_result = (
            persistence_service
            .get_or_analyze(
                riot_account_id=
                    riot_account.id,

                match=
                    match,

                participant=
                    participant,

                player_frames=
                    player_frames,

                all_participants=
                    participants,

                all_frames=
                    all_frames,

                events=
                    match_events,

                rank=
                    PLAYER_RANK,

                role=
                    participant.role,
            )
        )

        print(
            f"Source: "
            f"{first_result['source']}"
        )

        print(
            f"Version: "
            f"{first_result['analysis_version']}"
        )

        print(
            f"Champion: "
            f"{first_result['analysis'].get('champion')}"
        )

        print(
            f"Signals: "
            f"{len(first_result['analysis'].get('coaching_signals', []))}"
        )

        # ==================================================
        # SECOND CALL
        # ==================================================

        print()
        print(
            "SECOND CALL"
        )

        print(
            "-" * 70
        )

        second_result = (
            persistence_service
            .get_or_analyze(
                riot_account_id=
                    riot_account.id,

                match=
                    match,

                participant=
                    participant,

                player_frames=
                    player_frames,

                all_participants=
                    participants,

                all_frames=
                    all_frames,

                events=
                    match_events,

                rank=
                    PLAYER_RANK,

                role=
                    participant.role,
            )
        )

        print(
            f"Source: "
            f"{second_result['source']}"
        )

        print(
            f"Version: "
            f"{second_result['analysis_version']}"
        )

        # ==================================================
        # VERIFY CACHE
        # ==================================================

        print()
        print(
            "CACHE VERIFICATION"
        )

        print(
            "-" * 70
        )

        if (
            second_result[
                "source"
            ]
            !=
            "CACHE"
        ):

            raise RuntimeError(
                "Second call should have used cache."
            )

        print(
            "PASS: second call used cached analysis."
        )

        # ==================================================
        # RECENT CACHE
        # ==================================================

        recent = (
            persistence_service
            .get_recent_cached_analyses(
                riot_account_id=
                    riot_account.id,

                limit=
                    10,
            )
        )

        print()

        print(
            f"Cached analyses available: "
            f"{len(recent)}"
        )

    finally:

        db.close()


if __name__ == "__main__":

    main()