#!/bin/bash

# Скрипт для развертывания CarWash системы

set -e

echo "🚗 CarWash Management System - Deployment Script"
echo "================================================="

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

echo "✅ Docker и Docker Compose найдены"

# Создаем .env файл если не существует
if [ ! -f .env ]; then
    echo "📝 Создание .env файла..."
    cp .env.example .env
    echo "⚠️  Пожалуйста, отредактируйте .env файл и установите правильные значения"
fi

# Создаем необходимые директории
echo "📁 Создание директорий..."
mkdir -p data logs

# Проверяем SSL сертификаты
if [ ! -f fullchain.pem ] || [ ! -f private.key ]; then
    echo "🔒 SSL сертификаты не найдены. Создаем self-signed сертификат..."
    
    # Создаем self-signed сертификат для разработки
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout private.key \
        -out fullchain.pem \
        -subj "/C=UZ/ST=Tashkent/L=Tashkent/O=CarWash/CN=localhost"
    
    echo "✅ Self-signed сертификат создан"
    echo "⚠️  Для продакшена используйте настоящие SSL сертификаты!"
fi

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Собираем и запускаем контейнеры
echo "🔨 Сборка и запуск контейнеров..."
docker-compose up --build -d

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📋 Доступные сервисы:"
echo "   🌐 Frontend (HTTPS): https://localhost"
echo "   🔧 Backend API: https://localhost/api/v1/"
echo "   📚 Swagger UI: https://localhost/docs"
echo "   📖 ReDoc: https://localhost/redoc"
echo ""
echo "🔐 Desktop API учетные данные:"
echo "   Username: desktop_client"
echo "   Password: carwash_desktop_2024!"
echo ""
echo "👨‍💼 Admin учетные данные:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "📊 Проверка статуса:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"

# Ждем запуска сервисов
echo ""
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверяем здоровье сервисов
echo "🏥 Проверка здоровья сервисов..."
docker-compose ps
