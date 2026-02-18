#!/usr/bin/env python3
"""
Тест нового endpoint для статистики клиентов
"""
import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000"

async def test_client_statistics():
    """Тест статистики клиентов"""
    
    async with httpx.AsyncClient() as client:
        print("🧪 ТЕСТИРОВАНИЕ СТАТИСТИКИ КЛИЕНТОВ")
        print("=" * 50)
        
        # 1. Авторизация
        auth_response = await client.post(f"{BASE_URL}/api/v1/auth/login", data={
            "username": "admin",
            "password": "admin"
        })
        
        if auth_response.status_code != 200:
            print(f"❌ Ошибка авторизации: {auth_response.status_code}")
            return
        
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Авторизация успешна")
        
        # 2. Получение статистики клиентов
        print("\n📊 ПОЛУЧЕНИЕ СТАТИСТИКИ КЛИЕНТОВ...")
        
        stats_response = await client.get(f"{BASE_URL}/api/v1/statistics/clients", headers=headers)
        
        if stats_response.status_code == 200:
            stats = stats_response.json()
            print("✅ Статистика получена:")
            print(f"   📈 Всего клиентов (last month): {stats['total_clients']}")
            print(f"   👥 Пришло клиентов (на этой неделе): {stats['active_clients_this_week']}")
            print(f"   🆕 Новые клиенты (на этой неделе): {stats['new_clients_this_week']}")
            
            print(f"\n📅 Периоды:")
            print(f"   Текущая неделя с: {stats['period_info']['current_week_start']}")
            print(f"   Прошлый месяц: {stats['period_info']['last_month_start']} - {stats['period_info']['last_month_end']}")
            
            print(f"\n🎯 ВИДЖЕТЫ ДЛЯ ФРОНТЕНДА:")
            print(f"   Всего клиентов: {stats['total_clients']}")
            print(f"   Пришло клиентов: {stats['active_clients_this_week']}")  
            print(f"   Новые клиенты: {stats['new_clients_this_week']}")
            
        else:
            print(f"❌ Ошибка получения статистики: {stats_response.status_code}")
            print(f"Ответ: {stats_response.text}")
        
        print("\n🎉 ТЕСТ ЗАВЕРШЕН!")

if __name__ == "__main__":
    asyncio.run(test_client_statistics())
