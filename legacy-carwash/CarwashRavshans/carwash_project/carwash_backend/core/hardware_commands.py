from carwash_backend.db import models, schemas

def service_to_hardware_command(service: models.Service) -> schemas.HardwareCommand:
    d1_power = service.pump1_power if service.pump1_power is not None else (service.pump_power or 85)
    d2_power = service.pump2_power if service.pump2_power is not None else 60
    
    bits = service.relay_bits or "00000000"
    d1 = f"{d1_power:02d}"
    d2 = f"{d2_power:02d}"
    d3 = f"{service.pump3_power or 0:02d}"
    d4 = f"{service.pump4_power or 0:02d}"
    freq = str(service.motor_frequency or 0.0)
    flag = service.motor_flag or "F"
    
    hw_command = schemas.HardwareCommand(
        bits=bits,
        d1=d1,
        d2=d2,
        d3=d3,
        d4=d4,
        freq=freq,
        flag=flag
    )
    
    return hw_command

def get_pause_command() -> schemas.HardwareCommand:
    return schemas.HardwareCommand(
        bits="00000001",
        d1="00",
        d2="00",
        d3="00",
        d4="00",
        freq="0",
        flag="S"
    )

def get_stop_command() -> schemas.HardwareCommand:
    return schemas.HardwareCommand(
        bits="00000000",  
        d1="00",
        d2="00",
        d3="00",
        d4="00",
        freq="0.0",
        flag="S"
    )

PREDEFINED_SERVICES = {
    "Вода": {
        "relay_bits": "10000110",  
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 42.5,
        "motor_flag": "F"
    },
    "Турбо-вода": {
        "relay_bits": "10000110",  
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 47.5,
        "motor_flag": "F"
    },
    "Активная химия": {
        "relay_bits": "00100110",  
        "pump1_power": 0,
        "pump2_power": 99,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 27.5,
        "motor_flag": "F"
    },
    "Нано-шампунь": {
        "relay_bits": "00010110",  
        "pump1_power": 99,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 27.5,
        "motor_flag": "F"
    },
    "Воск": {
        "relay_bits": "01000110",  
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 99,
        "pump4_power": 0,
        "motor_frequency": 20.0,
        "motor_flag": "F"
    },
    "Осмос": {
        "relay_bits": "00100110",  
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 27.5,
        "motor_flag": "F"
    },
    "Тёплая вода": {
        "relay_bits": "00000111",  
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 99,
        "motor_frequency": 30.0,
        "motor_flag": "F"
    }
}

def get_predefined_service_config(service_name: str) -> dict:
    return PREDEFINED_SERVICES.get(service_name, {
        "relay_bits": "00000000",
        "pump1_power": 0,
        "pump2_power": 0,
        "pump3_power": 0,
        "pump4_power": 0,
        "motor_frequency": 0.0,
        "motor_flag": "S"
    })

def generate_relay_bits(mode_number: int) -> str:
    bits = ["0"] * 8
    if 1 <= mode_number <= 5:
        bits[8 - mode_number] = "1"  
    bits[1] = "1"
    bits[2] = "1"
    return "".join(bits)
