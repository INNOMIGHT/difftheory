from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from app.models.match import (
    Match,
)

from app.models.match_analysis import (
    MatchAnalysis,
)


class MatchAnalysisRepository:

    def __init__(
        self,
        db: Session,
    ):

        self.db = db

    # ==================================================
    # GET ONE
    # ==================================================

    def get_analysis(
        self,
        *,
        riot_account_id: int,
        match_id: int,
        analysis_version: str,
    ):

        statement = (
            select(
                MatchAnalysis
            )
            .where(
                MatchAnalysis.riot_account_id
                ==
                riot_account_id,

                MatchAnalysis.match_id
                ==
                match_id,

                MatchAnalysis.analysis_version
                ==
                analysis_version,
            )
        )

        return (
            self.db
            .execute(
                statement
            )
            .scalar_one_or_none()
        )

    # ==================================================
    # UPSERT
    # ==================================================

    def save_analysis(
        self,
        *,
        riot_account_id: int,
        match_id: int,
        participant_id: int,
        analysis_version: str,
        analysis_json: dict,
    ):

        existing = (
            self.get_analysis(
                riot_account_id=
                    riot_account_id,

                match_id=
                    match_id,

                analysis_version=
                    analysis_version,
            )
        )

        if existing is not None:

            existing.participant_id = (
                participant_id
            )

            existing.analysis_json = (
                analysis_json
            )

            self.db.add(
                existing
            )

            self.db.commit()

            self.db.refresh(
                existing
            )

            return existing

        analysis = (
            MatchAnalysis(
                riot_account_id=
                    riot_account_id,

                match_id=
                    match_id,

                participant_id=
                    participant_id,

                analysis_version=
                    analysis_version,

                analysis_json=
                    analysis_json,
            )
        )

        self.db.add(
            analysis
        )

        self.db.commit()

        self.db.refresh(
            analysis
        )

        return analysis

    # ==================================================
    # RECENT ANALYSES
    # ==================================================

    def get_recent_analyses(
        self,
        *,
        riot_account_id: int,
        analysis_version: str,
        limit: int = 10,
    ):

        statement = (
            select(
                MatchAnalysis
            )
            .join(
                Match,
                Match.id
                ==
                MatchAnalysis.match_id,
            )
            .where(
                MatchAnalysis.riot_account_id
                ==
                riot_account_id,

                MatchAnalysis.analysis_version
                ==
                analysis_version,
            )
            .order_by(
                Match.game_creation.desc()
            )
            .limit(
                limit
            )
        )

        return (
            self.db
            .execute(
                statement
            )
            .scalars()
            .all()
        )

    # ==================================================
    # COUNT
    # ==================================================

    def count_analyses(
        self,
        *,
        riot_account_id: int,
        analysis_version: str,
    ):

        analyses = (
            self.get_recent_analyses(
                riot_account_id=
                    riot_account_id,

                analysis_version=
                    analysis_version,

                limit=
                    10_000,
            )
        )

        return len(
            analyses
        )


    def get_analyses_for_match_ids(
    self,
    *,
    riot_account_id: int,
    match_ids: list[int],
    analysis_version: str,
):

        if not match_ids:
            return []

        statement = (
            select(
                MatchAnalysis
            )
            .where(
                MatchAnalysis.riot_account_id
                ==
                riot_account_id,

                MatchAnalysis.match_id.in_(
                    match_ids
                ),

                MatchAnalysis.analysis_version
                ==
                analysis_version,
            )
        )

        return (
            self.db
            .execute(
                statement
            )
            .scalars()
            .all()
        )


    def get_analysis_by_riot_match_id(
        self,
        *,
        riot_account_id: int,
        riot_match_id: str,
        analysis_version: str,
    ):

        statement = (
            select(
                MatchAnalysis
            )
            .join(
                Match,
                Match.id
                ==
                MatchAnalysis.match_id,
            )
            .where(
                MatchAnalysis.riot_account_id
                ==
                riot_account_id,

                Match.match_id
                ==
                riot_match_id,

                MatchAnalysis.analysis_version
                ==
                analysis_version,
            )
        )

        return (
            self.db
            .execute(
                statement
            )
            .scalar_one_or_none()
        )