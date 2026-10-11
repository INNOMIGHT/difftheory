import hashlib
import secrets

from datetime import (
    datetime,
    timedelta,
)

from sqlalchemy.orm import Session

from app.models.beta_session import BetaSession
from app.models.user import User


class BetaSessionService:

    SESSION_DAYS = 30


    def __init__(
        self,
        db: Session,
    ):
        self.db = db


    @staticmethod
    def _hash_token(
        token: str,
    ) -> str:
        return hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()


    def create_session(
        self,
        user: User,
    ) -> str:

        raw_token = secrets.token_urlsafe(
            48
        )

        token_hash = self._hash_token(
            raw_token
        )

        session = BetaSession(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=(
                datetime.utcnow()
                + timedelta(
                    days=self.SESSION_DAYS
                )
            ),
        )

        user.last_login_at = (
            datetime.utcnow()
        )

        self.db.add(
            session
        )

        self.db.commit()

        return raw_token


    def get_user_from_token(
        self,
        token: str,
    ) -> User | None:

        if not token:
            return None

        token_hash = self._hash_token(
            token
        )

        session = (
            self.db.query(
                BetaSession
            )
            .filter(
                BetaSession.token_hash
                == token_hash
            )
            .first()
        )

        if not session:
            return None

        if (
            session.expires_at
            <= datetime.utcnow()
        ):
            self.db.delete(
                session
            )

            self.db.commit()

            return None

        session.last_used_at = (
            datetime.utcnow()
        )

        self.db.commit()

        return session.user


    def revoke_session(
        self,
        token: str,
    ) -> None:

        token_hash = self._hash_token(
            token
        )

        session = (
            self.db.query(
                BetaSession
            )
            .filter(
                BetaSession.token_hash
                == token_hash
            )
            .first()
        )

        if session:
            self.db.delete(
                session
            )

            self.db.commit()