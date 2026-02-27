import datetime
from pymongo import MongoClient

MAC_ID = "00:00:00:00:00:01" 

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client.superapp

# 1. Find the kiosk by MAC ID
kiosk = db.hardwareKiosks.find_one({"macId": MAC_ID})
if not kiosk:
    print(f"Kiosk with MAC {MAC_ID} not found in DB")
else:
    kiosk_id = kiosk["kioskId"]
    print(f"Found kiosk with ID: {kiosk_id}")
    
    # 2. Insert a pending command
    cmd = {
        "controllerId": kiosk_id,
        "commandType": "turn_on_water",
        "commandStr": '{"action": "test", "time": 60}',
        "status": "pending",
        "priority": 5,
        "createdAt": datetime.datetime.utcnow(),
        "_class": "uz.superapp.domain.ControllerCommand"
    }
    
    res = db.controllerCommands.insert_one(cmd)
    print(f"Inserted command: {res.inserted_id}")
