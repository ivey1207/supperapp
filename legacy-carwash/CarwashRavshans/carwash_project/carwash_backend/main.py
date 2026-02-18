from contextlib import asynccontextmanager
import logging
import yaml
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import yaml
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from carwash_backend.db.database import engine, Base, async_session
from carwash_backend.db import repository, schemas
from carwash_backend.core.session_manager import session_manager
from carwash_backend.api.v1.endpoints import auth, admin_panel, websockets, controller, desktop
from carwash_backend.api.v1.endpoints import loyalty, statistics, rfid_scanner, payments
from carwash_backend.api.v1.endpoints.payment_api import router as payment_api_router
from carwash_backend.api.v1.endpoints.public import router as public_router

def setup_logging():

    try:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler()
            ]
        )
        logger = logging.getLogger(__name__)
        logger.info("Система логирования инициализирована (только консоль)")
    except Exception as e:
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        logging.error(f"Ошибка настройки логирования: {e}")

setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:

        admin = await repository.get_admin_by_username(session, username="admin")
        if not admin:
            default_admin = schemas.AdminCreate(username="admin", password="admin")
            await repository.create_admin(session, admin=default_admin)
            print("Default admin user 'admin' with password 'admin' created.")

        from carwash_backend.core.command_utils import service_manager

        existing_services = await repository.get_services(session, limit=10)
        if not existing_services:
            print("Creating default services...")
            default_services_data = service_manager.create_default_services()
            for service_data in default_services_data:
                service_create = schemas.ServiceCreate(**service_data)
                await repository.create_service(session, service_create)
        else:
            print(f"Found {len(existing_services)} existing services")

        test_cards = [
            {"uid": "1234567890", "holder_name": "Test User", "phone_number": "+998901234567", "balance": 10000.0, "is_active": True},
            {"uid": "1209B21E", "holder_name": "Hardware Test Card", "phone_number": "+998901111111", "balance": 15000.0, "is_active": True}
        ]
        for card_data in test_cards:
            if not await repository.get_rfid_card_by_uid(session, card_data["uid"]):
                await repository.create_rfid_card(session, card_data)

        if not await repository.get_posts(session, limit=1):
            print("Creating test post...")
            test_post_data = schemas.PostCreate(name="Test Post 1", controller_id="TEST_CTRL_001", is_active=True)
            await repository.create_post(session, test_post_data)

    print("Backend система готова к работе!")
    yield
    print("Backend система остановлена")

app = FastAPI(
    title="CarWash Backend API",
    description="The central backend service for the Car Wash management system.",
    lifespan=lifespan,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin_panel.router, prefix="/api/v1/admin", tags=["Admin Panel"])
app.include_router(controller.router, prefix="/api/v1/controller", tags=["Controller"])
app.include_router(desktop.router, prefix="/api/v1/desktop", tags=["Desktop Application"])
app.include_router(loyalty.router, prefix="/api/v1/loyalty", tags=["Loyalty"])
app.include_router(statistics.router, prefix="/api/v1/statistics", tags=["Statistics"])
app.include_router(rfid_scanner.router, prefix="/api/v1/rfid-scanner", tags=["RFID Scanner"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(websockets.router, tags=["WebSockets"])

app.include_router(payment_api_router, prefix="/api/v1/payment-system", tags=["Payment System API"])

app.include_router(public_router, prefix="/api/v1/public", tags=["Public"])

@app.get("/", tags=["Root"])
async def read_root():
    return {"status": "ok", "message": "CarWash Backend is running!"}

@app.get("/status", tags=["Root"])
async def get_status():
    return {
        "status": "ok",
        "message": "CarWash Backend is running!",
        "version": "1.0.0",
        "api_docs": "/docs"
    }
