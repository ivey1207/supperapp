from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from carwash_backend.core.config import settings
from typing import AsyncGenerator

engine = create_async_engine(
    settings.db.url, 
    echo=settings.db.echo, 
    future=True,
    connect_args={
        "check_same_thread": False,
        "timeout": 30
    },
    pool_pre_ping=True,
    pool_recycle=300
)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session