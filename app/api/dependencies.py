from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy.orm import Session

from app.database.database import (
    get_db,
)
from app.models.user import User
from app.services.beta_session_service import (
    BetaSessionService,
)


bearer_scheme = HTTPBearer(
    auto_error=False,
)


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> str:

    if (
        credentials is None
        or credentials.scheme.lower()
        != "bearer"
        or not credentials.credentials
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Authentication required.",
        )

    return credentials.credentials


def get_current_user(
    token: str = Depends(
        get_bearer_token
    ),
    db: Session = Depends(
        get_db
    ),
) -> User:

    service = BetaSessionService(
        db
    )

    user = service.get_user_from_token(
        token
    )

    if not user:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail="Session is invalid or expired.",
        )

    return user