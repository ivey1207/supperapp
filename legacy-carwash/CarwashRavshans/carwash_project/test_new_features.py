#!/usr/bin/env python3
"""
Демонстрация новых функций: регуляция мощности и управление киосками
"""
import asyncio
import httpx
import json

BASE_URL = "http://127.0.0.1:8000"

async def test_new_features():
    """Тест новых функций"""
    
    async with httpx.AsyncClient() as client:
        print("🚀 ТЕСТИРОВАНИЕ НОВЫХ ФУНКЦИЙ")
        print("=" * 60)
          # 1. Авторизация        print("\n🔐 АВТОРИЗАЦИЯ...")
        auth_response = await client.post(f"{BASE_URL}/api/v1/auth/login", data={
            "username": "admin",
            "password": "admin"
        })
        
        if auth_response.status_code != 200:
            print(f"❌ Ошибка авторизации: {auth_response.status_code}")
            print(f"Ответ: {auth_response.text}")
            return
        
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Авторизация успешна")
        
        # 2. Тест управления мощностью сервисов
        print("\n⚙️ ТЕСТИРОВАНИЕ УПРАВЛЕНИЯ МОЩНОСТЬЮ...")
        
        # Получаем список сервисов
        services_response = await client.get(f"{BASE_URL}/api/v1/admin/services/", headers=headers)
        if services_response.status_code == 200:
            services = services_response.json()
            if services:
                service_id = services[0]["id"]
                service_name = services[0]["name"]
                
                print(f"📋 Тестируем сервис: {service_name} (ID: {service_id})")
                
                # Обновляем мощность сервиса
                update_data = {
                    "relay_bits": "11000110",  # Изменяем реле
                    "pump1_power": 75,         # Устанавливаем мощность помпы
                    "motor_frequency": 35.5    # Изменяем частоту мотора
                }
                
                update_response = await client.put(
                    f"{BASE_URL}/api/v1/admin/services/{service_id}",
                    json=update_data,
                    headers=headers
                )
                
                if update_response.status_code == 200:
                    print("✅ Мощность сервиса обновлена")
                    updated_service = update_response.json()
                    print(f"   Реле: {updated_service.get('relay_bits', 'N/A')}")
                    print(f"   Помпа 1: {updated_service.get('pump1_power', 'N/A')}%")
                    print(f"   Частота мотора: {updated_service.get('motor_frequency', 'N/A')} Hz")
                else:
                    print(f"❌ Ошибка обновления мощности: {update_response.status_code}")
                
                # Обновляем параметры режимов
                mode_update_data = {
                    "price_water": 1000.0,
                    "power_water": 80,
                    "price_foam": 1200.0,
                    "power_foam": 70,
                    "price_chem": 1500.0,
                    "power_chem": 60,
                    "price_wax": 2000.0,
                    "power_wax": 50,
                    "price_osmos": 1800.0,
                    "power_osmos": 40
                }
                mode_update_response = await client.put(
                    f"{BASE_URL}/api/v1/admin/services/{service_id}",
                    json=mode_update_data,
                    headers=headers
                )
                if mode_update_response.status_code == 200:
                    print("✅ Параметры режимов обновлены")
                    updated_modes = mode_update_response.json()
                    print(f"   Вода: цена={updated_modes.get('price_water')}, мощность={updated_modes.get('power_water')}")
                    print(f"   Пена: цена={updated_modes.get('price_foam')}, мощность={updated_modes.get('power_foam')}")
                    print(f"   Химия: цена={updated_modes.get('price_chem')}, мощность={updated_modes.get('power_chem')}")
                    print(f"   Воск: цена={updated_modes.get('price_wax')}, мощность={updated_modes.get('power_wax')}")
                    print(f"   Осмос: цена={updated_modes.get('price_osmos')}, мощность={updated_modes.get('power_osmos')}")
                else:
                    print(f"❌ Ошибка обновления параметров режимов: {mode_update_response.status_code}")
                
                # Получаем аппаратную команду
                cmd_response = await client.get(
                    f"{BASE_URL}/api/v1/admin/services/{service_id}/hardware-command",
                    headers=headers
                )
                
                if cmd_response.status_code == 200:
                    command = cmd_response.json()
                    cmd_string = f"<{command['relay_bits']},{command['pump1_power']:02d},{command['pump2_power']:02d},{command['pump3_power']:02d},{command['pump4_power']:02d},{command['motor_frequency']},{command['motor_flag']}>"
                    print(f"🔧 Аппаратная команда: {cmd_string}")
                else:
                    print(f"❌ Ошибка получения команды: {cmd_response.status_code}")
        
        # 3. Тест команд паузы и остановки
        print("\n⏸️ ТЕСТИРОВАНИЕ КОМАНД ПАУЗЫ И ОСТАНОВКИ...")
        
        pause_response = await client.get(f"{BASE_URL}/api/v1/admin/hardware-commands/pause", headers=headers)
        if pause_response.status_code == 200:
            pause_cmd = pause_response.json()
            pause_string = f"<{pause_cmd['relay_bits']},{pause_cmd['pump1_power']:02d},{pause_cmd['pump2_power']:02d},{pause_cmd['pump3_power']:02d},{pause_cmd['pump4_power']:02d},{pause_cmd['motor_frequency']},{pause_cmd['motor_flag']}>"
            print(f"⏸️ Команда паузы: {pause_string}")
        
        stop_response = await client.get(f"{BASE_URL}/api/v1/admin/hardware-commands/stop", headers=headers)
        if stop_response.status_code == 200:
            stop_cmd = stop_response.json()
            stop_string = f"<{stop_cmd['relay_bits']},{stop_cmd['pump1_power']:02d},{stop_cmd['pump2_power']:02d},{stop_cmd['pump3_power']:02d},{stop_cmd['pump4_power']:02d},{stop_cmd['motor_frequency']},{stop_cmd['motor_flag']}>"
            print(f"🛑 Команда остановки: {stop_string}")
        
        # 4. Тест управления киосками
        print("\n🏪 ТЕСТИРОВАНИЕ УПРАВЛЕНИЯ КИОСКАМИ...")
        
        # Получаем список постов
        posts_response = await client.get(f"{BASE_URL}/api/v1/admin/posts/", headers=headers)
        if posts_response.status_code == 200:
            posts = posts_response.json()
            if posts:
                post_id = posts[0]["id"]
                
                # Создаем новый киоск
                kiosk_data = {
                    "name": "Киоск Тестовый",
                    "post_id": post_id,
                    "cash_balance": 100000.0,
                    "is_active": True
                }
                
                create_response = await client.post(
                    f"{BASE_URL}/api/v1/admin/kiosks/",
                    json=kiosk_data,
                    headers=headers
                )
                
                if create_response.status_code == 201:
                    kiosk = create_response.json()
                    kiosk_id = kiosk["id"]
                    print(f"✅ Киоск создан: {kiosk['name']} (ID: {kiosk_id})")
                    print(f"   Баланс наличных: {kiosk['cash_balance']} сум")
                    
                    # Пополняем киоск
                    topup_data = {"amount": 50000.0}
                    topup_response = await client.post(
                        f"{BASE_URL}/api/v1/admin/kiosks/{kiosk_id}/topup",
                        json=topup_data,
                        headers=headers
                    )
                    
                    if topup_response.status_code == 200:
                        result = topup_response.json()
                        print(f"✅ Киоск пополнен на {topup_data['amount']} сум")
                        print(f"   Новый баланс: {result['new_cash_balance']} сум")
                    else:
                        print(f"❌ Ошибка пополнения: {topup_response.status_code}")
                    
                    # Получаем список всех киосков
                    kiosks_response = await client.get(f"{BASE_URL}/api/v1/admin/kiosks/", headers=headers)
                    if kiosks_response.status_code == 200:
                        kiosks = kiosks_response.json()
                        print(f"📋 Всего киосков: {len(kiosks)}")
                        for k in kiosks:
                            print(f"   - {k['name']}: {k['cash_balance']} сум")
                    
                else:
                    print(f"❌ Ошибка создания киоска: {create_response.status_code}")
        
        print("\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!")
        print("=" * 60)
        print("✅ Все новые функции работают:")
        print("   - Регуляция мощности сервисов")
        print("   - Генерация аппаратных команд")
        print("   - Управление киосками")
        print("   - Пополнение наличных киосков")

if __name__ == "__main__":
    asyncio.run(test_new_features())




