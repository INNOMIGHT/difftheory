import time

from app.analysis.performance_analyzer import (
    PerformanceAnalyzer,
)

from app.analysis.critical_moment_analyzer import (
    CriticalMomentAnalyzer,
)

from app.analysis.positive_moment_analyzer import (
    PositiveMomentAnalyzer,
)

from app.analysis.impact_summary import (
    ImpactSummary,
)

from app.analysis.recommendation_engine import (
    RecommendationEngine,
)

from app.analysis.loss_context_analyzer import (
    LossContextAnalyzer,
)

from app.analysis.coaching_signal_adapter import (
    CoachingSignalAdapter,
)

from app.analysis.role_rank_performance_analyzer import (
    RoleRankPerformanceAnalyzer,
)

from app.services.contextual_farming_service import (
    ContextualFarmingService,
)

from app.services.farming_disruption_detector import (
    FarmingDisruptionDetector,
)

from app.services.economy_efficiency_detector import (
    EconomyEfficiencyDetector,
)

from app.services.economic_disruption_detector import (
    EconomicDisruptionDetector,
)

from app.services.death_pattern_detector import (
    DeathPatternDetector,
)


class MatchAnalysisService:

    def __init__(
        self,
        db=None,
        performance_analyzer=None,
        critical_moment_analyzer=None,
        positive_moment_analyzer=None,
        impact_summary=None,
        recommendation_engine=None,
        loss_context_analyzer=None,
        coaching_signal_adapter=None,
        role_rank_performance_analyzer=None,
        contextual_farming_service=None,
        farming_disruption_detector=None,
        economy_efficiency_detector=None,
        economic_disruption_detector=None,
        death_pattern_detector=None,
        debug_timings=True,
    ):

        self.db = db

        # ==================================================
        # DEBUG
        # ==================================================

        self.debug_timings = (
            debug_timings
        )

        # ==================================================
        # MATCH ANALYZERS
        # ==================================================

        self.performance_analyzer = (
            performance_analyzer
            or PerformanceAnalyzer()
        )

        self.critical_moment_analyzer = (
            critical_moment_analyzer
            or CriticalMomentAnalyzer()
        )

        self.positive_moment_analyzer = (
            positive_moment_analyzer
            or PositiveMomentAnalyzer()
        )

        self.impact_summary = (
            impact_summary
            or ImpactSummary()
        )

        self.recommendation_engine = (
            recommendation_engine
            or RecommendationEngine()
        )

        self.loss_context_analyzer = (
            loss_context_analyzer
            or LossContextAnalyzer()
        )

        self.coaching_signal_adapter = (
            coaching_signal_adapter
            or CoachingSignalAdapter()
        )

        self.role_rank_performance_analyzer = (
            role_rank_performance_analyzer
            or RoleRankPerformanceAnalyzer()
        )

        # ==================================================
        # CONTEXTUAL FARM / ECON / DEATH ANALYSIS
        # ==================================================

        self.contextual_farming_service = (
            contextual_farming_service
        )

        if (
            self.contextual_farming_service is None
            and self.db is not None
        ):

            self.contextual_farming_service = (
                ContextualFarmingService(
                    self.db
                )
            )

        self.farming_disruption_detector = (
            farming_disruption_detector
            or FarmingDisruptionDetector()
        )

        self.economy_efficiency_detector = (
            economy_efficiency_detector
            or EconomyEfficiencyDetector()
        )

        self.economic_disruption_detector = (
            economic_disruption_detector
            or EconomicDisruptionDetector()
        )

        self.death_pattern_detector = (
            death_pattern_detector
            or DeathPatternDetector()
        )

    # ==================================================
    # DEBUG HELPERS
    # ==================================================

    @staticmethod
    def _elapsed(
        started,
    ):

        return (
            time.perf_counter()
            - started
        )

    def _print_timings(
        self,
        timings,
    ):

        if not self.debug_timings:
            return

        print()
        print(
            "MATCH ANALYSIS PERFORMANCE"
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

    # ==================================================
    # BASIC HELPERS
    # ==================================================

    @staticmethod
    def _safe_number(
        value,
        default=0,
    ):

        if value is None:
            return default

        return value

    @staticmethod
    def _participant_total_cs(
        participant,
    ):

        minions = (
            getattr(
                participant,
                "minions_killed",
                None,
            )
        )

        jungle = (
            getattr(
                participant,
                "jungle_minions_killed",
                None,
            )
        )

        if (
            minions is not None
            or jungle is not None
        ):

            return (
                (minions or 0)
                +
                (jungle or 0)
            )

        cs = (
            getattr(
                participant,
                "cs",
                None,
            )
        )

        if cs is not None:
            return cs

        return 0

    @staticmethod
    def _frame_total_cs(
        frame,
    ):

        if frame is None:
            return None

        return (
            (
                getattr(
                    frame,
                    "minions_killed",
                    0,
                )
                or 0
            )
            +
            (
                getattr(
                    frame,
                    "jungle_minions_killed",
                    0,
                )
                or 0
            )
        )

    @staticmethod
    def _frame_at_or_before(
        frames,
        timestamp_ms,
    ):

        result = None

        for frame in (
            frames or []
        ):

            frame_timestamp = (
                getattr(
                    frame,
                    "timestamp_ms",
                    None,
                )
            )

            if frame_timestamp is None:
                continue

            if (
                frame_timestamp
                > timestamp_ms
            ):
                break

            result = frame

        return result

    @staticmethod
    def _final_frame(
        frames,
    ):

        if not frames:
            return None

        return frames[-1]

    # ==================================================
    # CONTEXTUAL INTERVAL NORMALIZATION
    # ==================================================

    @staticmethod
    def _normalize_interval_result(
        result,
    ):

        if not result:
            return []

        if isinstance(
            result,
            tuple,
        ):

            if len(
                result
            ) == 0:

                return []

            intervals = (
                result[
                    0
                ]
            )

            if isinstance(
                intervals,
                list,
            ):

                return intervals

            return []

        if isinstance(
            result,
            list,
        ):

            return result

        return []

    # ==================================================
    # ECONOMIC DISRUPTION NORMALIZATION
    # ==================================================

    @staticmethod
    def _extract_economic_candidates(
        result,
    ):

        if not isinstance(
            result,
            dict,
        ):

            return []

        candidates = []

        match_results = (
            result.get(
                "match_results",
                [],
            )
            or []
        )

        for match_result in (
            match_results
        ):

            if not isinstance(
                match_result,
                dict,
            ):
                continue

            candidates.extend(
                match_result.get(
                    "candidates",
                    [],
                )
                or []
            )

        return candidates

    # ==================================================
    # CONTEXTUAL DETECTOR PIPELINE
    # ==================================================

    def _run_context_detectors(
        self,
        *,
        match,
        participant,
        player_frames,
        events,
    ):

        timings = {}

        if (
            self.contextual_farming_service
            is None
        ):

            return {
                "intervals": [],
                "farming_disruptions": [],
                "economy_efficiency": {},
                "economic_disruptions": [],
                "economic_disruption_analysis": {},
                "death_patterns": {},
                "timings": timings,
            }

        # ==================================================
        # INTERVAL EXTRACTION
        # ==================================================

        started = (
            time.perf_counter()
        )

        raw_interval_result = (
            self.contextual_farming_service
            .extract_match_intervals(
                match=
                    match,

                player=
                    participant,

                frames=
                    player_frames,

                events=
                    events,
            )
        )

        timings[
            "contextual_interval_extraction"
        ] = (
            self._elapsed(
                started
            )
        )

        intervals = (
            self._normalize_interval_result(
                raw_interval_result
            )
        )

        if not intervals:

            return {
                "intervals": [],
                "farming_disruptions": [],
                "economy_efficiency": {},
                "economic_disruptions": [],
                "economic_disruption_analysis": {},
                "death_patterns": {},
                "timings": timings,
            }

        # ==================================================
        # FARMING DISRUPTION DETECTOR
        # ==================================================

        started = (
            time.perf_counter()
        )

        farming_disruptions = (
            self.farming_disruption_detector
            .detect(
                intervals
            )
        )

        timings[
            "farming_disruption_detector"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # ECONOMY EFFICIENCY
        # ==================================================

        started = (
            time.perf_counter()
        )

        economy_efficiency = (
            self.economy_efficiency_detector
            .detect(
                intervals
            )
        )

        timings[
            "economy_efficiency_detector"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # ECONOMIC DISRUPTION
        # ==================================================

        started = (
            time.perf_counter()
        )

        economic_disruption_analysis = (
            self.economic_disruption_detector
            .detect(
                intervals
            )
        )

        timings[
            "economic_disruption_detector"
        ] = (
            self._elapsed(
                started
            )
        )

        started = (
            time.perf_counter()
        )

        economic_disruptions = (
            self._extract_economic_candidates(
                economic_disruption_analysis
            )
        )

        timings[
            "economic_candidate_normalization"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # DEATH PATTERNS
        # ==================================================

        started = (
            time.perf_counter()
        )

        death_patterns = (
            self.death_pattern_detector
            .detect(
                intervals
            )
        )

        timings[
            "death_pattern_detector"
        ] = (
            self._elapsed(
                started
            )
        )

        return {
            "intervals":
                intervals,

            "farming_disruptions":
                farming_disruptions
                or [],

            "economy_efficiency":
                economy_efficiency
                or {},

            "economic_disruptions":
                economic_disruptions
                or [],

            "economic_disruption_analysis":
                economic_disruption_analysis
                or {},

            "death_patterns":
                death_patterns
                or {},

            "timings":
                timings,
        }

    # ==================================================
    # RANK FEATURE EXTRACTION
    # ==================================================

    def _build_rank_features(
        self,
        *,
        participant,
        frames,
    ):

        if not frames:
            return {}

        frame_10 = (
            self._frame_at_or_before(
                frames,
                10
                * 60
                * 1000,
            )
        )

        final_frame = (
            self._final_frame(
                frames
            )
        )

        if final_frame is None:
            return {}

        features = {}

        # ==================================================
        # MINUTE 10
        # ==================================================

        if frame_10 is not None:

            frame_age = (
                (
                    10
                    * 60
                    * 1000
                )
                -
                getattr(
                    frame_10,
                    "timestamp_ms",
                    0,
                )
            )

            if (
                frame_age
                <= 90_000
            ):

                features[
                    "cs_at_10"
                ] = (
                    self._frame_total_cs(
                        frame_10
                    )
                )

                features[
                    "gold_at_10"
                ] = (
                    getattr(
                        frame_10,
                        "total_gold",
                        0,
                    )
                    or 0
                )

                features[
                    "xp_at_10"
                ] = (
                    getattr(
                        frame_10,
                        "xp",
                        0,
                    )
                    or 0
                )

        # ==================================================
        # FULL MATCH
        # ==================================================

        final_timestamp_ms = (
            getattr(
                final_frame,
                "timestamp_ms",
                0,
            )
            or 0
        )

        game_minutes = (
            final_timestamp_ms
            / 60_000
        )

        if game_minutes > 0:

            final_cs = (
                self._frame_total_cs(
                    final_frame
                )
            )

            if final_cs is not None:

                features[
                    "cs_per_min"
                ] = (
                    final_cs
                    / game_minutes
                )

            final_gold = (
                getattr(
                    final_frame,
                    "total_gold",
                    None,
                )
            )

            if final_gold is None:

                final_gold = (
                    getattr(
                        participant,
                        "gold_earned",
                        None,
                    )
                    or
                    getattr(
                        participant,
                        "total_gold",
                        0,
                    )
                )

            features[
                "gold_per_min"
            ] = (
                final_gold
                / game_minutes
            )

        # ==================================================
        # COMBAT
        # ==================================================

        kills = (
            getattr(
                participant,
                "kills",
                0,
            )
            or 0
        )

        deaths = (
            getattr(
                participant,
                "deaths",
                0,
            )
            or 0
        )

        assists = (
            getattr(
                participant,
                "assists",
                0,
            )
            or 0
        )

        features[
            "deaths"
        ] = deaths

        features[
            "kda"
        ] = (
            (
                kills
                + assists
            )
            /
            max(
                deaths,
                1,
            )
        )

        return features

    # ==================================================
    # RANK ANALYSIS
    # ==================================================

    def _analyze_rank_performance(
        self,
        *,
        participant,
        frames,
        rank,
        role,
    ):

        if not rank:
            return None

        if not role:
            return None

        rank = (
            rank.upper()
        )

        role = (
            role.upper()
        )

        if (
            rank
            not in {
                "GOLD",
                "PLATINUM",
                "EMERALD",
                "DIAMOND",
            }
        ):

            return None

        features = (
            self._build_rank_features(
                participant=
                    participant,

                frames=
                    frames,
            )
        )

        if not features:
            return None

        return (
            self.role_rank_performance_analyzer
            .analyze(
                rank=
                    rank,

                role=
                    role,

                features=
                    features,
            )
        )

    # ==================================================
    # SIGNAL MERGING
    # ==================================================

    @staticmethod
    def _deduplicate_signals(
        signals,
    ):

        unique = []
        seen = set()

        for signal in (
            signals
            or []
        ):

            key = (
                signal.get(
                    "key"
                )
            )

            minute = (
                signal.get(
                    "minute"
                )
            )

            source = (
                signal.get(
                    "source"
                )
            )

            positive = bool(
                signal.get(
                    "positive",
                    False,
                )
            )

            identity = (
                key,
                minute,
                source,
                positive,
            )

            if identity in seen:
                continue

            seen.add(
                identity
            )

            unique.append(
                signal
            )

        return unique

    # ==================================================
    # MAIN ANALYSIS
    # ==================================================

    def analyze_match(
        self,
        *,
        match,
        participant,
        player_frames,
        all_participants,
        all_frames,
        events,
        rank=None,
        role=None,
        farming_disruptions=None,
        economic_disruptions=None,
        death_patterns=None,
    ):

        analysis_started = (
            time.perf_counter()
        )

        timings = {}

        role = (
            role
            or getattr(
                participant,
                "role",
                None,
            )
            or getattr(
                participant,
                "lane",
                None,
            )
        )

        # ==================================================
        # 1. CONTEXTUAL DETECTOR LAYER
        # ==================================================

        detector_results = None

        started = (
            time.perf_counter()
        )

        if (
            farming_disruptions is None
            or economic_disruptions is None
            or death_patterns is None
        ):

            detector_results = (
                self._run_context_detectors(
                    match=
                        match,

                    participant=
                        participant,

                    player_frames=
                        player_frames,

                    events=
                        events,
                )
            )

        timings[
            "context_detector_pipeline_total"
        ] = (
            self._elapsed(
                started
            )
        )

        if detector_results:

            timings.update(
                detector_results.get(
                    "timings",
                    {},
                )
            )

        if farming_disruptions is None:

            farming_disruptions = (
                detector_results.get(
                    "farming_disruptions",
                    [],
                )
                if detector_results
                else []
            )

        if economic_disruptions is None:

            economic_disruptions = (
                detector_results.get(
                    "economic_disruptions",
                    [],
                )
                if detector_results
                else []
            )

        if death_patterns is None:

            death_patterns = (
                detector_results.get(
                    "death_patterns",
                    {},
                )
                if detector_results
                else {}
            )

        economy_efficiency = (
            detector_results.get(
                "economy_efficiency",
                {},
            )
            if detector_results
            else {}
        )

        economic_disruption_analysis = (
            detector_results.get(
                "economic_disruption_analysis",
                {},
            )
            if detector_results
            else {}
        )

        contextual_intervals = (
            detector_results.get(
                "intervals",
                [],
            )
            if detector_results
            else []
        )

        # ==================================================
        # 2. BASIC PERFORMANCE
        # ==================================================

        started = (
            time.perf_counter()
        )

        performance = (
            self.performance_analyzer
            .analyze(
                player=
                    participant,

                player_frames=
                    player_frames,

                events=
                    events,
            )
        )

        timings[
            "performance_analyzer"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # 3. CRITICAL NEGATIVE MOMENTS
        # ==================================================

        started = (
            time.perf_counter()
        )

        critical_result = (
            self.critical_moment_analyzer
            .analyze(
                player=
                    participant,

                participants=
                    all_participants,

                frames=
                    all_frames,

                events=
                    events,
            )
        )

        timings[
            "critical_moment_analyzer"
        ] = (
            self._elapsed(
                started
            )
        )

        critical_moments = (
            critical_result.get(
                "critical_moments",
                [],
            )
        )

        # ==================================================
        # 4. POSITIVE MOMENTS
        # ==================================================

        started = (
            time.perf_counter()
        )

        positive_result = (
            self.positive_moment_analyzer
            .analyze(
                player=
                    participant,

                events=
                    events,
            )
        )

        timings[
            "positive_moment_analyzer"
        ] = (
            self._elapsed(
                started
            )
        )

        positive_moments = (
            positive_result.get(
                "positive_moments",
                [],
            )
        )

        # ==================================================
        # 5. IMPACT SUMMARY
        # ==================================================

        started = (
            time.perf_counter()
        )

        impact_summary = (
            self.impact_summary
            .build(
                critical_moments=
                    critical_moments,

                positive_moments=
                    positive_moments,
            )
        )

        timings[
            "impact_summary"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # 6. RANK-RELATIVE PERFORMANCE
        # ==================================================

        started = (
            time.perf_counter()
        )

        rank_performance = (
            self._analyze_rank_performance(
                participant=
                    participant,

                frames=
                    player_frames,

                rank=
                    rank,

                role=
                    role,
            )
        )

        timings[
            "rank_performance"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # 7. COACHING SIGNALS
        # ==================================================

        started = (
            time.perf_counter()
        )

        coaching_signals = []

        coaching_signals.extend(
            self.coaching_signal_adapter
            .from_farming_disruptions(
                farming_disruptions
                or []
            )
        )

        coaching_signals.extend(
            self.coaching_signal_adapter
            .from_economic_disruptions(
                economic_disruptions
                or []
            )
        )

        coaching_signals.extend(
            self.coaching_signal_adapter
            .from_death_patterns(
                death_patterns
                or {}
            )
        )

        coaching_signals.extend(
            self.coaching_signal_adapter
            .from_critical_moments(
                critical_moments
                or []
            )
        )

        coaching_signals.extend(
            self.coaching_signal_adapter
            .from_positive_moments(
                positive_moments
                or []
            )
        )

        if rank_performance:

            coaching_signals.extend(
                self.coaching_signal_adapter
                .from_rank_performance(
                    rank_performance
                )
            )

        coaching_signals = (
            self._deduplicate_signals(
                coaching_signals
            )
        )

        timings[
            "coaching_signal_generation"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # 8. MATCH RECOMMENDATIONS
        # ==================================================

        started = (
            time.perf_counter()
        )

        recommendations = (
            self.recommendation_engine
            .build_match_recommendations(
                critical_moments=
                    critical_moments,
            )
        )

        timings[
            "recommendation_engine"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # 9. LOSS CONTEXT
        # ==================================================

        participant_win = bool(
            getattr(
                participant,
                "win",
                False,
            )
        )

        loss_context = None

        started = (
            time.perf_counter()
        )

        if not participant_win:

            loss_context = (
                self.loss_context_analyzer
                .analyze(
                    player=
                        participant,

                    participants=
                        all_participants,

                    frames=
                        all_frames,

                    critical_moments=
                        critical_moments,

                    positive_moments=
                        positive_moments,
                )
            )

        timings[
            "loss_context_analyzer"
        ] = (
            self._elapsed(
                started
            )
        )

        # ==================================================
        # TOTAL
        # ==================================================

        timings[
            "TOTAL_MATCH_ANALYSIS"
        ] = (
            self._elapsed(
                analysis_started
            )
        )

        # ==================================================
        # DEBUG OUTPUT
        # ==================================================

        self._print_timings(
            timings
        )

        # ==================================================
        # FINAL DIFFTHEORY MATCH ANALYSIS
        # ==================================================

        return {
            "match_id":
                getattr(
                    match,
                    "match_id",
                    None,
                ),

            "participant_id":
                getattr(
                    participant,
                    "participant_id",
                    None,
                ),

            "champion":
                getattr(
                    participant,
                    "champion_name",
                    None,
                ),

            "role":
                role,

            "win":
                participant_win,

            "rank":
                rank,

            # ======================================
            # CORE PERFORMANCE
            # ======================================

            "performance":
                performance,

            "rank_performance":
                rank_performance,

            # ======================================
            # CONTEXTUAL INTERVAL ANALYSIS
            # ======================================

            "contextual_interval_count":
                len(
                    contextual_intervals
                ),

            # ======================================
            # FARM
            # ======================================

            "farming_disruptions":
                farming_disruptions
                or [],

            # ======================================
            # ECONOMY
            # ======================================

            "economy_efficiency":
                economy_efficiency
                or {},

            "economic_disruptions":
                economic_disruptions
                or [],

            "economic_disruption_analysis":
                economic_disruption_analysis
                or {},

            # ======================================
            # DEATH PATTERNS
            # ======================================

            "death_patterns":
                death_patterns
                or {},

            # ======================================
            # MOMENTS
            # ======================================

            "critical_moments":
                critical_moments
                or [],

            "positive_moments":
                positive_moments
                or [],

            # ======================================
            # INTERPRETATION
            # ======================================

            "impact_summary":
                impact_summary,

            "coaching_signals":
                coaching_signals,

            "recommendations":
                recommendations,

            "loss_context":
                loss_context,
        }
