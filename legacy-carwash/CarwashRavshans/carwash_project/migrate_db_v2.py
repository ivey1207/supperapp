#!/usr/bin/env python3
"""
Миграция БД для добавления полей управления мощностью и киосков
"""
import asyncio
import sqlite3
import os

async def migrate_database_v2():
    """Миграция БД - добавление новых полей"""
    db_path = "carwash.db"
    
    if not os.path.exists(db_path):
        print("❌ БД не найдена!")
        return False
    
    print("🔄 Начинаем миграцию БД v2...")
    
    try:
        # Создаем подключение к SQLite
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("📋 Проверяем структуру таблиц...")
        
        # Проверяем таблицу services
        cursor.execute("PRAGMA table_info(services)")
        services_columns = [row[1] for row in cursor.fetchall()]
        print(f"services колонки: {services_columns}")
        
        # Добавляем новые поля в services
        new_service_fields = [
            ("relay_bits", "TEXT DEFAULT '00000000'"),
            ("pump1_power", "INTEGER DEFAULT 0"),
            ("pump2_power", "INTEGER DEFAULT 0"),
            ("pump3_power", "INTEGER DEFAULT 0"),
            ("pump4_power", "INTEGER DEFAULT 0"),
            ("motor_frequency", "REAL DEFAULT 0.0"),
            ("motor_flag", "TEXT DEFAULT 'S'")
        ]
        
        for field_name, field_type in new_service_fields:
            if field_name not in services_columns:
                print(f"➕ Добавляем поле '{field_name}' в services...")
                cursor.execute(f"ALTER TABLE services ADD COLUMN {field_name} {field_type}")
                print(f"✅ Поле '{field_name}' добавлено в services")
            else:
                print(f"✅ Поле '{field_name}' уже существует в services")
        
        # Создаем таблицу kiosks
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='kiosks'")
        if not cursor.fetchone():
            print("➕ Создаем таблицу kiosks...")
            cursor.execute("""
                CREATE TABLE kiosks (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    post_id INTEGER NOT NULL,
                    cash_balance REAL DEFAULT 0.0,
                    is_active BOOLEAN DEFAULT 1,
                    last_maintenance DATETIME,
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                )
            """)
            print("✅ Таблица kiosks создана")
        else:
            print("✅ Таблица kiosks уже существует")
        
        # Сохраняем изменения
        conn.commit()
        conn.close()
        
        print("🎉 Миграция БД v2 завершена успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(migrate_database_v2())
