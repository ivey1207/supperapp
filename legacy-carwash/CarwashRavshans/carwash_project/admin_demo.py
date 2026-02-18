"""
🔐 ДЕМОНСТРАЦИЯ ПОЛНЫХ ВОЗМОЖНОСТЕЙ АДМИНИСТРАТОРА
===============================================

Этот файл показывает ВСЕ возможности администратора в системе CarWash Backend.
Администратор имеет ПОЛНЫЙ КОНТРОЛЬ над всей системой!
"""

import asyncio
import httpx
from datetime import datetime

class AdminDemonstration:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.token = None
        self.headers = {}

    async def authenticate(self):
        """Авторизация администратора"""
        print("🔐 АВТОРИЗАЦИЯ АДМИНИСТРАТОРА...")
        async with httpx.AsyncClient() as client:
            auth_data = {"username": "admin", "password": "admin"}
            response = await client.post(f"{self.base_url}/api/v1/auth/login", data=auth_data)
            if response.status_code == 200:
                self.token = response.json()["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                print("✅ Администратор успешно авторизован!")
                return True
            else:
                print("❌ Ошибка авторизации")
                return False

    async def demonstrate_posts_management(self):
        """Демонстрация управления постами"""
        print("\n📍 УПРАВЛЕНИЕ ПОСТАМИ МОЙКИ")
        print("-" * 40)
        
        async with httpx.AsyncClient() as client:
            # Получение всех постов
            response = await client.get(f"{self.base_url}/api/v1/admin/posts/", headers=self.headers)
            if response.status_code == 200:
                posts = response.json()
                print(f"✅ Получено постов: {len(posts)}")
                
                # Создание нового поста
                new_post = {
                    "name": "Пост VIP",
                    "status": "free",
                    "is_active": True
                }
                response = await client.post(f"{self.base_url}/api/v1/admin/posts/", json=new_post, headers=self.headers)
                if response.status_code == 201:
                    post = response.json()
                    print(f"✅ Создан новый пост: {post['name']} (ID: {post['id']})")
                    
                    # Обновление поста
                    update_data = {"name": "Пост VIP Обновленный"}
                    response = await client.put(f"{self.base_url}/api/v1/admin/posts/{post['id']}", json=update_data, headers=self.headers)
                    if response.status_code == 200:
                        print("✅ Пост успешно обновлен")

    async def demonstrate_services_management(self):
        """Демонстрация управления сервисами и ценами"""
        print("\n⚙️ УПРАВЛЕНИЕ СЕРВИСАМИ И ЦЕНАМИ")
        print("-" * 40)
        
        async with httpx.AsyncClient() as client:
            # Получение всех сервисов
            response = await client.get(f"{self.base_url}/api/v1/admin/services/", headers=self.headers)
            if response.status_code == 200:
                services = response.json()
                print(f"✅ Получено сервисов: {len(services)}")
                
                for service in services[:3]:  # Показываем первые 3
                    print(f"   • {service['name']}: {service['price_per_minute']} сум/мин")
                
                # Обновление цены сервиса
                if services:
                    service_id = services[0]['id']
                    new_price = services[0]['price_per_minute'] + 500  # Увеличиваем цену
                    update_data = {"price_per_minute": new_price}
                    
                    response = await client.put(f"{self.base_url}/api/v1/admin/services/{service_id}", json=update_data, headers=self.headers)
                    if response.status_code == 200:
                        print(f"✅ Цена сервиса '{services[0]['name']}' изменена на {new_price} сум/мин")

    async def demonstrate_rfid_management(self):
        """Демонстрация управления RFID картами"""
        print("\n🎫 УПРАВЛЕНИЕ RFID КАРТАМИ")
        print("-" * 40)
        
        async with httpx.AsyncClient() as client:
            # Получение всех карт
            response = await client.get(f"{self.base_url}/api/v1/admin/rfid-cards/", headers=self.headers)
            if response.status_code == 200:
                cards = response.json()
                print(f"✅ Получено карт: {len(cards)}")
                
                # Создание новой карты
                new_card = {
                    "uid": f"ADMIN_DEMO_{datetime.now().strftime('%H%M%S')}",
                    "holder_name": "Демо пользователь",
                    "balance": 100000.0,
                    "is_active": True
                }
                response = await client.post(f"{self.base_url}/api/v1/admin/rfid-cards/", json=new_card, headers=self.headers)
                if response.status_code == 201:
                    card = response.json()
                    print(f"✅ Создана новая карта: {card['uid']} с балансом {card['balance']} сум")

    async def demonstrate_loyalty_management(self):
        """Демонстрация управления бонусами и скидками"""
        print("\n🎁 УПРАВЛЕНИЕ БОНУСАМИ И СКИДКАМИ")
        print("-" * 40)
        
        async with httpx.AsyncClient() as client:
            # Создание бонусного яруса
            bonus_tier = {
                "name": "Демо бонус",
                "min_amount": 50000,
                "max_amount": 100000,
                "bonus_percent": 15,
                "is_active": True
            }
            response = await client.post(f"{self.base_url}/api/v1/admin/bonus-tiers/", json=bonus_tier, headers=self.headers)
            if response.status_code == 201:
                bonus = response.json()
                print(f"✅ Создан бонусный ярус: {bonus.get('name', 'Без названия')} ({bonus['bonus_percent']}%)")
            
            # Создание временной скидки
            time_discount = {
                "name": "Демо ночная скидка",
                "start_time": "01:00",
                "end_time": "05:00",
                "discount_percent": 20,
                "is_active": True
            }
            response = await client.post(f"{self.base_url}/api/v1/admin/time-discounts/", json=time_discount, headers=self.headers)
            if response.status_code == 201:
                discount = response.json()
                print(f"✅ Создана временная скидка: {discount.get('name', 'Без названия')} ({discount['discount_percent']}%)")

    async def demonstrate_statistics_access(self):
        """Демонстрация доступа к статистике"""
        print("\n📊 ДОСТУП К СТАТИСТИКЕ")
        print("-" * 40)
        
        async with httpx.AsyncClient() as client:
            today = datetime.now().strftime("%Y-%m-%d")
            response = await client.get(f"{self.base_url}/api/v1/statistics/revenue?start_date={today}&end_date={today}", headers=self.headers)
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ Статистика за {today}:")
                print(f"   • Общая выручка: {stats.get('total_revenue', 0)} сум")
                print(f"   • Количество сессий: {stats.get('session_count', 0)}")

    async def run_full_demonstration(self):
        """Запуск полной демонстрации возможностей"""
        print("🚀 ДЕМОНСТРАЦИЯ ПОЛНЫХ ВОЗМОЖНОСТЕЙ АДМИНИСТРАТОРА")
        print("=" * 60)
        
        if await self.authenticate():
            await self.demonstrate_posts_management()
            await self.demonstrate_services_management()
            await self.demonstrate_rfid_management()
            await self.demonstrate_loyalty_management()
            await self.demonstrate_statistics_access()
            
            print("\n🎯 ИТОГ ДЕМОНСТРАЦИИ:")
            print("✅ Администратор имеет ПОЛНЫЙ КОНТРОЛЬ над системой!")
            print("✅ Может управлять ВСЕМИ аспектами автомойки:")
            print("   • Постами и их статусами")
            print("   • Сервисами и ценами")
            print("   • RFID картами и балансами")
            print("   • Бонусной системой")
            print("   • Временными скидками")
            print("   • Статистикой и отчетами")
            print("   • И многим другим...")
        else:
            print("❌ Не удалось авторизоваться. Убедитесь, что сервер запущен.")

async def main():
    demo = AdminDemonstration()
    await demo.run_full_demonstration()

if __name__ == "__main__":
    print("💡 Для запуска демонстрации нужен работающий сервер!")
    print("   1. Запустите: uvicorn carwash_backend.main:app --reload")
    print("   2. Затем запустите: python admin_demo.py")
    print()
    # asyncio.run(main())  # Раскомментируйте когда сервер будет запущен
