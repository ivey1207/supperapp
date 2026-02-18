"""
Быстрый тест основных компонентов без запуска сервера
"""
import asyncio
import sys
from pathlib import Path

# Добавляем путь к проекту
project_root = Path(__file__).parent
sys.path.append(str(project_root))

async def test_imports():
    """Тест импорта всех модулей"""
    print("🔧 ТЕСТИРОВАНИЕ ИМПОРТОВ...")
    
    try:
        from carwash_backend.main import app
        print("✅ main.py импортирован")
        
        from carwash_backend.db import models, schemas, repository
        print("✅ База данных модули импортированы")
        
        from carwash_backend.core.session_manager import session_manager
        print("✅ Session manager импортирован")
        
        from carwash_backend.core.loyalty_manager import loyalty_manager
        print("✅ Loyalty manager импортирован")
        
        from carwash_backend.core.command_utils import service_manager
        print("✅ Command utils импортированы")
        
        from carwash_backend.core.config import settings
        print("✅ Конфигурация импортирована")
        
        # Тест платежных шлюзов
        from carwash_backend.core.payment_gateways.click_handler import click_handler
        from carwash_backend.core.payment_gateways.payme_handler import payme_handler
        from carwash_backend.core.payment_gateways.uzum_handler import uzum_handler
        print("✅ Платежные шлюзы импортированы")
        
        # Тест эндпоинтов
        from carwash_backend.api.v1.endpoints import (
            auth, admin_panel, controller, loyalty, 
            statistics, rfid_scanner, public, websockets
        )
        print("✅ Все эндпоинты импортированы")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка импорта: {e}")
        return False

async def test_database_models():
    """Тест моделей базы данных"""
    print("\n📁 ТЕСТИРОВАНИЕ МОДЕЛЕЙ БД...")
    
    try:
        from carwash_backend.db.models import (
            Admin, Post, Service, RfidCard, WashSession, 
            Transaction, BonusTier, TimeDiscount
        )
        
        print("✅ Все модели базы данных доступны")
        
        # Проверяем, что у моделей есть нужные поля
        admin_fields = ['username', 'hashed_password']
        for field in admin_fields:
            if hasattr(Admin, field):
                print(f"✅ Admin.{field} exists")
            else:
                print(f"❌ Admin.{field} missing")
        
        post_fields = ['name', 'status', 'is_active']
        for field in post_fields:
            if hasattr(Post, field):
                print(f"✅ Post.{field} exists")
            else:
                print(f"❌ Post.{field} missing")
        
        rfid_fields = ['uid', 'balance', 'is_active']
        for field in rfid_fields:
            if hasattr(RfidCard, field):
                print(f"✅ RfidCard.{field} exists")
            else:
                print(f"❌ RfidCard.{field} missing")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования моделей: {e}")
        return False

async def test_services_creation():
    """Тест создания сервисов по умолчанию"""
    print("\n⚙️ ТЕСТИРОВАНИЕ СОЗДАНИЯ СЕРВИСОВ...")
    
    try:
        from carwash_backend.core.command_utils import service_manager
        
        services = service_manager.create_default_services()
        
        print(f"✅ Создано {len(services)} сервисов по умолчанию:")
        
        required_services = ["Вода", "Турбо-вода", "Активная химия", "Нано-шампунь", "Воск", "Осмос", "Тёплая вода"]
        
        for service in services:
            print(f"  - {service['name']}: {service['command_str']} ({service['price_per_minute']} сум/мин)")
        
        # Проверяем, что все нужные сервисы есть
        service_names = [s['name'] for s in services]
        missing_services = [name for name in required_services if name not in service_names]
        
        if missing_services:
            print(f"❌ Отсутствуют сервисы: {missing_services}")
            return False
        else:
            print("✅ Все требуемые сервисы из ТЗ присутствуют")
            return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования сервисов: {e}")
        return False

async def test_config_loading():
    """Тест загрузки конфигурации"""
    print("\n⚙️ ТЕСТИРОВАНИЕ КОНФИГУРАЦИИ...")
    
    try:
        from carwash_backend.core.config import load_config, settings
        
        config = load_config()
        print(f"✅ Конфигурация загружена: {len(config)} секций")
        
        # Проверяем основные секции
        required_sections = ['posts', 'loyalty', 'payment_gateways', 'network']
        for section in required_sections:
            if section in config:
                print(f"✅ Секция '{section}' найдена")
            else:
                print(f"⚠️  Секция '{section}' отсутствует")
        
        # Проверяем настройки
        print(f"✅ Network settings: {settings.network.api_host}:{settings.network.api_port}")
        print(f"✅ Loyalty enabled: {settings.loyalty.enabled}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования конфигурации: {e}")
        return False

async def test_schemas():
    """Тест схем валидации"""
    print("\n📋 ТЕСТИРОВАНИЕ СХЕМ ВАЛИДАЦИИ...")
    
    try:
        from carwash_backend.db import schemas
        
        # Тест создания схемы админа
        admin_data = schemas.AdminCreate(username="test", password="test123")
        print(f"✅ AdminCreate: {admin_data.username}")
        
        # Тест создания схемы поста
        post_data = schemas.PostCreate(name="Test Post", status="free", is_active=True)
        print(f"✅ PostCreate: {post_data.name}")
        
        # Тест создания схемы сервиса
        service_data = schemas.ServiceCreate(
            name="Test Service", 
            price_per_minute=1000.0, 
            command_str="TEST_ON"
        )
        print(f"✅ ServiceCreate: {service_data.name}")
        
        # Тест создания схемы RFID карты
        rfid_data = schemas.RfidCardCreate(
            uid="TEST123", 
            holder_name="Test User", 
            balance=10000.0
        )
        print(f"✅ RfidCardCreate: {rfid_data.uid}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования схем: {e}")
        return False

async def main():
    """Главная функция быстрого тестирования"""
    print("🚀 БЫСТРОЕ ТЕСТИРОВАНИЕ CARWASH BACKEND")
    print("=" * 50)
    
    tests = [
        ("Импорты модулей", test_imports),
        ("Модели базы данных", test_database_models),
        ("Создание сервисов", test_services_creation),
        ("Загрузка конфигурации", test_config_loading),
        ("Схемы валидации", test_schemas),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Критическая ошибка в тесте '{test_name}': {e}")
            results.append((test_name, False))
    
    # Итоги
    print("\n" + "="*50)
    print("📊 ИТОГИ БЫСТРОГО ТЕСТИРОВАНИЯ:")
    print("="*50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.ljust(25)}: {status}")
        if result:
            passed += 1
    
    print(f"\n📈 РЕЗУЛЬТАТ: {passed}/{total} тестов прошли успешно")
    
    if passed == total:
        print("🎉 ВСЕ БЫСТРЫЕ ТЕСТЫ ПРОШЛИ! СИСТЕМА ГОТОВА К ЗАПУСКУ!")
        print("💡 Теперь можно запустить полное тестирование: python run_tests.py")
    else:
        print("⚠️  Некоторые тесты не прошли. Проверьте ошибки выше.")
    
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
