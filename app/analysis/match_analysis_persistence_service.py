from datetime import (
    date,
    datetime,
)

from decimal import (
    Decimal,
)

from app.analysis.analysis_version import (
    ANALYSIS_VERSION,
)

from app.analysis.match_analysis_service import (
    MatchAnalysisService,
)

from app.repositories.match_analysis_repository import (
    MatchAnalysisRepository,
)

import time

class MatchAnalysisPersistenceService:

    def __init__(
        self,
        db,
        match_analysis_service=None,
        repository=None,
    ):

        self.db = db

        self.match_analysis_service = (
            match_analysis_service
            or MatchAnalysisService(
                db=db
            )
        )

        self.repository = (
            repository
            or MatchAnalysisRepository(
                db
            )
        )

    # ==================================================
    # JSON SAFETY
    # ==================================================

    def _json_safe(
        self,
        value,
    ):
        """
        Convert values into JSON-safe Python primitives.

        This protects persistence if an analyzer later
        returns Decimal, datetime or numpy-like scalar
        values.
        """

        if value is None:

            return None

        if isinstance(
            value,
            (
                str,
                int,
                float,
                bool,
            ),
        ):

            return value

        if isinstance(
            value,
            Decimal,
        ):

            return float(
                value
            )

        if isinstance(
            value,
            (
                datetime,
                date,
            ),
        ):

            return value.isoformat()

        if isinstance(
            value,
            dict,
        ):

            return {
                str(
                    key
                ):
                    self._json_safe(
                        item
                    )

                for (
                    key,
                    item,
                ) in value.items()
            }

        if isinstance(
            value,
            (
                list,
                tuple,
                set,
            ),
        ):

            return [
                self._json_safe(
                    item
                )
                for item in value
            ]

        # Handles numpy scalars such as:
        #
        # np.float64
        # np.int64
        #
        # without introducing numpy as a dependency.

        item_method = getattr(
            value,
            "item",
            None,
        )

        if callable(
            item_method
        ):

            try:

                return self._json_safe(
                    item_method()
                )

            except Exception:
                pass

        return str(
            value
        )

    # ==================================================
    # CACHE LOOKUP
    # ==================================================

    def get_cached_analysis(
        self,
        *,
        riot_account_id,
        match_id,
    ):

        stored = (
            self.repository
            .get_analysis(
                riot_account_id=
                    riot_account_id,

                match_id=
                    match_id,

                analysis_version=
                    ANALYSIS_VERSION,
            )
        )

        if stored is None:

            return None

        return stored.analysis_json

    # ==================================================
    # GET OR ANALYZE
    # ==================================================

    def get_or_analyze(
        self,
        *,
        riot_account_id,
        match,
        participant,
        player_frames,
        all_participants,
        all_frames,
        events,
        rank=None,
        role=None,
        force=False,
    ):

        total_started = (
            time.perf_counter()
        )

        timings = {}

        # ==================================================
        # CACHE LOOKUP
        # ==================================================

        if not force:

            started = (
                time.perf_counter()
            )

            cached = (
                self.get_cached_analysis(
                    riot_account_id=
                        riot_account_id,

                    match_id=
                        match.id,
                )
            )

            timings[
                "cache_lookup"
            ] = (
                time.perf_counter()
                - started
            )

            if cached is not None:

                timings[
                    "TOTAL_GET_OR_ANALYZE"
                ] = (
                    time.perf_counter()
                    - total_started
                )

                print()
                print(
                    "PERSISTENCE PERFORMANCE"
                )

                print(
                    "-" * 70
                )

                for (
                    name,
                    seconds,
                ) in sorted(
                    timings.items(),
                    key=lambda item:
                        item[1],
                    reverse=True,
                ):

                    print(
                        f"{name:<42}"
                        f"{seconds:>12.3f}s"
                    )

                print(
                    "-" * 70
                )

                return {
                    "source":
                        "CACHE",

                    "analysis_version":
                        ANALYSIS_VERSION,

                    "analysis":
                        cached,
                }

        # ==================================================
        # MATCH ANALYSIS
        # ==================================================

        started = (
            time.perf_counter()
        )

        analysis = (
            self.match_analysis_service
            .analyze_match(
                match=
                    match,

                participant=
                    participant,

                player_frames=
                    player_frames,

                all_participants=
                    all_participants,

                all_frames=
                    all_frames,

                events=
                    events,

                rank=
                    rank,

                role=
                    role,
            )
        )

        timings[
            "match_analysis"
        ] = (
            time.perf_counter()
            - started
        )

        # ==================================================
        # ADD VERSION
        # ==================================================

        analysis[
            "analysis_version"
        ] = (
            ANALYSIS_VERSION
        )

        # ==================================================
        # JSON NORMALIZATION
        # ==================================================

        started = (
            time.perf_counter()
        )

        safe_analysis = (
            self._json_safe(
                analysis
            )
        )

        timings[
            "json_safe_conversion"
        ] = (
            time.perf_counter()
            - started
        )

        # ==================================================
        # DATABASE SAVE
        # ==================================================

        started = (
            time.perf_counter()
        )

        self.repository.save_analysis(
            riot_account_id=
                riot_account_id,

            match_id=
                match.id,

            participant_id=
                participant.participant_id,

            analysis_version=
                ANALYSIS_VERSION,

            analysis_json=
                safe_analysis,
        )

        timings[
            "database_save"
        ] = (
            time.perf_counter()
            - started
        )

        # ==================================================
        # TOTAL
        # ==================================================

        timings[
            "TOTAL_GET_OR_ANALYZE"
        ] = (
            time.perf_counter()
            - total_started
        )

        print()
        print(
            "PERSISTENCE PERFORMANCE"
        )

        print(
            "-" * 70
        )

        for (
            name,
            seconds,
        ) in sorted(
            timings.items(),
            key=lambda item:
                item[1],
            reverse=True,
        ):

            print(
                f"{name:<42}"
                f"{seconds:>12.3f}s"
            )

        print(
            "-" * 70
        )

        return {
            "source":
                "GENERATED",

            "analysis_version":
                ANALYSIS_VERSION,

            "analysis":
                safe_analysis,
        }
    # ==================================================
    # RECENT CACHED ANALYSES
    # ==================================================

    def get_recent_cached_analyses(
        self,
        *,
        riot_account_id,
        limit=10,
    ):

        rows = (
            self.repository
            .get_recent_analyses(
                riot_account_id=
                    riot_account_id,

                analysis_version=
                    ANALYSIS_VERSION,

                limit=
                    limit,
            )
        )

        return [
            row.analysis_json
            for row in rows
        ]