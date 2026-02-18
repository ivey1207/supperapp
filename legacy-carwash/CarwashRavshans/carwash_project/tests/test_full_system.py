"""
Полное тестирование всей системы CarWash Backend
Проверяет ВСЕ функции из ТЗ
"""
import asyncio
import httpx
import pytest
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Добавляем путь к проекту
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from carwash_backend.main import app
from carwash_backend.db.database import get_db, engine, Base
from carwash_backend.db import repository, schemas, models
from carwash_backend.core.session_manager import session_manager
from carwash_backend.core.loyalty_manager import loyalty_manager

# Конфигурация тестирования
BASE_URL = "http://127.0.0.1:8000"
CONTROLLER_API_KEY = "super_secret_controller_key"

class TestCarWashSystem:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL)
        self.admin_token = ""
        self.test_results = {}
        
    async def setup_database(self):
        """Инициализация тестовой базы данных"""
        print("🔧 Настройка тестовой базы данных...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ База данных настроена")
        
    async def test_admin_authentication(self):
        """Тест аутентификации администратора"""
        print("\n🔐 ТЕСТИРОВАНИЕ АУТЕНТИФИКАЦИИ...")
        
        try:
            # Логин
            response = await self.client.post("/api/v1/auth/login", data={
                "username": "admin",
                "password": "admin"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.test_results["auth"] = "✅ PASSED"
                print(f"✅ Аутентификация успешна. Token: {self.admin_token[:20]}...")
                return True
            else:
                self.test_results["auth"] = f"❌ FAILED: {response.status_code}"
                print(f"❌ Ошибка аутентификации: {response.text}")
                return False
                
        except Exception as e:
            self.test_results["auth"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при аутентификации: {e}")
            return False
    
    async def test_posts_management(self):
        """Тест управления постами"""
        print("\n🏗️ ТЕСТИРОВАНИЕ УПРАВЛЕНИЯ ПОСТАМИ...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Создание поста
            post_data = {
                "name": "Тестовый пост 1",
                "status": "free",
                "is_active": True,
                "available_service_ids": []
            }
            
            response = await self.client.post("/api/v1/admin/posts/", json=post_data, headers=headers)
            if response.status_code == 201:
                post = response.json()
                print(f"✅ Пост создан: {post['name']} (ID: {post['id']})")
                
                # Получение постов
                response = await self.client.get("/api/v1/admin/posts/", headers=headers)
                if response.status_code == 200:
                    posts = response.json()
                    print(f"✅ Получено постов: {len(posts)}")
                    self.test_results["posts"] = "✅ PASSED"
                    return post['id']
                else:
                    self.test_results["posts"] = f"❌ FAILED: GET {response.status_code}"
                    return None
            else:
                self.test_results["posts"] = f"❌ FAILED: CREATE {response.status_code}"
                print(f"❌ Ошибка создания поста: {response.text}")
                return None
                
        except Exception as e:
            self.test_results["posts"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании постов: {e}")
            return None
    
    async def test_services_management(self):
        """Тест управления сервисами"""
        print("\n⚙️ ТЕСТИРОВАНИЕ УПРАВЛЕНИЯ СЕРВИСАМИ...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Получение сервисов (они должны создаваться автоматически)
            response = await self.client.get("/api/v1/admin/services/", headers=headers)
            if response.status_code == 200:
                services = response.json()
                print(f"✅ Получено сервисов: {len(services)}")
                
                if len(services) > 0:
                    # Проверяем, что есть нужные сервисы из ТЗ
                    service_names = [s['name'] for s in services]
                    required_services = ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]
                    
                    found_services = [name for name in required_services if name in service_names]
                    print(f"✅ Найдены сервисы из ТЗ: {found_services}")
                    
                    if len(found_services) >= 5:  # Хотя бы 5 из требуемых
                        self.test_results["services"] = "✅ PASSED"
                        return services[0]['id']  # Возвращаем ID первого сервиса
                    else:
                        self.test_results["services"] = f"❌ FAILED: Недостаточно сервисов из ТЗ ({len(found_services)}/7)"
                        return None
                else:
                    self.test_results["services"] = "❌ FAILED: Нет сервисов"
                    return None
            else:
                self.test_results["services"] = f"❌ FAILED: {response.status_code}"
                return None
                
        except Exception as e:
            self.test_results["services"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании сервисов: {e}")
            return None
    
    async def test_rfid_cards(self):
        """Тест управления RFID картами"""
        print("\n🎫 ТЕСТИРОВАНИЕ RFID КАРТ...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Создание RFID карты
            timestamp = int(time.time())
            card_data = {
                "uid": f"TEST_CARD_{timestamp}",
                "holder_name": "Тестовый пользователь",
                "balance": 50000.0,
                "is_active": True
            }
            
            response = await self.client.post("/api/v1/loyalty/register-card/", json=card_data, headers=headers)
            if response.status_code == 201:
                card = response.json()
                print(f"✅ RFID карта создана: {card['uid']} (баланс: {card['balance']})")
                
                # Тест пополнения карты
                topup_data = {"amount": 25000.0}
                response = await self.client.post(f"/api/v1/admin/rfid-cards/{card['uid']}/topup", json=topup_data, headers=headers)
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Карта пополнена. Новый баланс: {result.get('new_balance', 'N/A')}")
                    
                    # Тест блокировки карты
                    block_data = {"is_active": False}
                    response = await self.client.put(f"/api/v1/admin/rfid-cards/{card['uid']}/status", json=block_data, headers=headers)
                    if response.status_code == 200:
                        print("✅ Карта заблокирована")
                        self.test_results["rfid"] = "✅ PASSED"
                        return card['uid']
                    else:
                        self.test_results["rfid"] = f"❌ FAILED: BLOCK {response.status_code}"
                        return card['uid']
                else:
                    self.test_results["rfid"] = f"❌ FAILED: TOPUP {response.status_code}"
                    return card['uid']
            else:
                self.test_results["rfid"] = f"❌ FAILED: CREATE {response.status_code}"
                print(f"❌ Ошибка создания RFID карты: {response.text}")
                return None
                
        except Exception as e:
            self.test_results["rfid"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании RFID: {e}")
            return None
    
    async def test_loyalty_system(self):
        """Тест системы лояльности (бонусы и скидки)"""
        print("\n🎁 ТЕСТИРОВАНИЕ СИСТЕМЫ ЛОЯЛЬНОСТИ...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Создание бонусного яруса
            bonus_data = {
                "min_amount": 100000,
                "max_amount": 200000,
                "bonus_percent": 10,
                "name": "Тестовый бонус 10%"
            }
            
            response = await self.client.post("/api/v1/loyalty/bonus-tiers/", json=bonus_data, headers=headers)
            if response.status_code == 201:
                bonus = response.json()
                print(f"✅ Бонусный ярус создан: {bonus['name']} ({bonus['bonus_percent']}%)")
                
                # Создание временной скидки
                discount_data = {
                    "start_time": "02:00",
                    "end_time": "04:00", 
                    "discount_percent": 15,
                    "name": "Тестовая ночная скидка",
                    "is_active": True
                }
                
                response = await self.client.post("/api/v1/loyalty/time-discounts/", json=discount_data, headers=headers)
                if response.status_code == 201:
                    discount = response.json()
                    print(f"✅ Временная скидка создана: {discount['name']} ({discount['discount_percent']}%)")
                    self.test_results["loyalty"] = "✅ PASSED"
                    return True
                else:
                    self.test_results["loyalty"] = f"❌ FAILED: DISCOUNT {response.status_code}"
                    return False
            else:
                self.test_results["loyalty"] = f"❌ FAILED: BONUS {response.status_code}"
                print(f"❌ Ошибка создания бонуса: {response.text}")
                return False
                
        except Exception as e:
            self.test_results["loyalty"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании лояльности: {e}")
            return False
    
    async def test_payments_system(self):
        """Тест платежной системы"""
        print("\n💳 ТЕСТИРОВАНИЕ ПЛАТЕЖНОЙ СИСТЕМЫ...")
        
        try:
            # Тест получения доступных методов оплаты
            response = await self.client.get("/api/v1/payments-old/payment-methods")
            if response.status_code == 200:
                methods = response.json()
                print(f"✅ Получены методы оплаты: {len(methods['methods'])}")
                
                # Проверяем, что Click включен
                click_method = next((m for m in methods['methods'] if m['id'] == 'click'), None)
                if click_method and click_method['enabled']:
                    print("✅ Click платежи включены")
                    self.test_results["payments"] = "✅ PASSED"
                    return True
                else:
                    self.test_results["payments"] = "❌ FAILED: Click не включен"
                    return False
            else:
                self.test_results["payments"] = f"❌ FAILED: {response.status_code}"
                return False
                
        except Exception as e:
            self.test_results["payments"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании платежей: {e}")
            return False
    
    async def test_statistics_export(self):
        """Тест статистики и экспорта"""
        print("\n📊 ТЕСТИРОВАНИЕ СТАТИСТИКИ И ЭКСПОРТА...")
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            # Получение статистики
            today = datetime.now().strftime('%Y-%m-%d')
            params = {
                "start_date": today,
                "end_date": today
            }
            
            response = await self.client.get("/api/v1/statistics/revenue", params=params, headers=headers)
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ Статистика получена: {stats}")
                
                # Тест экспорта в Excel
                response = await self.client.get("/api/v1/statistics/export/excel", params=params, headers=headers)
                if response.status_code == 200:
                    print("✅ Excel экспорт работает")
                    self.test_results["statistics"] = "✅ PASSED"
                    return True
                else:
                    self.test_results["statistics"] = f"❌ FAILED: EXPORT {response.status_code}"
                    return False
            else:
                self.test_results["statistics"] = f"❌ FAILED: STATS {response.status_code}"
                return False
                
        except Exception as e:
            self.test_results["statistics"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании статистики: {e}")
            return False
    
    async def test_controller_api(self):
        """Тест API для контроллеров"""
        print("\n🎮 ТЕСТИРОВАНИЕ CONTROLLER API...")
        
        headers = {"X-API-KEY": CONTROLLER_API_KEY}
        
        try:
            # Получение доступных сервисов
            response = await self.client.get("/api/v1/controller/services/available", headers=headers)
            if response.status_code == 200:
                services = response.json()
                print(f"✅ Controller API: получено {len(services['services'])} сервисов")
                
                # Тест отправки события от контроллера
                event_data = {
                    "post_id": 1,
                    "event_type": "cash_inserted",
                    "data": {"amount": 5000}
                }
                
                response = await self.client.post("/api/v1/controller/events", json=event_data, headers=headers)
                if response.status_code == 200:
                    print("✅ Controller API: событие обработано")
                    self.test_results["controller"] = "✅ PASSED"
                    return True
                else:
                    self.test_results["controller"] = f"❌ FAILED: EVENT {response.status_code}"
                    return False
            else:
                self.test_results["controller"] = f"❌ FAILED: SERVICES {response.status_code}"
                return False
                
        except Exception as e:
            self.test_results["controller"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании Controller API: {e}")
            return False
    
    async def test_rfid_scanner(self):
        """Тест RFID сканера"""
        print("\n📡 ТЕСТИРОВАНИЕ RFID СКАНЕРА...")
        
        try:
            # Тест получения последнего UID
            response = await self.client.get("/api/v1/rfid-scanner/last-uid")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ RFID Scanner: {data}")
                self.test_results["rfid_scanner"] = "✅ PASSED"
                return True
            else:
                self.test_results["rfid_scanner"] = f"❌ FAILED: {response.status_code}"
                return False
                
        except Exception as e:
            self.test_results["rfid_scanner"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании RFID Scanner: {e}")
            return False
    
    async def test_public_api(self):
        """Тест публичного API"""
        print("\n🌐 ТЕСТИРОВАНИЕ PUBLIC API...")
        
        try:
            # Получение информации о постах
            response = await self.client.get("/api/v1/public/posts")
            if response.status_code == 200:
                posts = response.json()
                print(f"✅ Public API: получено {len(posts)} постов")
                self.test_results["public"] = "✅ PASSED"
                return True
            else:
                self.test_results["public"] = f"❌ FAILED: {response.status_code}"
                return False
                
        except Exception as e:
            self.test_results["public"] = f"❌ EXCEPTION: {e}"
            print(f"❌ Исключение при тестировании Public API: {e}")
            return False
    
    async def run_all_tests(self):
        """Запуск всех тестов"""
        print("🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ CARWASH\n")
        print("=" * 60)
        
        try:
            await self.setup_database()
            
            # Запускаем все тесты
            auth_success = await self.test_admin_authentication()
            if not auth_success:
                print("❌ Тестирование остановлено - ошибка аутентификации")
                return
            
            await self.test_posts_management()
            await self.test_services_management()
            await self.test_rfid_cards()
            await self.test_loyalty_system()
            await self.test_payments_system()
            await self.test_statistics_export()
            await self.test_controller_api()
            await self.test_rfid_scanner()
            await self.test_public_api()
            
            # Показываем итоги
            self.print_test_results()
            
        except Exception as e:
            print(f"❌ Критическая ошибка тестирования: {e}")
        finally:
            await self.client.aclose()
    
    def print_test_results(self):
        """Вывод результатов тестирования"""
        print("\n" + "=" * 60)
        print("📋 ИТОГИ ТЕСТИРОВАНИЯ:")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results.values() if "✅ PASSED" in r])
        
        for test_name, result in self.test_results.items():
            print(f"{test_name.ljust(20)}: {result}")
        
        print("\n" + "=" * 60)
        print(f"📊 РЕЗУЛЬТАТ: {passed_tests}/{total_tests} тестов прошли успешно")
        
        if passed_tests == total_tests:
            print("🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО! СИСТЕМА ГОТОВА К РАБОТЕ!")
        else:
            print(f"⚠️  {total_tests - passed_tests} тестов не прошли. Требуется доработка.")
        
        print("=" * 60)

# Главная функция для запуска тестов
async def main():
    """Главная функция тестирования"""
    test_system = TestCarWashSystem()
    await test_system.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
