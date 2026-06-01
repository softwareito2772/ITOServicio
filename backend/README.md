# ITO Servicios Backend

Para instalar y ejecutar localmente:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
python init_db.py  # Crea tablas y datos de prueba
uvicorn app.main:app --reload --port 8000
```

La API estará disponible en http://localhost:8000
Documentación: http://localhost:8000/docs
