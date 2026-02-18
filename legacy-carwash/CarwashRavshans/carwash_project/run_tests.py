"""
Скрипт для запуска CarWash Backend с полным тестированием
"""
import asyncio
import uvicorn
import threading
import time
import subprocess
import sys
from pathlib import Path

def start_server():
    """Запуск FastAPI сервера"""
    print("🚀 Запуск CarWash Backend сервера...")
    uvicorn.run(
        "carwash_backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )

async def run_tests():
    """Запуск тестов после старта сервера"""
    print("⏳ Ожидание запуска сервера...")
    await asyncio.sleep(5)  # Ждем 5 секунд для запуска сервера
    
    print("🧪 Запуск тестирования...")
    
    # Импортируем и запускаем тесты
    try:
        from tests.test_full_system import TestCarWashSystem
        test_system = TestCarWashSystem()
        await test_system.run_all_tests()
    except ImportError as e:
        print(f"❌ Ошибка импорта тестов: {e}")
        print("Запускаем тесты через subprocess...")
        
        # Альтернативный способ запуска
        result = subprocess.run([
            sys.executable, 
            "tests/test_full_system.py"
        ], capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print(f"STDERR: {result.stderr}")

def main():
    """Главная функция"""
    print("=" * 60)
    print("🏗️  CARWASH BACKEND - ТЕСТИРОВАНИЕ СИСТЕМЫ")
    print("=" * 60)
    
    # Запускаем сервер в отдельном потоке
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Запускаем тесты
    try:
        asyncio.run(run_tests())
    except KeyboardInterrupt:
        print("\n🛑 Тестирование прервано пользователем")
    except Exception as e:
        print(f"❌ Ошибка при тестировании: {e}")
    
    print("\n🏁 Тестирование завершено")

if __name__ == "__main__":
    main()
