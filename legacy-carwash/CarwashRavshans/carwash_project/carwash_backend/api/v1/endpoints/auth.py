from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from carwash_backend.db import schemas, models
from carwash_backend.db.database import get_db
from carwash_backend.core import security
from carwash_backend.db import repository

router = APIRouter()

@router.post("/register", response_model=schemas.AdminOut, status_code=status.HTTP_201_CREATED)
async def create_admin(admin: schemas.AdminCreate, db: AsyncSession = Depends(get_db)):
    db_admin = await repository.get_admin_by_username(db, username=admin.username)
    if db_admin:
        raise HTTPException(status_code=400, detail="Username already registered")
    return await repository.create_admin(db=db, admin=admin)

@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    admin = await repository.authenticate_admin(db, username=form_data.username, password=form_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": admin.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}