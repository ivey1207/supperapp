#!/usr/bin/env python3
"""
🗄️ SIMPLE DATABASE INIT
Простая инициализация базы данных
"""

from sqlalchemy import create_engine
from carwash_backend.db.database import Base
from carwash_backend.core.config import settings
from carwash_backend.db.models import *  # Импортируем все модели

def init_database():
    """Инициализация базы данных"""
    print("🗄️ Инициализация базы данных...")
    
    # Создаем синхронный engine для SQLite
    sync_url = settings.db.url.replace("sqlite+aiosqlite", "sqlite")
    engine = create_engine(sync_url)
    
    # Создаем все таблицы
    Base.metadata.create_all(bind=engine)
    
    print("✅ База данных инициализирована!")
    print("📊 Готово к тестированию платежной системы")

if __name__ == "__main__":
    init_database()
