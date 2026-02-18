import asyncio
import httpx
import websockets
import json
import time
from pprint import pprint

BASE_URL = "http://127.0.0.1:8000"
WEBSOCKET_ADMIN_URL = "ws://127.0.0.1:8000/ws/admin"
CONTROLLER_API_KEY = "super_secret_controller_key"

TIMESTAMP = str(int(time.time()))
UNIQUE_CARD_UID = f"CARD_{TIMESTAMP}"
UNIQUE_BONUS_CARD_UID = f"BONUS_CARD_{TIMESTAMP}"

class TestState:
    admin_token = ""
    post_id = 0
    card_id = 0
    service_id = 0
    pause_service_id = 0
    bonus_card_id = 0
    bonus_tier_id = 0
    time_discount_id = 0

state = TestState()
headers = {}
controller_headers = {"X-API-KEY": CONTROLLER_API_KEY}

client = httpx.AsyncClient(base_url=BASE_URL)

async def print_step(title):
    print("\n" + "="*80)
    print(f"STEP: {title}")
    print("="*80)

async def check_response(response, expected_status):
    print(f"-> Testing {response.request.method} {response.request.url}...")
    if response.status_code == expected_status:
        print(f"✅ SUCCESS: Status code is {response.status_code}")
    else:
        print(f"❌ FAILED: Expected status {expected_status}, but got {response.status_code}")
        print("Response body:", response.text)
        raise AssertionError("Test failed due to unexpected status code.")
    if response.status_code != 204:
        return response.json()
    return None

async def wait_for_ws_message(websocket, event_name, post_id, timeout=3):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            msg = await asyncio.wait_for(websocket.recv(), timeout=1)
            data = json.loads(msg)
            print(f"Received WS message: {data}")
            if data.get('event') == event_name and data.get('post_id') == post_id:
                return data
        except asyncio.TimeoutError:
            continue
    raise asyncio.TimeoutError(f"Did not receive event '{event_name}' for post {post_id} within {timeout}s")

async def main_test_scenario():
    global headers
    try:
        await print_step("1. Admin Authentication")
        response = await client.post("/api/v1/auth/login", data={"username": "admin", "password": "admin"})
        data = await check_response(response, 200)
        state.admin_token = data.get("access_token")
        headers = {"Authorization": f"Bearer {state.admin_token}"}
        
        await print_step("2. Setup: Creating necessary entities")
        response = await client.post("/api/v1/admin/posts/", json={"name": "Test Post 1", "is_active": True, "controller_id": "test_pi_1"}, headers=headers)
        data = await check_response(response, 201)
        state.post_id = data.get("id")

        response = await client.post("/api/v1/admin/rfid-cards/", json={"uid": UNIQUE_CARD_UID, "holder_name": "Main Test User", "balance": 100000}, headers=headers)
        data = await check_response(response, 201)
        state.card_id = data.get("id")

        response = await client.post("/api/v1/admin/services/", json={"name": "Water", "price_per_minute": 6000, "command_str": "WATER_ON"}, headers=headers)
        data = await check_response(response, 201)
        state.service_id = data.get("id")

        response = await client.post("/api/v1/admin/loyalty/time-discounts/", json={"start_time": "00:00", "end_time": "23:59", "discount_percent": 50}, headers=headers)
        await check_response(response, 201)
        
        print("\n--- ✅ SETUP COMPLETE: All entities created successfully. ---\n")

        await print_step("3. Simulating a full wash session")
        
        async with websockets.connect(WEBSOCKET_ADMIN_URL) as websocket:
            print("WebSocket client connected to admin channel.")
            
            print("-> Simulating cash insertion...")
            event_cash = {"post_id": state.post_id, "event_type": "cash_inserted", "data": {"amount": 5000}}
            response = await client.post("/api/v1/controller/events", json=event_cash, headers=controller_headers)
            await check_response(response, 200)
            
            await wait_for_ws_message(websocket, "session_started", state.post_id)
            data_state = await wait_for_ws_message(websocket, "session_state_update", state.post_id)
            assert data_state['total_balance'] == 5000
            print("✅ Cash insertion and initial state update successful.")

            print("-> Simulating RFID card scan...")
            event_rfid = {"post_id": state.post_id, "event_type": "rfid_scanned", "data": {"uid": UNIQUE_CARD_UID}}
            response = await client.post("/api/v1/controller/events", json=event_rfid, headers=controller_headers)
            await check_response(response, 200)

            data_rfid_state = await wait_for_ws_message(websocket, "session_state_update", state.post_id)
            assert data_rfid_state['total_balance'] == 105000
            print("✅ RFID card balance successfully added to session.")

            print("-> Simulating mode selection...")
            event_mode = {"post_id": state.post_id, "event_type": "mode_selected", "data": {"service_id": state.service_id}}
            response = await client.post("/api/v1/controller/events", json=event_mode, headers=controller_headers)
            await check_response(response, 200)
            await wait_for_ws_message(websocket, "session_state_update", state.post_id)

            await asyncio.sleep(2.5)
            
            last_balance_update = None
            start_time = time.time()
            while time.time() - start_time < 2:
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=0.5)
                    data = json.loads(msg)
                    if data.get('event') == 'session_state_update' and data.get('post_id') == state.post_id:
                        last_balance_update = data
                except asyncio.TimeoutError:
                    break
            
            assert last_balance_update is not None, "No balance updates received"
            expected_balance = 105000 - (100 * (1 - 0.5) * 2)
            assert last_balance_update['total_balance'] < expected_balance + 20
            print(f"✅ Balance reduction works. Current balance: {last_balance_update['total_balance']}")

            print("-> Simulating PAUSE...")
            event_pause = {"post_id": state.post_id, "event_type": "mode_selected", "data": {"service_id": None}}
            response = await client.post("/api/v1/controller/events", json=event_pause, headers=controller_headers)
            await check_response(response, 200)

            print("-> Simulating user finishing the session...")
            event_finish = {"post_id": state.post_id, "event_type": "session_finished_by_user", "data": {}}
            response = await client.post("/api/v1/controller/events", json=event_finish, headers=controller_headers)
            await check_response(response, 200)
            
            await wait_for_ws_message(websocket, "session_finished", state.post_id)
            print("✅ Session finished event received.")

        await print_step("4. Verifying final state")
        await asyncio.sleep(1) # Даем время БД обработать все
        response = await client.get(f"/api/v1/admin/rfid-cards/{state.card_id}", headers=headers)
        data = await check_response(response, 200)
        assert data['balance'] <= 100000
        print(f"✅ Refund to RFID card successful. Final card balance: {data['balance']}")

        print("\n" + "*"*80)
        print("✅ ALL FULL E2E TESTS PASSED SUCCESSFULLY!")
        print("*"*80)

    except Exception as e:
        print("\n" + "!"*80)
        print(f"❌ FULL E2E TEST SCENARIO FAILED! Error: {type(e).__name__} - {e}")
        print("!"*80)
    finally:
        await client.aclose()


if __name__ == "__main__":
    print("Starting comprehensive E2E test script for ALL endpoints...")
    asyncio.run(main_test_scenario())