from app.ml.rank_baselines import (
    RankedPlayerSample,
)


class RankSampleService:

    STANDARD_TIERS = {
        "IRON",
        "BRONZE",
        "SILVER",
        "GOLD",
        "PLATINUM",
        "EMERALD",
        "DIAMOND",
    }

    ELITE_TIERS = {
        "MASTER",
        "GRANDMASTER",
        "CHALLENGER",
    }

    DIVISIONS = [
        "I",
        "II",
        "III",
        "IV",
    ]


    def __init__(
        self,
        riot_client,
    ):

        self.riot_client = (
            riot_client
        )


    # ==================================================
    # STANDARD LADDER
    #
    # IRON -> DIAMOND
    # ==================================================

    def collect_standard_tier_players(
        self,
        *,
        platform,
        tier,
        target_players=100,
    ):

        tier = tier.upper()

        if tier not in self.STANDARD_TIERS:

            raise ValueError(
                f"Unsupported standard tier: {tier}"
            )


        players_by_division = {
            division: []
            for division in self.DIVISIONS
        }

        seen_puuids = set()


        target_per_division = max(
            target_players
            // len(
                self.DIVISIONS
            ),
            1,
        )


        # ==========================================
        # COLLECT EACH DIVISION SEPARATELY
        # ==========================================

        for division in self.DIVISIONS:

            page = 1

            while (
                len(
                    players_by_division[
                        division
                    ]
                )
                < target_per_division
            ):

                entries = (
                    self.riot_client
                    .get_ranked_entries(
                        platform=platform,
                        tier=tier,
                        division=division,
                        page=page,
                    )
                )

                if not entries:
                    break


                added_this_page = 0


                for entry in entries:

                    puuid = (
                        entry.get(
                            "puuid"
                        )
                    )

                    if not puuid:
                        continue

                    if puuid in seen_puuids:
                        continue


                    seen_puuids.add(
                        puuid
                    )


                    players_by_division[
                        division
                    ].append(
                        RankedPlayerSample(
                            puuid=puuid,

                            tier=tier,

                            division=division,

                            league_points=
                                entry.get(
                                    "leaguePoints"
                                ),

                            wins=
                                entry.get(
                                    "wins"
                                ),

                            losses=
                                entry.get(
                                    "losses"
                                ),

                            platform=platform,

                            rank_bucket=tier,
                        )
                    )


                    added_this_page += 1


                    if (
                        len(
                            players_by_division[
                                division
                            ]
                        )
                        >= target_per_division
                    ):
                        break


                # Safety protection:
                # don't endlessly paginate if Riot
                # returned entries but none were usable.
                if added_this_page == 0:
                    break


                page += 1


        # ==========================================
        # INTERLEAVE DIVISIONS
        #
        # I, II, III, IV,
        # I, II, III, IV...
        # ==========================================

        players = []


        max_count = max(
            (
                len(
                    items
                )
                for items
                in players_by_division.values()
            ),
            default=0,
        )


        for index in range(
            max_count
        ):

            for division in self.DIVISIONS:

                division_players = (
                    players_by_division[
                        division
                    ]
                )

                if (
                    index
                    >= len(
                        division_players
                    )
                ):
                    continue


                players.append(
                    division_players[
                        index
                    ]
                )


                if (
                    len(
                        players
                    )
                    >= target_players
                ):

                    return players


        return players


    # ==================================================
    # ELITE LADDER
    #
    # MASTER / GRANDMASTER / CHALLENGER
    # ==================================================

    def collect_elite_tier_players(
        self,
        *,
        platform,
        tier,
        target_players=100,
    ):

        tier = tier.upper()


        if tier not in self.ELITE_TIERS:

            raise ValueError(
                f"Unsupported elite tier: {tier}"
            )


        getter_map = {

            "MASTER":
                self.riot_client
                .get_master_league,

            "GRANDMASTER":
                self.riot_client
                .get_grandmaster_league,

            "CHALLENGER":
                self.riot_client
                .get_challenger_league,
        }


        getter = (
            getter_map[
                tier
            ]
        )


        league = getter(
            platform=platform
        )


        entries = (
            league.get(
                "entries",
                []
            )
            or []
        )


        players = []

        seen_puuids = set()


        for entry in entries:

            puuid = (
                entry.get(
                    "puuid"
                )
            )


            # ======================================
            # BACKWARD-COMPATIBILITY
            #
            # Some responses / historical schemas
            # may still expose summonerId.
            # ======================================

            if not puuid:

                summoner_id = (
                    entry.get(
                        "summonerId"
                    )
                )

                if not summoner_id:
                    continue


                summoner = (
                    self.riot_client
                    .get_summoner_by_id(
                        platform=platform,
                        summoner_id=
                            summoner_id,
                    )
                )

                puuid = (
                    summoner.get(
                        "puuid"
                    )
                )


            if not puuid:
                continue


            if puuid in seen_puuids:
                continue


            seen_puuids.add(
                puuid
            )


            players.append(
                RankedPlayerSample(
                    puuid=puuid,

                    tier=tier,

                    division=None,

                    league_points=
                        entry.get(
                            "leaguePoints"
                        ),

                    wins=
                        entry.get(
                            "wins"
                        ),

                    losses=
                        entry.get(
                            "losses"
                        ),

                    platform=platform,

                    rank_bucket=tier,
                )
            )


            if (
                len(
                    players
                )
                >= target_players
            ):
                break


        return players