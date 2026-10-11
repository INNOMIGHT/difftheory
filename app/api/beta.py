from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import (
    BaseModel,
    Field,
)

from sqlalchemy.orm import Session

from app.database.database import (
    get_db,
)
from app.models.user import User
from app.services.beta_session_service import (
    BetaSessionService,
)
from app.services.riot_service import (
    RiotService,
)
from app.api.dependencies import (
    get_bearer_token,
    get_current_user,
)

from app.services.beta_onboarding_service import (
    BetaOnboardingService,
)


router = APIRouter(
    prefix="/beta",
    tags=[
        "Beta Authentication",
    ],
)


class BetaStartRequest(
    BaseModel
):
    game_name: str = Field(
        min_length=1,
        max_length=100,
    )

    tag_line: str = Field(
        min_length=1,
        max_length=50,
    )

    platform: str = Field(
        min_length=2,
        max_length=10,
    )


@router.post(
    "/start"
)
def start_beta_session(
    request: BetaStartRequest,
    db: Session = Depends(
        get_db
    ),
):
    try:

        riot_service = (
            RiotService(
                db
            )
        )

        riot_account = (
            riot_service
            .sync_riot_account(
                game_name=(
                    request.game_name.strip()
                ),
                tag_line=(
                    request.tag_line.strip()
                ),
            )
        )

        league_profile = (
            riot_service
            .sync_league_profile(
                riot_account_id=(
                    riot_account.id
                ),
                platform=(
                    request.platform.upper()
                ),
            )
        )

        session_service = (
            BetaSessionService(
                db
            )
        )

        token = (
            session_service
            .create_session(
                riot_account.user
            )
        )

        return {
            "access_token":
                token,

            "token_type":
                "bearer",

            "user": {
                "id":
                    riot_account.user_id,
            },

            "riot_account": {
                "id":
                    riot_account.id,

                "puuid":
                    riot_account.puuid,

                "game_name":
                    riot_account.game_name,

                "tag_line":
                    riot_account.tag_line,
            },

            "league_profile": {
                "platform":
                    league_profile.platform,

                "region":
                    league_profile.region,

                "summoner_level":
                    league_profile.summoner_level,

                "profile_icon_id":
                    league_profile.profile_icon_id,
            },
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to connect Riot account."
            ),
        ) from exc


@router.get(
    "/me"
)
def get_me(
    user: User = Depends(
        get_current_user
    ),
):
    riot_account = (
        user.riot_accounts[0]
        if user.riot_accounts
        else None
    )

    league_profile = (
        riot_account.league_profile
        if riot_account
        else None
    )

    return {
        "user": {
            "id":
                user.id,

            "auth_provider":
                user.auth_provider,
        },

        "riot_account":
            (
                {
                    "id":
                        riot_account.id,

                    "game_name":
                        riot_account.game_name,

                    "tag_line":
                        riot_account.tag_line,

                    "puuid":
                        riot_account.puuid,
                }

                if riot_account

                else None
            ),

        "league_profile":
            (
                {
                    "platform":
                        league_profile.platform,

                    "region":
                        league_profile.region,

                    "summoner_level":
                        league_profile.summoner_level,

                    "profile_icon_id":
                        league_profile.profile_icon_id,
                }

                if league_profile

                else None
            ),
    }

@router.post(
    "/onboard"
)
def onboard_beta_user(
    user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    try:

        service = (
            BetaOnboardingService(
                db
            )
        )

        result = (
            service.onboard_user(
                user_id=user.id,
                limit=10,
            )
        )

        return {
            "status":
                "READY",

            "user_id":
                user.id,

            "riot_account_id":
                result[
                    "riot_account_id"
                ],

            "game_name":
                result[
                    "game_name"
                ],

            "tag_line":
                result[
                    "tag_line"
                ],

            "matches": {
                "requested":
                    result[
                        "requested_matches"
                    ],

                "found":
                    result[
                        "match_ids_found"
                    ],

                "saved":
                    result[
                        "new_matches_saved"
                    ],

                "existing":
                    result[
                        "existing_matches"
                    ],

                "failed":
                    len(
                        result[
                            "failed_matches"
                        ]
                    ),
            },

            "analysis":
                result[
                    "analysis"
                ],
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(
                exc
            ),
        )

    except Exception as exc:

        db.rollback()

        print(
            "BETA ONBOARD ERROR:",
            repr(
                exc
            ),
        )

        raise HTTPException(
            status_code=500,
            detail=str(
                exc
            ),
        ) from exc



@router.post(
    "/logout"
)
def logout(
    token: str = Depends(
        get_bearer_token
    ),
    db: Session = Depends(
        get_db
    ),
):

    BetaSessionService(
        db
    ).revoke_session(
        token
    )

    return {
        "success":
            True,
    }