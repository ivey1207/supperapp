#!/usr/bin/env python3
"""
Скрипт миграции БД для добавления недостающих полей
"""
import asyncio
import sqlite3
import os

async def migrate_database():
    """Миграция БД"""
    db_path = "carwash.db"
    
    if not os.path.exists(db_path):
        print("❌ БД не найдена!")
        return False
    
    print("🔄 Начинаем миграцию БД...")
    
    try:
        # Создаем подключение к SQLite
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("📋 Проверяем структуру таблиц...")
        
        # Проверяем таблицу bonus_tiers
        cursor.execute("PRAGMA table_info(bonus_tiers)")
        bonus_tiers_columns = [row[1] for row in cursor.fetchall()]
        print(f"bonus_tiers колонки: {bonus_tiers_columns}")
        
        # Добавляем колонку name если её нет
        if 'name' not in bonus_tiers_columns:
            print("➕ Добавляем колонку 'name' в bonus_tiers...")
            cursor.execute("ALTER TABLE bonus_tiers ADD COLUMN name TEXT")
            print("✅ Колонка 'name' добавлена в bonus_tiers")
        else:
            print("✅ Колонка 'name' уже существует в bonus_tiers")
        
        # Проверяем таблицу time_discounts
        cursor.execute("PRAGMA table_info(time_discounts)")
        time_discounts_columns = [row[1] for row in cursor.fetchall()]
        print(f"time_discounts колонки: {time_discounts_columns}")
        
        # Добавляем колонку name если её нет
        if 'name' not in time_discounts_columns:
            print("➕ Добавляем колонку 'name' в time_discounts...")
            cursor.execute("ALTER TABLE time_discounts ADD COLUMN name TEXT")
            print("✅ Колонка 'name' добавлена в time_discounts")
        else:
            print("✅ Колонка 'name' уже существует в time_discounts")
        
        # Сохраняем изменения
        conn.commit()
        conn.close()
        
        print("🎉 Миграция БД завершена успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(migrate_database())
