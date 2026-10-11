from app.analysis.analysis_version import (
    ANALYSIS_VERSION,
)

from app.analysis.match_analysis_persistence_service import (
    MatchAnalysisPersistenceService,
)

from app.analysis.player_coaching_service import (
    PlayerCoachingService,
)

from app.repositories.analytics_repository import (
    AnalyticsRepository,
)

from app.repositories.match_analysis_repository import (
    MatchAnalysisRepository,
)


class CoachingApiService:

    def __init__(
        self,
        db,
    ):

        self.db = db

        self.analytics_repository = (
            AnalyticsRepository(
                db
            )
        )

        self.match_analysis_repository = (
            MatchAnalysisRepository(
                db
            )
        )

        self.persistence_service = (
            MatchAnalysisPersistenceService(
                db=db
            )
        )

        self.player_coaching_service = (
            PlayerCoachingService()
        )

    # ==========================================================
    # ACCOUNT
    # ==========================================================

    def _get_account_data(
        self,
        riot_account_id,
    ):

        account_data = (
            self.analytics_repository
            .get_riot_account(
                riot_account_id
            )
        )

        if account_data is None:

            raise ValueError(
                "Riot account or linked League profile not found"
            )

        riot_account, league_profile = (
            account_data
        )

        return (
            riot_account,
            league_profile,
        )

    # ==========================================================
    # RANK
    # ==========================================================

    @staticmethod
    def _get_player_rank(
        league_profile,
    ):

        if league_profile is None:
            return None

        rank = (
            getattr(
                league_profile,
                "tier",
                None,
            )
        )

        if not rank:
            return None

        return (
            str(
                rank
            )
            .upper()
        )

    # ==========================================================
    # COACHING OVERVIEW
    # ==========================================================

    def get_player_coaching(
        self,
        *,
        riot_account_id,
        limit=10,
    ):

        riot_account, league_profile = (
            self._get_account_data(
                riot_account_id
            )
        )

        cached_rows = (
            self.match_analysis_repository
            .get_recent_analyses(
                riot_account_id=
                    riot_account_id,

                analysis_version=
                    ANALYSIS_VERSION,

                limit=
                    limit,
            )
        )

        if not cached_rows:

            raise ValueError(
                "No cached DiffTheory analyses are available. "
                "Refresh the player's analyses first."
            )

        analyses = [
            row.analysis_json
            for row in cached_rows
        ]

        player_rank = (
            self._get_player_rank(
                league_profile
            )
        )

        coaching = (
            self.player_coaching_service
            .build(
                analyses,
                current_rank=player_rank,
            )
        )

        return {
            "riot_account_id":
                riot_account_id,

            "game_name":
                getattr(
                    riot_account,
                    "game_name",
                    None,
                ),

            "tag_line":
                getattr(
                    riot_account,
                    "tag_line",
                    None,
                ),
            "rank":
                player_rank,

            "analysis_version":
                ANALYSIS_VERSION,

            "cached_matches":
                len(
                    analyses
                ),

            "coaching":
                coaching,
        }

    # ==========================================================
    # MATCH LIST
    # ==========================================================

    def get_player_matches(
        self,
        *,
        riot_account_id,
        limit=10,
    ):

        riot_account, _ = (
            self._get_account_data(
                riot_account_id
            )
        )

        records = (
            self.analytics_repository
            .get_player_matches(
                puuid=
                    riot_account.puuid,

                limit=
                    limit,
            )
        )

        if not records:

            return {
                "riot_account_id":
                    riot_account_id,

                "analysis_version":
                    ANALYSIS_VERSION,

                "matches":
                    [],
            }

        internal_match_ids = [
            record[
                "match"
            ].id
            for record in records
        ]

        cached_rows = (
            self.match_analysis_repository
            .get_analyses_for_match_ids(
                riot_account_id=
                    riot_account_id,

                match_ids=
                    internal_match_ids,

                analysis_version=
                    ANALYSIS_VERSION,
            )
        )

        cached_by_match_id = {
            row.match_id:
                row
            for row in cached_rows
        }

        matches = []

        for record in records:

            match = (
                record[
                    "match"
                ]
            )

            player = (
                record[
                    "player"
                ]
            )

            cached = (
                cached_by_match_id.get(
                    match.id
                )
            )

            matches.append({
                "match_id":
                    match.match_id,

                "internal_match_id":
                    match.id,

                "game_creation":
                    getattr(
                        match,
                        "game_creation",
                        None,
                    ),

                "game_duration":
                    getattr(
                        match,
                        "game_duration",
                        None,
                    ),

                "champion":
                    getattr(
                        player,
                        "champion_name",
                        None,
                    ),

                "role":
                    getattr(
                        player,
                        "role",
                        None,
                    ),

                "win":
                    bool(
                        getattr(
                            player,
                            "win",
                            False,
                        )
                    ),

                "kills":
                    getattr(
                        player,
                        "kills",
                        0,
                    )
                    or 0,

                "deaths":
                    getattr(
                        player,
                        "deaths",
                        0,
                    )
                    or 0,

                "assists":
                    getattr(
                        player,
                        "assists",
                        0,
                    )
                    or 0,

                "analysis_cached":
                    cached
                    is not None,

                "analysis_version":
                    (
                        cached.analysis_version
                        if cached
                        else None
                    ),
            })

        return {
            "riot_account_id":
                riot_account_id,

            "analysis_version":
                ANALYSIS_VERSION,

            "matches":
                matches,
        }

    # ==========================================================
    # INDIVIDUAL MATCH
    # ==========================================================

    def get_match_analysis(
        self,
        *,
        riot_account_id,
        riot_match_id,
    ):

        self._get_account_data(
            riot_account_id
        )

        row = (
            self.match_analysis_repository
            .get_analysis_by_riot_match_id(
                riot_account_id=
                    riot_account_id,

                riot_match_id=
                    riot_match_id,

                analysis_version=
                    ANALYSIS_VERSION,
            )
        )

        if row is None:

            raise ValueError(
                "Cached DiffTheory analysis not found for this match"
            )

        return {
            "riot_account_id":
                riot_account_id,

            "match_id":
                riot_match_id,

            "analysis_version":
                row.analysis_version,

            "analysis":
                row.analysis_json,
        }

    # ==========================================================
    # REFRESH
    # ==========================================================

    def refresh_player_analyses(
        self,
        *,
        riot_account_id,
        limit=10,
        force=False,
    ):

        riot_account, league_profile = (
            self._get_account_data(
                riot_account_id
            )
        )

        player_rank = (
            self._get_player_rank(
                league_profile
            )
        )

        records = (
            self.analytics_repository
            .get_player_matches(
                puuid=
                    riot_account.puuid,

                limit=
                    limit,
            )
        )

        if not records:

            return {
                "riot_account_id":
                    riot_account_id,

                "analysis_version":
                    ANALYSIS_VERSION,

                "matches_processed":
                    0,

                "generated":
                    0,

                "cached":
                    0,

                "results":
                    [],
            }

        # ==================================================
        # LOAD TIMELINES ONCE
        # ==================================================

        match_ids = [
            record[
                "match"
            ].id
            for record in records
        ]

        all_frames = (
            self.analytics_repository
            .get_timeline_frames(
                match_ids
            )
        )

        all_events = (
            self.analytics_repository
            .get_timeline_events(
                match_ids
            )
        )

        # ==================================================
        # GROUP FRAMES
        # ==================================================

        frames_by_match = {}

        player_frames_by_match_participant = {}

        for frame in all_frames:

            frames_by_match.setdefault(
                frame.match_id,
                [],
            ).append(
                frame
            )

            player_key = (
                frame.match_id,
                frame.participant_id,
            )

            player_frames_by_match_participant.setdefault(
                player_key,
                [],
            ).append(
                frame
            )

        # ==================================================
        # GROUP EVENTS
        # ==================================================

        events_by_match = {}

        for event in all_events:

            events_by_match.setdefault(
                event.match_id,
                [],
            ).append(
                event
            )

        # ==================================================
        # PROCESS MATCHES
        # ==================================================

        generated = 0
        cached = 0

        results = []

        analyses = []

        for record in records:

            match = (
                record[
                    "match"
                ]
            )

            player = (
                record[
                    "player"
                ]
            )

            participants = (
                record[
                    "participants"
                ]
            )

            player_key = (
                match.id,
                player.participant_id,
            )

            player_frames = (
                player_frames_by_match_participant
                .get(
                    player_key,
                    [],
                )
            )

            match_frames = (
                frames_by_match.get(
                    match.id,
                    [],
                )
            )

            match_events = (
                events_by_match.get(
                    match.id,
                    [],
                )
            )

            result = (
                self.persistence_service
                .get_or_analyze(
                    riot_account_id=
                        riot_account_id,

                    match=
                        match,

                    participant=
                        player,

                    player_frames=
                        player_frames,

                    all_participants=
                        participants,

                    all_frames=
                        match_frames,

                    events=
                        match_events,

                    rank=
                        player_rank,

                    role=
                        getattr(
                            player,
                            "role",
                            None,
                        ),

                    force=
                        force,
                )
            )

            source = (
                result[
                    "source"
                ]
            )

            if source == "GENERATED":

                generated += 1

            else:

                cached += 1

            analysis = (
                result[
                    "analysis"
                ]
            )

            analyses.append(
                analysis
            )

            results.append({
                "match_id":
                    match.match_id,

                "champion":
                    getattr(
                        player,
                        "champion_name",
                        None,
                    ),

                "role":
                    getattr(
                        player,
                        "role",
                        None,
                    ),

                "win":
                    bool(
                        getattr(
                            player,
                            "win",
                            False,
                        )
                    ),

                "source":
                    source,

                "coaching_signal_count":
                    len(
                        analysis.get(
                            "coaching_signals",
                            [],
                        )
                    ),
            })

        # ==================================================
        # CURRENT PLAYER PROFILE
        # ==================================================

        coaching = (
            self.player_coaching_service
            .build(
                analyses,
                current_rank=player_rank,
            )
        )

        return {
            "riot_account_id":
                riot_account_id,

            "rank":
                player_rank,

            "analysis_version":
                ANALYSIS_VERSION,

            "matches_processed":
                len(
                    results
                ),

            "generated":
                generated,

            "cached":
                cached,

            "results":
                results,

            "coaching":
                coaching,
        }