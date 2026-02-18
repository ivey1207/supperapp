from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, HTTPBasic, HTTPBasicCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
from typing import Optional

from carwash_backend.core import security
from carwash_backend.db import repository, models, schemas
from carwash_backend.db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
basic_auth = HTTPBasic(auto_error=False)

DESKTOP_USERNAME = "desktop_client"
DESKTOP_PASSWORD = "carwash_desktop_2024!"
CONTROLLER_API_KEY = "super_secret_controller_key"

async def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> models.Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception

    admin = await repository.get_admin_by_username(db, username=token_data.username)
    if admin is None:
        raise credentials_exception
    return admin

async def verify_desktop_credentials(credentials: HTTPBasicCredentials = Depends(basic_auth)):

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Desktop credentials required",
            headers={"WWW-Authenticate": "Basic"},
        )

    is_correct_username = secrets.compare_digest(credentials.username, DESKTOP_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, DESKTOP_PASSWORD)
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect desktop credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

async def verify_controller_api_key(x_api_key: Optional[str] = Header(None)):

    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Add X-API-KEY header",
            headers={"WWW-Authenticate": "API-Key"},
        )

    CONTROLLER_API_KEY = "super_secret_controller_key"
    if not secrets.compare_digest(x_api_key, CONTROLLER_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "API-Key"},
        )

    return x_api_key
