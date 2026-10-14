from typing import List
from fastapi import APIRouter
from app.models import ComboItemModel
from app.database import COMBOS_DATA, is_postgres_available, get_pg_connection

router = APIRouter(prefix="/api/combos", tags=["Combos & Concessions"])

@router.get("", response_model=List[ComboItemModel])
def get_combos():
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name, description, price, image_url FROM combos WHERE is_active = TRUE ORDER BY price ASC")
                    rows = cur.fetchall()
                    return [ComboItemModel(**r) for r in rows]
            except Exception as e:
                print(f"[COMBOS ROUTER] PG error: {e}")
            finally:
                conn.close()

    return [ComboItemModel(**c) for c in COMBOS_DATA]
