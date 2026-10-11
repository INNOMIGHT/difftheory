from __future__ import annotations

from collections import defaultdict
from typing import Any


class RankReadinessService:
    """
    Estimates how strongly the player's recent rank-comparative performance
    supports their current rank or progression toward the next rank.

    IMPORTANT:
    This is a heuristic coaching score.

    It is NOT:
    - Riot MMR
    - an LP prediction
    - a probability of promotion
    - a calibrated prediction of the player's future rank

    The score uses only DiffTheory's rank-comparative coaching signals.
    Behavioural signals such as objective mistakes or fight selection are
    deliberately excluded from the score unless they are represented by the
    rank-performance analyzer itself.
    """

    RECENCY_DECAY = 0.90

    RANK_SIGNAL_KEYS = {
        "early_farming",
        "sustained_farming",
        "early_economy",
        "sustained_economy",
        "early_experience",
        "survival_efficiency",
        "combat_efficiency",
    }

    SIGNAL_LABELS = {
        "early_farming": "Early farming",
        "sustained_farming": "Sustained farming",
        "early_economy": "Early economy",
        "sustained_economy": "Sustained economy",
        "early_experience": "Early experience",
        "survival_efficiency": "Survival efficiency",
        "combat_efficiency": "Combat efficiency",
    }

    NEXT_RANK = {
        "IRON": "BRONZE",
        "BRONZE": "SILVER",
        "SILVER": "GOLD",
        "GOLD": "PLATINUM",
        "PLATINUM": "EMERALD",
        "EMERALD": "DIAMOND",
        "DIAMOND": "MASTER",
        "MASTER": "GRANDMASTER",
        "GRANDMASTER": "CHALLENGER",
        "CHALLENGER": None,
    }


    @staticmethod
    def _normalize_rank(
        rank,
    ):
        if not rank:
            return "UNKNOWN"

        value = (
            str(
                rank
            )
            .strip()
            .upper()
        )

        for tier in (
            "CHALLENGER",
            "GRANDMASTER",
            "MASTER",
            "DIAMOND",
            "EMERALD",
            "PLATINUM",
            "GOLD",
            "SILVER",
            "BRONZE",
            "IRON",
        ):
            if value.startswith(
                tier
            ):
                return tier

        return "UNKNOWN"

    def build(
        self,
        match_analyses,
        current_rank=None,
    ) -> dict[str, Any]:

        if not match_analyses:
            return self._empty_result()

        current_rank = (
            self._normalize_rank(
                current_rank
            )
        )

        next_rank = (
            self.NEXT_RANK.get(
                current_rank,
            )
        )

        weighted_match_score = 0.0
        total_match_weight = 0.0

        positive_signal_count = 0
        negative_signal_count = 0
        total_rank_signals = 0

        signal_stats: dict[
            str,
            dict[str, float]
        ] = defaultdict(
            lambda: {
                "positive_weight": 0.0,
                "negative_weight": 0.0,
                "occurrences": 0.0,
            }
        )

        # ==================================================
        # ANALYSE MATCHES
        # ==================================================

        # Match analyses are expected newest-first.
        for match_index, analysis in enumerate(
            match_analyses
        ):
            if not isinstance(
                analysis,
                dict,
            ):
                continue

            match_weight = (
                self.RECENCY_DECAY
                ** match_index
            )

            signals = (
                analysis.get(
                    "coaching_signals"
                )
                or []
            )

            rank_signals = [
                signal
                for signal in signals
                if (
                    isinstance(
                        signal,
                        dict,
                    )
                    and signal.get(
                        "key"
                    )
                    in self.RANK_SIGNAL_KEYS
                )
            ]

            match_signal_values: list[
                float
            ] = []

            for signal in rank_signals:

                key = (
                    signal.get(
                        "key"
                    )
                )

                severity = (
                    self._clamp(
                        self._safe_float(
                            signal.get(
                                "severity"
                            ),
                            1.0,
                        ),
                        1.0,
                        5.0,
                    )
                )

                normalized_intensity = (
                    severity
                    / 5.0
                )

                positive = bool(
                    signal.get(
                        "positive"
                    )
                )

                signed_value = (
                    normalized_intensity
                    if positive
                    else -normalized_intensity
                )

                match_signal_values.append(
                    signed_value
                )

                total_rank_signals += 1

                signal_stats[
                    key
                ][
                    "occurrences"
                ] += 1

                if positive:

                    positive_signal_count += 1

                    signal_stats[
                        key
                    ][
                        "positive_weight"
                    ] += (
                        normalized_intensity
                        * match_weight
                    )

                else:

                    negative_signal_count += 1

                    signal_stats[
                        key
                    ][
                        "negative_weight"
                    ] += (
                        normalized_intensity
                        * match_weight
                    )

            # No rank-comparative signal in this match
            # contributes a neutral value.
            #
            # We do not assume absence of a signal means
            # either good or bad performance.
            match_score = (
                (
                    sum(
                        match_signal_values
                    )
                    /
                    len(
                        match_signal_values
                    )
                )
                if match_signal_values
                else 0.0
            )

            weighted_match_score += (
                match_score
                * match_weight
            )

            total_match_weight += (
                match_weight
            )

        # ==================================================
        # CALCULATE RAW READINESS SCORE
        # ==================================================

        normalized_score = (
            (
                weighted_match_score
                / total_match_weight
            )
            if total_match_weight
            else 0.0
        )

        # Mapping:
        #
        # -1.0 -> 0
        #  0.0 -> 5
        # +1.0 -> 10
        score = (
            self._clamp(
                5.0
                + (
                    normalized_score
                    * 5.0
                ),
                0.0,
                10.0,
            )
        )

        score = round(
            score,
            1,
        )

        # ==================================================
        # DETERMINE WHETHER READINESS CAN BE SHOWN
        # ==================================================

        has_readiness_data = (
            current_rank
            != "UNKNOWN"
            and
            total_rank_signals > 0
        )

        if has_readiness_data:

            classification = (
                self._classification(
                    score
                )
            )

        else:

            classification = (
                "INSUFFICIENT_DATA"
            )

        # ==================================================
        # DRIVERS
        # ==================================================

        (
            positive_drivers,
            negative_drivers,
        ) = (
            self._build_drivers(
                signal_stats,
            )
        )

        # ==================================================
        # CONFIDENCE
        # ==================================================

        confidence = (
            self._confidence(
                matches_analyzed=len(
                    match_analyses
                ),
                total_rank_signals=
                    total_rank_signals,
            )
        )

        # ==================================================
        # SUMMARY
        # ==================================================

        summary = (
            self._summary(
                score=score,
                classification=
                    classification,
                current_rank=
                    current_rank,
                next_rank=
                    next_rank,
            )
        )

        # ==================================================
        # RESPONSE
        # ==================================================

        return {
            "score": (
                score
                if has_readiness_data
                else None
            ),

            "scale_min":
                0,

            "scale_max":
                10,

            "classification":
                classification,

            "current_rank":
                current_rank,

            "next_rank":
                next_rank,

            "summary":
                summary,

            "positive_drivers":
                positive_drivers,

            "negative_drivers":
                negative_drivers,

            "positive_signal_count":
                positive_signal_count,

            "negative_signal_count":
                negative_signal_count,

            "evidence_count":
                total_rank_signals,

            "matches_analyzed":
                len(
                    match_analyses
                ),

            "confidence":
                confidence,

            "method":
                "rank_readiness_heuristic_v1",

            "calibrated":
                False,

            "disclaimer":
                (
                    "DiffTheory coaching estimate based on recent "
                    "rank-comparative performance signals. "
                    "It is not Riot MMR, LP, or a promotion probability."
                ),
        }

    def _build_drivers(
        self,
        signal_stats: dict[str, dict[str, float]],
    ) -> tuple[
        list[dict[str, Any]],
        list[dict[str, Any]],
    ]:
        positive: list[dict[str, Any]] = []
        negative: list[dict[str, Any]] = []

        for key, stats in signal_stats.items():
            positive_weight = stats[
                "positive_weight"
            ]

            negative_weight = stats[
                "negative_weight"
            ]

            net = (
                positive_weight
                - negative_weight
            )

            item = {
                "key": key,
                "title": self.SIGNAL_LABELS.get(
                    key,
                    key.replace(
                        "_",
                        " ",
                    ).title(),
                ),
                "net": round(
                    net,
                    3,
                ),
                "occurrences": int(
                    stats["occurrences"]
                ),
            }

            if net > 0:
                positive.append(
                    item
                )

            elif net < 0:
                negative.append(
                    item
                )

        positive.sort(
            key=lambda item: item["net"],
            reverse=True,
        )

        negative.sort(
            key=lambda item: item["net"],
        )

        return (
            positive[:3],
            negative[:3],
        )

    @staticmethod
    def _classification(
        score: float,
    ) -> str:
        if score < 4.5:
            return "BELOW_CURRENT_RANK"

        if score < 6.5:
            return "CURRENT_RANK_FIT"

        if score < 8.0:
            return "UPWARD_PRESSURE"

        return "STRONG_RANK_UP_READINESS"

    @staticmethod
    def _summary(
        *,
        score,
        classification,
        current_rank,
        next_rank,
    ):
        has_known_rank = (
            current_rank
            and current_rank != "UNKNOWN"
        )

        current_label = (
            current_rank.title()
            if has_known_rank
            else "your current rank"
        )

        next_label = (
            next_rank.title()
            if next_rank
            else None
        )

        


        if classification == "INSUFFICIENT_DATA":
            return (
                "DiffTheory does not yet have enough "
                "rank-comparative evidence to estimate "
                "your rank readiness reliably."
            )

        if classification == "BELOW_CURRENT_RANK":
            if has_known_rank:
                return (
                    f"Your recent gameplay is currently below "
                    f"the performance profile DiffTheory expects "
                    f"around {current_label}."
                )

            return (
                "Your recent gameplay is currently below "
                "the benchmark profile available to DiffTheory."
            )

        if classification == "CURRENT_RANK_FIT":
            if has_known_rank and next_label:
                return (
                    f"Your recent gameplay broadly supports "
                    f"{current_label}, but the evidence is not yet "
                    f"strong enough to suggest consistent "
                    f"{next_label}-level play."
                )

            return (
                "Your recent gameplay broadly fits the available "
                "benchmark profile, but DiffTheory cannot compare "
                "you to a next rank yet."
            )

        if classification == "UPWARD_PRESSURE":
            if has_known_rank and next_label:
                return (
                    f"Your recent gameplay is beginning to "
                    f"outperform the typical {current_label} profile. "
                    f"Several signals are moving toward "
                    f"{next_label}-level performance."
                )

            return (
                "Your recent gameplay is beginning to outperform "
                "the available benchmark profile."
            )

        if has_known_rank and next_label:
            return (
                f"Your recent rank-comparative performance strongly "
                f"outperforms the typical {current_label} profile. "
                f"DiffTheory sees meaningful evidence supporting "
                f"{next_label}-level gameplay."
            )

        return (
            "Your recent rank-comparative performance strongly "
            "outperforms the available benchmark profile."
        )



    @staticmethod
    def _confidence(
        *,
        matches_analyzed: int,
        total_rank_signals: int,
    ) -> str:
        if (
            matches_analyzed >= 10
            and total_rank_signals >= 10
        ):
            return "HIGH"

        if (
            matches_analyzed >= 5
            and total_rank_signals >= 5
        ):
            return "MEDIUM"
        

        return "LOW"

    @staticmethod
    def _resolve_rank(
        match_analyses: list[dict[str, Any]],
    ) -> str:
        for analysis in match_analyses:
            value = analysis.get(
                "rank"
            )

            if not value:
                continue

            value = str(
                value
            ).strip().upper()

            # Handles:
            # GOLD
            # GOLD II
            # GOLD_II
            for tier in (
                "CHALLENGER",
                "GRANDMASTER",
                "MASTER",
                "DIAMOND",
                "EMERALD",
                "PLATINUM",
                "GOLD",
                "SILVER",
                "BRONZE",
                "IRON",
            ):
                if value.startswith(
                    tier
                ):
                    return tier

        return "UNKNOWN"

    @staticmethod
    def _safe_float(
        value: Any,
        fallback: float = 0.0,
    ) -> float:
        try:
            return float(
                value
            )
        except (
            TypeError,
            ValueError,
        ):
            return fallback

    @staticmethod
    def _clamp(
        value: float,
        minimum: float,
        maximum: float,
    ) -> float:
        return max(
            minimum,
            min(
                maximum,
                value,
            ),
        )

    @staticmethod
    def _empty_result() -> dict[str, Any]:
        return {
            "score": 5.0,
            "scale_min": 0,
            "scale_max": 10,
            "classification": "INSUFFICIENT_DATA",
            "current_rank": "UNKNOWN",
            "next_rank": None,
            "summary": (
                "Not enough analysed games are available "
                "to estimate rank readiness."
            ),
            "positive_drivers": [],
            "negative_drivers": [],
            "positive_signal_count": 0,
            "negative_signal_count": 0,
            "evidence_count": 0,
            "matches_analyzed": 0,
            "confidence": "LOW",
            "method": "rank_readiness_heuristic_v1",
            "calibrated": False,
            "disclaimer": (
                "DiffTheory coaching estimate. "
                "It is not Riot MMR, LP, or a promotion probability."
            ),
        }