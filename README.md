# Super-App (CarWash)

Полный проект: бэкенд (Spring Boot), админка (React), мобильное приложение (React Native / Expo).

## Стек

| Часть   | Технологии |
|--------|-------------|
| Backend | Java 21, Spring Boot, MongoDB, Redis, JWT |
| Admin   | React, Vite, Tailwind, Recharts. Тёмный дашборд как CarWash: KPI-карточки, графики, анимации, звуковые эффекты |
| Mobile | React Native (Expo). Дизайн в стиле Yandex Eats: карточки, ячейки, нижние вкладки |

## Запуск через Docker (бэкенд + админка)

```bash
# Сборка и запуск
docker compose up -d --build

# Остановка и удаление томов
docker compose down -v
```

После запуска:
- **Backend:** http://localhost:8080  
- **Admin:** http://localhost:3000  
- **MongoDB:** localhost:27017  
- **Redis:** localhost:6379  

Логин админки: **admin@admin.com** / **Admin1!**

## Мобильное приложение (React Native)

```bash
cd mobile-rn
npm install
npx expo start
# Далее: i — iOS, a — Android, w — web
```

Для доступа к API с телефона в `app.json` в `extra.apiUrl` укажи IP компьютера (например `http://192.168.1.10:8080`).

Вход в приложении: номер телефона → код из SMS (в dev код возвращается в ответе `devOtp`).

## Структура

```
uz-superapp/
├── backend/          # Spring Boot API
├── admin-super/      # React админка (CarWash-стиль)
├── mobile-rn/        # Expo React Native (Yandex Eats-стиль)
├── infra/            # nginx (опционально)
├── docker-compose.yml
└── README.md
```
