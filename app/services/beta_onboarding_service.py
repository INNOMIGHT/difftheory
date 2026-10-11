from sqlalchemy.orm import Session

from app.models.league_profile import LeagueProfile
from app.models.riot_account import RiotAccount

from app.repositories.match_repository import (
    MatchRepository,
)

from app.riot.client import (
    RiotClient,
)

from app.services.coaching_api_service import (
    CoachingApiService,
)


class BetaOnboardingService:

    DEFAULT_MATCH_LIMIT = 10


    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.match_repository = (
            MatchRepository(
                db
            )
        )

        self.coaching_api_service = (
            CoachingApiService(
                db
            )
        )


    def onboard_user(
        self,
        *,
        user_id: int,
        limit: int = DEFAULT_MATCH_LIMIT,
    ) -> dict:

        if (
            limit < 1
            or limit > 20
        ):
            raise ValueError(
                "limit must be between 1 and 20."
            )

        riot_account = (
            self.db.query(
                RiotAccount
            )
            .filter(
                RiotAccount.user_id
                == user_id
            )
            .order_by(
                RiotAccount.id.asc()
            )
            .first()
        )

        if not riot_account:
            raise ValueError(
                "No Riot account is linked "
                "to this DiffTheory user."
            )

        league_profile = (
            self.db.query(
                LeagueProfile
            )
            .filter(
                LeagueProfile.riot_account_id
                == riot_account.id
            )
            .first()
        )

        if not league_profile:
            raise ValueError(
                "League profile not found."
            )

        region = (
            league_profile.region.upper()
        )

        result = {
            "riot_account_id":
                riot_account.id,

            "game_name":
                riot_account.game_name,

            "tag_line":
                riot_account.tag_line,

            "platform":
                league_profile.platform,

            "region":
                region,

            "requested_matches":
                limit,

            "match_ids_found":
                0,

            "new_matches_saved":
                0,

            "existing_matches":
                0,

            "failed_matches":
                [],

            "analysis":
                None,
        }


        # ==================================================
        # FETCH CURRENT PLAYER'S LATEST RANKED MATCH IDS
        # ==================================================

        with RiotClient() as riot:

            match_ids = (
                riot.get_ranked_match_ids(
                    puuid=riot_account.puuid,
                    region=region,
                    start=0,
                    count=limit,
                    queue=420,
                )
            )

            result[
                "match_ids_found"
            ] = len(
                match_ids
            )


            # ==================================================
            # STORE ANY MATCHES WE DO NOT ALREADY HAVE
            # ==================================================

            for match_id in match_ids:

                existing_match = (
                    self.match_repository
                    .get_by_match_id(
                        match_id
                    )
                )

                if existing_match:

                    result[
                        "existing_matches"
                    ] += 1

                    continue

                try:

                    match_data = (
                        riot.get_match_by_id(
                            match_id=match_id,
                            region=region,
                        )
                    )

                    if (
                        match_data[
                            "info"
                        ].get(
                            "queueId"
                        )
                        != 420
                    ):
                        continue

                    timeline_data = (
                        riot.get_match_timeline(
                            match_id=match_id,
                            region=region,
                        )
                    )

                    self.match_repository.save_match(
                        match_data=match_data,
                        timeline_data=timeline_data,
                    )

                    self.db.commit()

                    result[
                        "new_matches_saved"
                    ] += 1

                except Exception as exc:

                    self.db.rollback()

                    result[
                        "failed_matches"
                    ].append({
                        "match_id":
                            match_id,

                        "error":
                            str(
                                exc
                            ),
                    })


        # ==================================================
        # BUILD / REFRESH DIFFTHEORY ANALYSES
        # ==================================================

        analysis_result = (
            self.coaching_api_service
            .refresh_player_analyses(
                riot_account_id=(
                    riot_account.id
                ),
                limit=limit,
                force=False,
            )
        )

        result[
            "analysis"
        ] = analysis_result

        return result