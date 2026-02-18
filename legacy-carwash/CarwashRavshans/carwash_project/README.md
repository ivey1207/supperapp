```bash
D:.
│   .gitignore
│   config.yaml
│   README.md
│   requirements.txt
│
├───carwash_backend
│   │   main.py
│   │
│   ├───api
│   │   │   __init__.py
│   │   │
│   │   └───v1
│   │       │   router.py
│   │       │   websocket_manager.py
│   │       │   __init__.py
│   │       │
│   │       └───endpoints
│   │               admin_panel.py
│   │               auth.py
│   │               controller.py
│   │               public.py
│   │               webhooks.py
│   │               __init__.py
│   │
│   ├───core
│   │   │   config.py
│   │   │   security.py
│   │   │   session_manager.py
│   │   │   __init__.py
│   │   │
│   │   └───payment_gateways
│   │           click_handler.py
│   │           payme_handler.py
│   │           uzum_handler.py
│   │           __init__.py
│   │
│   └───db
│           database.py
│           models.py
│           repository.py
│           schemas.py
│           __init__.py
│
└───tests
        test_main.py
        __init__.py
```