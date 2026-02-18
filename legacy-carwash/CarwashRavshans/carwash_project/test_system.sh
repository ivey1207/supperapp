#!/bin/bash

# Скрипт для тестирования CarWash System после изменений

echo "🔄 Перезапуск nginx с новой конфигурацией..."
docker-compose restart nginx

echo "⏳ Ждем 5 секунд для стабилизации..."
sleep 5

echo "🔍 Проверка конфигурации nginx..."
docker exec carwash_nginx nginx -t

echo "📊 Статус контейнеров:"
docker ps | grep carwash

echo "🌐 Тестирование endpoints:"

# Получаем IP сервера
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "🏠 Тестирование главной страницы..."
curl -k -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://$SERVER_IP/"

echo "📖 Тестирование Swagger UI..."
curl -k -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://$SERVER_IP/docs"

echo "🔧 Тестирование API..."
curl -k -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://$SERVER_IP/api/v1/"

echo "🖥️ Тестирование Desktop API..."
curl -k -s -o /dev/null -w "HTTP Status: %{http_code}\n" -u "desktop_client:carwash_desktop_2024!" "https://$SERVER_IP/api/v1/desktop/health"

echo "✅ Тестирование завершено!"
echo "🌐 Система доступна по адресу: https://$SERVER_IP"
echo "📖 Swagger UI: https://$SERVER_IP/docs"
echo "🔐 Desktop API: https://$SERVER_IP/api/v1/desktop/"

echo "📝 Последние логи nginx:"
docker logs carwash_nginx --tail=5
