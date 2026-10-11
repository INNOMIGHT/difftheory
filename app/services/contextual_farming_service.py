from app.repositories.analytics_repository import (
    AnalyticsRepository,
)


class ContextualFarmingService:

    # Timeline frames are normally approximately
    # 60 seconds apart.

    MIN_INTERVAL_MS = 30_000
    MAX_INTERVAL_MS = 120_000

    OBJECTIVE_EVENT_TYPES = {
        "ELITE_MONSTER_KILL",
        "BUILDING_KILL",
        "TURRET_PLATE_DESTROYED",
    }

    def __init__(
        self,
        db,
    ):

        self.repository = (
            AnalyticsRepository(
                db
            )
        )

    # ==================================================
    # BASIC HELPERS
    # ==================================================

    @staticmethod
    def _safe_delta(
        current,
        previous,
    ):
        """
        Return a counter difference only when both
        values exist and the counter has not decreased.
        """

        if (
            current is None
            or previous is None
        ):

            return None

        delta = (
            current
            - previous
        )

        if delta < 0:
            return None

        return delta

    @staticmethod
    def _get_total_cs(
        frame,
    ):

        if frame is None:
            return None

        lane_cs = (
            frame.minions_killed
        )

        jungle_cs = (
            frame.jungle_minions_killed
        )

        if (
            lane_cs is None
            and jungle_cs is None
        ):

            return None

        return (
            (lane_cs or 0)
            +
            (jungle_cs or 0)
        )

    # ==================================================
    # EVENT NORMALIZATION
    # ==================================================

    @staticmethod
    def _get_event_assists(
        event,
    ):

        raw_data = (
            event.raw_data
            or {}
        )

        assists = (
            raw_data.get(
                "assistingParticipantIds",
                [],
            )
        )

        if not isinstance(
            assists,
            list,
        ):

            return []

        return assists

    @staticmethod
    def _get_event_killer(
        event,
    ):

        killer_id = (
            event.killer_id
        )

        if killer_id is not None:
            return killer_id

        raw_data = (
            event.raw_data
            or {}
        )

        return (
            raw_data.get(
                "killerId"
            )
        )

    @classmethod
    def _build_event_summary(
        cls,
        event,
        participant_id,
    ):
        """
        Normalize a relevant timeline event ONCE.

        This prevents us from repeatedly touching
        event.raw_data during every interval scan.
        """

        timestamp_ms = (
            event.timestamp_ms
        )

        event_type = (
            event.event_type
        )

        if timestamp_ms is None:
            return None

        # ==========================================
        # CHAMPION KILL
        # ==========================================

        if (
            event_type
            ==
            "CHAMPION_KILL"
        ):

            assists = (
                cls._get_event_assists(
                    event
                )
            )

            return {
                "timestamp_ms":
                    timestamp_ms,

                "kills":
                    (
                        1
                        if (
                            event.killer_id
                            ==
                            participant_id
                        )
                        else 0
                    ),

                "deaths":
                    (
                        1
                        if (
                            event.victim_id
                            ==
                            participant_id
                        )
                        else 0
                    ),

                "assists":
                    (
                        1
                        if (
                            participant_id
                            in assists
                        )
                        else 0
                    ),

                "objective_participations":
                    0,

                "dragon_participations":
                    0,

                "building_participations":
                    0,

                "turret_plate_participations":
                    0,
            }

        # ==========================================
        # OBJECTIVES
        # ==========================================

        if (
            event_type
            not in
            cls.OBJECTIVE_EVENT_TYPES
        ):

            return None

        raw_data = (
            event.raw_data
            or {}
        )

        assists = (
            raw_data.get(
                "assistingParticipantIds",
                [],
            )
        )

        if not isinstance(
            assists,
            list,
        ):

            assists = []

        killer_id = (
            event.killer_id
        )

        if killer_id is None:

            killer_id = (
                raw_data.get(
                    "killerId"
                )
            )

        player_involved = (
            killer_id
            ==
            participant_id

            or

            participant_id
            in assists

            or

            event.participant_id
            ==
            participant_id
        )

        if not player_involved:
            return None

        dragon = (
            event_type
            ==
            "ELITE_MONSTER_KILL"

            and

            raw_data.get(
                "monsterType"
            )
            ==
            "DRAGON"
        )

        building = (
            event_type
            ==
            "BUILDING_KILL"
        )

        plate = (
            event_type
            ==
            "TURRET_PLATE_DESTROYED"
        )

        return {
            "timestamp_ms":
                timestamp_ms,

            "kills":
                0,

            "deaths":
                0,

            "assists":
                0,

            "objective_participations":
                1,

            "dragon_participations":
                (
                    1
                    if dragon
                    else 0
                ),

            "building_participations":
                (
                    1
                    if building
                    else 0
                ),

            "turret_plate_participations":
                (
                    1
                    if plate
                    else 0
                ),
        }

    @classmethod
    def _prepare_player_events(
        cls,
        events,
        participant_id,
    ):
        """
        Convert raw SQLAlchemy event objects into a tiny
        list of player-relevant primitive dictionaries.

        Each raw event is inspected exactly once.
        """

        player_events = []

        for event in (
            events
            or []
        ):

            # Reject irrelevant types before touching
            # raw_data.

            if (
                event.event_type
                !=
                "CHAMPION_KILL"

                and

                event.event_type
                not in
                cls.OBJECTIVE_EVENT_TYPES
            ):

                continue

            summary = (
                cls._build_event_summary(
                    event,
                    participant_id,
                )
            )

            if summary is None:
                continue

            # Keep champion-kill rows only if the
            # player actually participated.

            if (
                event.event_type
                ==
                "CHAMPION_KILL"
            ):

                participated = (
                    summary[
                        "kills"
                    ]
                    > 0

                    or

                    summary[
                        "deaths"
                    ]
                    > 0

                    or

                    summary[
                        "assists"
                    ]
                    > 0
                )

                if not participated:
                    continue

            player_events.append(
                summary
            )

        player_events.sort(
            key=lambda event:
                event[
                    "timestamp_ms"
                ]
        )

        return player_events

    # ==================================================
    # EVENT COUNTS
    # ==================================================

    @staticmethod
    def _empty_event_counts():

        return {
            "kills": 0,
            "deaths": 0,
            "assists": 0,
            "objective_participations": 0,
            "dragon_participations": 0,
            "building_participations": 0,
            "turret_plate_participations": 0,
        }

    @classmethod
    def _add_event_to_counts(
        cls,
        counts,
        event,
    ):

        counts[
            "kills"
        ] += (
            event[
                "kills"
            ]
        )

        counts[
            "deaths"
        ] += (
            event[
                "deaths"
            ]
        )

        counts[
            "assists"
        ] += (
            event[
                "assists"
            ]
        )

        counts[
            "objective_participations"
        ] += (
            event[
                "objective_participations"
            ]
        )

        counts[
            "dragon_participations"
        ] += (
            event[
                "dragon_participations"
            ]
        )

        counts[
            "building_participations"
        ] += (
            event[
                "building_participations"
            ]
        )

        counts[
            "turret_plate_participations"
        ] += (
            event[
                "turret_plate_participations"
            ]
        )

    # ==================================================
    # MATCH INTERVAL EXTRACTION
    # ==================================================

    def _extract_match_intervals(
        self,
        match,
        player,
        frames,
        events,
    ):

        frames = sorted(
            frames,
            key=lambda frame:
                frame.timestamp_ms,
        )

        # ==========================================
        # NORMALIZE EVENTS ONCE
        # ==========================================

        player_events = (
            self._prepare_player_events(
                events=
                    events,

                participant_id=
                    player.participant_id,
            )
        )

        intervals = []
        skipped_intervals = []

        # This cursor only moves forward.
        #
        # Old implementation scanned every event
        # again for every frame interval.
        #
        # New complexity:
        #
        # O(frames + relevant_events)

        event_index = 0

        event_count = (
            len(
                player_events
            )
        )

        # ==================================================
        # FRAME INTERVALS
        # ==================================================

        for index in range(
            1,
            len(
                frames
            ),
        ):

            previous = (
                frames[
                    index - 1
                ]
            )

            current = (
                frames[
                    index
                ]
            )

            start_ms = (
                previous.timestamp_ms
            )

            end_ms = (
                current.timestamp_ms
            )

            elapsed_ms = (
                end_ms
                - start_ms
            )

            # ==========================================
            # ADVANCE EVENT CURSOR PAST OLD EVENTS
            # ==========================================

            while (
                event_index
                <
                event_count

                and

                player_events[
                    event_index
                ][
                    "timestamp_ms"
                ]
                <= start_ms
            ):

                event_index += 1

            # ==========================================
            # INVALID INTERVALS
            # ==========================================

            if (
                elapsed_ms
                <
                self.MIN_INTERVAL_MS
            ):

                skipped_intervals.append({
                    "reason":
                        "interval_too_short",

                    "start_ms":
                        start_ms,

                    "end_ms":
                        end_ms,

                    "elapsed_ms":
                        elapsed_ms,
                })

                # Events inside a skipped interval
                # should not leak into a later interval.

                while (
                    event_index
                    <
                    event_count

                    and

                    player_events[
                        event_index
                    ][
                        "timestamp_ms"
                    ]
                    <= end_ms
                ):

                    event_index += 1

                continue

            if (
                elapsed_ms
                >
                self.MAX_INTERVAL_MS
            ):

                skipped_intervals.append({
                    "reason":
                        "interval_too_long",

                    "start_ms":
                        start_ms,

                    "end_ms":
                        end_ms,

                    "elapsed_ms":
                        elapsed_ms,
                })

                while (
                    event_index
                    <
                    event_count

                    and

                    player_events[
                        event_index
                    ][
                        "timestamp_ms"
                    ]
                    <= end_ms
                ):

                    event_index += 1

                continue

            # ==========================================
            # FARM / ECONOMY DELTAS
            # ==========================================

            previous_cs = (
                self._get_total_cs(
                    previous
                )
            )

            current_cs = (
                self._get_total_cs(
                    current
                )
            )

            cs_delta = (
                self._safe_delta(
                    current_cs,
                    previous_cs,
                )
            )

            lane_cs_delta = (
                self._safe_delta(
                    current.minions_killed,
                    previous.minions_killed,
                )
            )

            jungle_cs_delta = (
                self._safe_delta(
                    current.jungle_minions_killed,
                    previous.jungle_minions_killed,
                )
            )

            gold_delta = (
                self._safe_delta(
                    current.total_gold,
                    previous.total_gold,
                )
            )

            xp_delta = (
                self._safe_delta(
                    current.xp,
                    previous.xp,
                )
            )

            elapsed_minutes = (
                elapsed_ms
                / 60_000
            )

            cs_per_minute = (
                round(
                    cs_delta
                    / elapsed_minutes,
                    2,
                )
                if (
                    cs_delta
                    is not None
                )
                else None
            )

            # ==========================================
            # EVENT COUNTS
            # ==========================================

            interval_events = (
                self._empty_event_counts()
            )

            while (
                event_index
                <
                event_count
            ):

                player_event = (
                    player_events[
                        event_index
                    ]
                )

                event_timestamp = (
                    player_event[
                        "timestamp_ms"
                    ]
                )

                if (
                    event_timestamp
                    >
                    end_ms
                ):

                    break

                self._add_event_to_counts(
                    interval_events,
                    player_event,
                )

                event_index += 1

            # ==========================================
            # INTERVAL
            # ==========================================

            intervals.append({

                "match_id":
                    match.match_id,

                "game_version":
                    match.game_version,

                "champion":
                    player.champion_name,

                "role":
                    player.role,

                "participant_id":
                    player.participant_id,

                "start_minute":
                    round(
                        start_ms
                        / 60_000,
                        2,
                    ),

                "end_minute":
                    round(
                        end_ms
                        / 60_000,
                        2,
                    ),

                "elapsed_seconds":
                    round(
                        elapsed_ms
                        / 1000,
                        2,
                    ),

                "cs_start":
                    previous_cs,

                "cs_end":
                    current_cs,

                "cs_delta":
                    cs_delta,

                "lane_cs_delta":
                    lane_cs_delta,

                "jungle_cs_delta":
                    jungle_cs_delta,

                "cs_per_minute":
                    cs_per_minute,

                "gold_delta":
                    gold_delta,

                "xp_delta":
                    xp_delta,

                "level_start":
                    previous.level,

                "level_end":
                    current.level,

                "data_quality": {
                    "valid_cs_delta":
                        cs_delta
                        is not None,

                    "valid_gold_delta":
                        gold_delta
                        is not None,

                    "valid_xp_delta":
                        xp_delta
                        is not None,
                },

                "events":
                    interval_events,
            })

        return (
            intervals,
            skipped_intervals,
        )

    # ==================================================
    # PUBLIC SINGLE-MATCH INTERFACE
    # ==================================================

    def extract_match_intervals(
        self,
        match,
        player,
        frames,
        events,
    ):
        """
        Reusable single-match interval extraction.

        Does not write to the database.
        """

        return (
            self._extract_match_intervals(
                match=
                    match,

                player=
                    player,

                frames=
                    frames,

                events=
                    events,
            )
        )

    # ==================================================
    # PLAYER MULTI-MATCH INTERFACE
    # ==================================================

    def get_player_interval_features(
        self,
        riot_account_id: int,
        limit: int = 10,
    ):

        account_data = (
            self.repository
            .get_riot_account(
                riot_account_id
            )
        )

        if account_data is None:
            return None

        riot_account, league_profile = (
            account_data
        )

        records = (
            self.repository
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

                "matches_analyzed":
                    0,

                "total_intervals":
                    0,

                "intervals":
                    [],

                "skipped_intervals":
                    [],
            }

        match_ids = [
            record[
                "match"
            ].id
            for record in records
        ]

        all_frames = (
            self.repository
            .get_timeline_frames(
                match_ids
            )
        )

        all_events = (
            self.repository
            .get_timeline_events(
                match_ids
            )
        )

        # ==================================================
        # GROUP FRAMES
        # ==================================================

        frames_by_match_participant = {}

        for frame in (
            all_frames
        ):

            key = (
                frame.match_id,
                frame.participant_id,
            )

            frames_by_match_participant.setdefault(
                key,
                [],
            ).append(
                frame
            )

        # ==================================================
        # GROUP EVENTS
        # ==================================================

        events_by_match = {}

        for event in (
            all_events
        ):

            events_by_match.setdefault(
                event.match_id,
                [],
            ).append(
                event
            )

        all_intervals = []
        all_skipped_intervals = []

        matches_with_frames = 0

        # ==================================================
        # ANALYZE MATCHES
        # ==================================================

        for record in (
            records
        ):

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

            key = (
                match.id,
                player.participant_id,
            )

            frames = (
                frames_by_match_participant
                .get(
                    key,
                    [],
                )
            )

            events = (
                events_by_match
                .get(
                    match.id,
                    [],
                )
            )

            if len(
                frames
            ) < 2:

                continue

            matches_with_frames += 1

            (
                intervals,
                skipped,
            ) = (
                self._extract_match_intervals(
                    match=
                        match,

                    player=
                        player,

                    frames=
                        frames,

                    events=
                        events,
                )
            )

            all_intervals.extend(
                intervals
            )

            all_skipped_intervals.extend(
                skipped
            )

        return {
            "riot_account_id":
                riot_account_id,

            "matches_analyzed":
                matches_with_frames,

            "total_intervals":
                len(
                    all_intervals
                ),

            "intervals":
                all_intervals,

            "skipped_intervals":
                all_skipped_intervals,
        }