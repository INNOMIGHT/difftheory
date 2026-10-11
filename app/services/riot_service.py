from sqlalchemy.orm import Session

from app.repositories.riot_account_repository import (
    RiotAccountRepository,
)
from app.repositories.user_repository import (
    UserRepository,
)
from app.repositories.league_profile_repository import (
    LeagueProfileRepository,
)
from app.riot.client import RiotClient


class RiotService:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.riot_account_repository = (
            RiotAccountRepository(
                db
            )
        )

        self.user_repository = (
            UserRepository(
                db
            )
        )

        self.league_profile_repository = (
            LeagueProfileRepository(
                db
            )
        )


    def get_region_from_platform(
        self,
        platform: str,
    ) -> str:

        regions = {
            "EUW1": "EUROPE",
            "EUN1": "EUROPE",
            "TR1": "EUROPE",
            "RU": "EUROPE",

            "NA1": "AMERICAS",
            "BR1": "AMERICAS",
            "LA1": "AMERICAS",
            "LA2": "AMERICAS",

            "OC1": "SEA",
            "PH2": "SEA",
            "SG2": "SEA",
            "TH2": "SEA",
            "TW2": "SEA",
            "VN2": "SEA",

            "JP1": "ASIA",
            "KR": "ASIA",

            "ME1": "EUROPE",
        }

        normalized_platform = (
            platform.upper()
        )

        if (
            normalized_platform
            not in regions
        ):
            raise ValueError(
                f"Unsupported League platform: "
                f"{platform}"
            )

        return regions[
            normalized_platform
        ]


    def sync_riot_account(
        self,
        game_name: str,
        tag_line: str,
    ):

        with RiotClient() as riot:

            riot_data = (
                riot.get_account_by_riot_id(
                    game_name,
                    tag_line,
                )
            )

        puuid = riot_data[
            "puuid"
        ]

        existing_account = (
            self.riot_account_repository
            .get_by_puuid(
                puuid
            )
        )

        if existing_account:

            existing_account.game_name = (
                riot_data[
                    "gameName"
                ]
            )

            existing_account.tag_line = (
                riot_data[
                    "tagLine"
                ]
            )

            self.db.commit()

            return existing_account

        try:

            user = (
                self.user_repository
                .create()
            )

            riot_account = (
                self.riot_account_repository
                .create(
                    user_id=user.id,
                    puuid=puuid,
                    game_name=riot_data[
                        "gameName"
                    ],
                    tag_line=riot_data[
                        "tagLine"
                    ],
                )
            )

            self.db.commit()

            return riot_account

        except Exception:

            self.db.rollback()

            raise


    def sync_league_profile(
        self,
        riot_account_id: int,
        platform: str,
    ):

        platform = (
            platform.upper()
        )

        riot_account = (
            self.riot_account_repository
            .get_by_id(
                riot_account_id
            )
        )

        if not riot_account:
            raise ValueError(
                "Riot account not found."
            )

        with RiotClient() as riot:

            league_data = (
                riot.get_summoner_by_puuid(
                    puuid=riot_account.puuid,
                    platform=platform,
                )
            )

        region = (
            self.get_region_from_platform(
                platform
            )
        )

        existing_profile = (
            self.league_profile_repository
            .get_by_riot_account_id(
                riot_account_id
            )
        )

        if existing_profile:

            profile = (
                self.league_profile_repository
                .update(
                    profile=existing_profile,
                    summoner_level=(
                        league_data.get(
                            "summonerLevel"
                        )
                    ),
                    profile_icon_id=(
                        league_data.get(
                            "profileIconId"
                        )
                    ),
                )
            )

            # Keep these correct too.
            profile.platform = (
                platform
            )

            profile.region = (
                region
            )

        else:

            profile = (
                self.league_profile_repository
                .create(
                    riot_account_id=(
                        riot_account_id
                    ),
                    platform=platform,
                    region=region,
                    summoner_level=(
                        league_data.get(
                            "summonerLevel"
                        )
                    ),
                    profile_icon_id=(
                        league_data.get(
                            "profileIconId"
                        )
                    ),
                )
            )

        self.db.commit()

        return profile