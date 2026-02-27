import tkinter as tk
from tkinter import messagebox
import requests
import threading
import time

# =====================================================================
# НАСТРОЙКИ СЕТИ
# =====================================================================
SERVER_URL = "http://161.97.118.117:8080"
MAC_ID = "00:00:00:00:00:01"
INTERVAL_SECONDS = 5

class GarageWashApp(tk.Tk):
    def __init__(self):
        super().__init__()
        
        self.title(f"GarageWash Simulator - {MAC_ID}")
        self.geometry("480x800")
        self.configure(bg="#2c3e50")
        
        self.balance = 0
        self.timer_seconds = 0
        self.is_running = False
        
        self.setup_ui()
        
        # Фоновый поток для сети
        self.network_thread = threading.Thread(target=self.network_loop, daemon=True)
        self.network_thread.start()

        # Таймер симулятора
        self.update_timer()

    def setup_ui(self):
        # Header
        header = tk.Frame(self, bg="#000000", height=60)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        logo = tk.Label(header, text="GARAGEWASH\nСАМООБСЛУЖИВАНИЕ", fg="#f39c12", bg="#000000", font=("Helvetica", 14, "bold"))
        logo.pack(pady=10)

        # Табло Баланса и Времени
        info_frame = tk.Frame(self, bg="#34495e", bd=0)
        info_frame.pack(fill=tk.X, padx=20, pady=15)
        
        self.time_label = tk.Label(info_frame, text="0:00", fg="#f1c40f", bg="#34495e", font=("Helvetica", 32, "bold"))
        self.time_label.pack(side=tk.LEFT, padx=30, pady=10)
        
        self.balance_label = tk.Label(info_frame, text="0 сум", fg="#f1c40f", bg="#34495e", font=("Helvetica", 24, "bold"))
        self.balance_label.pack(side=tk.RIGHT, padx=30, pady=10)

        # Пауза и Зачисление
        ctrl_frame = tk.Frame(self, bg="#2c3e50")
        ctrl_frame.pack(fill=tk.X, padx=20, pady=5)
        
        pause_btn = tk.Button(ctrl_frame, text="⏸ Пауза", bg="#e74c3c", fg="white", font=("Helvetica", 14, "bold"), 
                  command=self.toggle_pause, height=3, relief=tk.FLAT)
        pause_btn.pack(side=tk.LEFT, expand=True, fill=tk.BOTH, padx=5)

        refund_btn = tk.Button(ctrl_frame, text="Зачислить\nна карту", bg="#7f8c8d", fg="white", font=("Helvetica", 12, "bold"),
                  command=self.refund, height=3, relief=tk.FLAT)
        refund_btn.pack(side=tk.RIGHT, expand=True, fill=tk.BOTH, padx=5)

        tk.Label(self, text="ВЫБЕРИТЕ ПРОГРАММУ", fg="white", bg="#2c3e50", font=("Helvetica", 10, "bold")).pack(pady=10, anchor="w", padx=25)

        # Сетка Программ
        programs = [
            ("💧 ВОДА", "#3498db"), ("🔫 ТУРБО-ВОДА", "#1abc9c"),
            ("🧪 АКТИВНАЯ\nХИМИЯ", "#2ecc71"), ("🫧 НАНО-\nШАМПУНЬ", "#3498db"),
            ("🔥 ВОСК", "#e67e22"), ("🌬 ОСМОС", "#f1c40f"),
            ("🌡 ТЁПЛАЯ\nВОДА", "#e74c3c"), ("☁️ ПЕНА", "#9b59b6")
        ]
        
        grid_frame = tk.Frame(self, bg="#2c3e50")
        grid_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=5)
        
        for i, (text, color) in enumerate(programs):
            row = i // 2
            col = i % 2
            btn = tk.Button(grid_frame, text=text, bg=color, fg="white", font=("Helvetica", 12, "bold"),
                            relief=tk.FLAT, command=lambda t=text: self.start_program(t))
            btn.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
            
        for i in range(4):
            grid_frame.rowconfigure(i, weight=1)
        grid_frame.columnconfigure(0, weight=1)
        grid_frame.columnconfigure(1, weight=1)

        # QR Block 
        qr_frame = tk.Frame(self, bg="#f1c40f", height=40)
        qr_frame.pack(fill=tk.X, padx=20, pady=10)
        qr_frame.pack_propagate(False)
        tk.Label(qr_frame, text="📱 QR Оплата", bg="#f1c40f", fg="black", font=("Helvetica", 12, "bold")).pack(expand=True)

    def update_balance(self, amount):
        self.balance += amount
        self.balance_label.config(text=f"{int(self.balance)} сум")
        
    def start_program(self, prog_name):
        if self.balance <= 0:
            messagebox.showwarning("Ошибка", "Баланс пуст. Оплатите или пополните с админки.")
            return
        self.is_running = True
        print(f"[ИНФО] Включено: {prog_name}")

    def toggle_pause(self):
        self.is_running = not self.is_running
        print(f"[ИНФО] Пауза: {not self.is_running}")

    def refund(self):
        self.balance = 0
        self.update_balance(0)
        self.is_running = False
        messagebox.showinfo("Возврат", "Средства переведены")

    def update_timer(self):
        if self.is_running and self.balance > 0:
            # Убывает баланс при работе программы
            self.balance -= 50
            if self.balance < 0:
                self.balance = 0
                self.is_running = False
            self.update_balance(0)
            self.timer_seconds += 1
            
            mins, secs = divmod(self.timer_seconds, 60)
            self.time_label.config(text=f"{mins}:{secs:02d}")
            
        self.after(1000, self.update_timer)

    # -------------------------------------------------------------
    # NETWORK LOGIC (API)
    # -------------------------------------------------------------
    def network_loop(self):
        while True:
            self.send_hardware_heartbeat()
            self.send_controller_heartbeat()
            time.sleep(INTERVAL_SECONDS)
            
    def send_hardware_heartbeat(self):
        url = f"{SERVER_URL}/api/v1/hardware/heartbeat/{MAC_ID}"
        try:
            requests.post(url, json={}, timeout=3)
        except:
            pass

    def send_controller_heartbeat(self):
        url = f"{SERVER_URL}/api/v1/controller/heartbeat/{MAC_ID}"
        try:
            response = requests.post(url, json={}, timeout=3)
            if response.status_code == 200:
                data = response.json()
                commands = data.get("commands", [])
                for cmd in commands:
                    cmd_type = cmd.get('command_type')
                    if cmd_type == 'kiosk_topup':
                        amount = cmd.get('amount', 0)
                        # Используем after, чтобы безопасно обновить UI из другого потока
                        self.after(0, self.update_balance, amount)
                        print(f"[ИНФО] Получен TOPUP на {amount} сум!")

                    self.mark_command_executed(cmd['id'])
        except Exception as e:
            pass

    def mark_command_executed(self, command_id):
        url = f"{SERVER_URL}/api/v1/controller/command/{command_id}/executed"
        try:
            requests.post(url, json={"executionResult": "success"}, timeout=3)
        except:
            pass

if __name__ == "__main__":
    app = GarageWashApp()
    app.mainloop()
