"""
Миграция: добавление параметров режимов (цена и мощность) в таблицу services
"""
from sqlalchemy import Column, Float, Integer
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import asyncio

DATABASE_URL = "sqlite+aiosqlite:///./carwash.db"  # Измените на свой URL

def get_add_column_sql(column_name, column_type):
    return f'ALTER TABLE services ADD COLUMN {column_name} {column_type} DEFAULT 0;'

async def migrate():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # Добавляем price_* и power_* для всех режимов
        for col, typ in [
            ("price_water", "FLOAT"), ("power_water", "INTEGER"),
            ("price_foam", "FLOAT"), ("power_foam", "INTEGER"),
            ("price_chem", "FLOAT"), ("power_chem", "INTEGER"),
            ("price_wax", "FLOAT"), ("power_wax", "INTEGER"),
            ("price_osmos", "FLOAT"), ("power_osmos", "INTEGER")
        ]:
            try:
                await conn.execute(text(get_add_column_sql(col, typ)))
            except Exception as e:
                print(f"Column {col} may already exist: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
