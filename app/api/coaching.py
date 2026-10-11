from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_current_user,
)

from app.database.database import (
    get_db,
)

from app.models.riot_account import (
    RiotAccount,
)

from app.models.user import (
    User,
)

from app.services.coaching_api_service import (
    CoachingApiService,
)


router = APIRouter(
    prefix="/coaching",
    tags=["DiffTheory Coaching"],
)


# ==========================================================
# OWNERSHIP
# ==========================================================

def require_owned_riot_account(
    *,
    riot_account_id: int,
    user: User,
    db: Session,
) -> RiotAccount:

    riot_account = (
        db.query(
            RiotAccount
        )
        .filter(
            RiotAccount.id
            == riot_account_id,

            RiotAccount.user_id
            == user.id,
        )
        .first()
    )

    if not riot_account:
        raise HTTPException(
            status_code=404,
            detail="Riot account not found.",
        )

    return riot_account


# ==========================================================
# PLAYER COACHING OVERVIEW
# ==========================================================

@router.get(
    "/riot-account/{riot_account_id}"
)
def get_player_coaching(
    riot_account_id: int,

    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    riot_account = (
        require_owned_riot_account(
            riot_account_id=
                riot_account_id,

            user=
                user,

            db=
                db,
        )
    )

    service = (
        CoachingApiService(
            db
        )
    )

    try:

        return (
            service.get_player_coaching(
                riot_account_id=
                    riot_account.id,

                limit=
                    limit,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ==========================================================
# RECENT MATCHES
# ==========================================================

@router.get(
    "/riot-account/{riot_account_id}/matches"
)
def get_player_matches(
    riot_account_id: int,

    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    riot_account = (
        require_owned_riot_account(
            riot_account_id=
                riot_account_id,

            user=
                user,

            db=
                db,
        )
    )

    service = (
        CoachingApiService(
            db
        )
    )

    try:

        return (
            service.get_player_matches(
                riot_account_id=
                    riot_account.id,

                limit=
                    limit,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ==========================================================
# INDIVIDUAL MATCH ANALYSIS
# ==========================================================

@router.get(
    "/riot-account/{riot_account_id}/matches/{riot_match_id}"
)
def get_match_analysis(
    riot_account_id: int,
    riot_match_id: str,

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    riot_account = (
        require_owned_riot_account(
            riot_account_id=
                riot_account_id,

            user=
                user,

            db=
                db,
        )
    )

    service = (
        CoachingApiService(
            db
        )
    )

    try:

        return (
            service.get_match_analysis(
                riot_account_id=
                    riot_account.id,

                riot_match_id=
                    riot_match_id,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ==========================================================
# GENERATE / REFRESH MATCH ANALYSES
# ==========================================================

@router.post(
    "/riot-account/{riot_account_id}/refresh"
)
def refresh_player_coaching(
    riot_account_id: int,

    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),

    force: bool = Query(
        default=False
    ),

    user: User = Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    ),
):

    riot_account = (
        require_owned_riot_account(
            riot_account_id=
                riot_account_id,

            user=
                user,

            db=
                db,
        )
    )

    service = (
        CoachingApiService(
            db
        )
    )

    try:

        return (
            service.refresh_player_analyses(
                riot_account_id=
                    riot_account.id,

                limit=
                    limit,

                force=
                    force,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )