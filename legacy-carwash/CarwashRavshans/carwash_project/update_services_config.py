#!/usr/bin/env python3
"""
Обновление существующих сервисов предустановленными конфигурациями
"""
import asyncio
import sqlite3
from carwash_backend.core.hardware_commands import PREDEFINED_SERVICES

async def update_services_config():
    """Обновляем сервисы предустановленными конфигурациями"""
    db_path = "carwash.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Обновляем конфигурации сервисов...")
        
        # Получаем все сервисы
        cursor.execute("SELECT id, name FROM services")
        services = cursor.fetchall()
        
        for service_id, service_name in services:
            if service_name in PREDEFINED_SERVICES:
                config = PREDEFINED_SERVICES[service_name]
                print(f"⚙️ Обновляем {service_name}...")
                
                cursor.execute("""
                    UPDATE services SET 
                        relay_bits = ?,
                        pump1_power = ?,
                        pump2_power = ?,
                        pump3_power = ?,
                        pump4_power = ?,
                        motor_frequency = ?,
                        motor_flag = ?
                    WHERE id = ?
                """, (
                    config["relay_bits"],
                    config["pump1_power"],
                    config["pump2_power"],
                    config["pump3_power"],
                    config["pump4_power"],
                    config["motor_frequency"],
                    config["motor_flag"],
                    service_id
                ))
                print(f"✅ {service_name} обновлен")
            else:
                print(f"⚠️ Нет предустановки для {service_name}")
        
        conn.commit()
        conn.close()
        
        print("🎉 Конфигурации сервисов обновлены!")
        
    except Exception as e:
        print(f"❌ Ошибка обновления: {e}")

if __name__ == "__main__":
    asyncio.run(update_services_config())
