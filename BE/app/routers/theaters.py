from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import CityModel, CineplexBrandModel, CinemaTheaterModel
from app.database import (
    CITIES_DATA, BRANDS_DATA, THEATERS_DATA,
    is_postgres_available, get_pg_connection
)

router = APIRouter(prefix="/api", tags=["Theaters & Locations"])

@router.get("/cities", response_model=List[CityModel])
def get_cities():
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name, code, is_popular FROM cities ORDER BY is_popular DESC, id ASC")
                    rows = cur.fetchall()
                    return [CityModel(**r) for r in rows]
            except Exception as e:
                print(f"[THEATERS ROUTER] PG error: {e}")
            finally:
                conn.close()

    return [CityModel(**c) for c in CITIES_DATA]

@router.get("/brands", response_model=List[CineplexBrandModel])
def get_brands():
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT id, name, code, logo_url as logo, tag, slogan FROM cineplex_brands ORDER BY id ASC")
                    rows = cur.fetchall()
                    return [CineplexBrandModel(**r) for r in rows]
            except Exception as e:
                print(f"[THEATERS ROUTER] PG error: {e}")
            finally:
                conn.close()

    return [CineplexBrandModel(**b) for b in BRANDS_DATA]

@router.get("/theaters", response_model=List[CinemaTheaterModel])
def get_theaters(
    city_id: Optional[int] = Query(None, description="Lọc theo mã tỉnh thành"),
    brand_code: Optional[str] = Query(None, description="Lọc theo chuỗi rạp (CGV, LOTTE, GALAXY,...)"),
    search: Optional[str] = Query(None, description="Tìm theo tên hoặc địa chỉ rạp")
):
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    query = """
                        SELECT t.id, t.brand_id, b.code as brand_code, t.name, t.address,
                               t.city_id, c.name as city_name, t.rating, t.review_count, t.lat, t.lng
                        FROM cinema_theaters t
                        JOIN cineplex_brands b ON t.brand_id = b.id
                        JOIN cities c ON t.city_id = c.id
                        WHERE 1=1
                    """
                    params = []
                    if city_id:
                        query += " AND t.city_id = %s"
                        params.append(city_id)
                    if brand_code and brand_code.upper() != "ALL":
                        query += " AND b.code = %s"
                        params.append(brand_code.upper())
                    if search:
                        query += " AND (t.name ILIKE %s OR t.address ILIKE %s)"
                        params.extend([f"%{search}%", f"%{search}%"])
                    query += " ORDER BY t.rating DESC, t.id ASC"
                    cur.execute(query, params)
                    rows = cur.fetchall()
                    return [CinemaTheaterModel(**r) for r in rows]
            except Exception as e:
                print(f"[THEATERS ROUTER] PG error: {e}")
            finally:
                conn.close()

    results = THEATERS_DATA
    if city_id:
        results = [t for t in results if t["city_id"] == city_id]
    if brand_code and brand_code.upper() != "ALL":
        results = [t for t in results if t["brand_code"].upper() == brand_code.upper()]
    if search:
        s_low = search.lower()
        results = [t for t in results if s_low in t["name"].lower() or s_low in t["address"].lower()]

    return [CinemaTheaterModel(**t) for t in results]

@router.get("/theaters/{theater_id}", response_model=CinemaTheaterModel)
def get_theater_detail(theater_id: int):
    theaters = get_theaters()
    item = next((t for t in theaters if t.id == theater_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy rạp này")
    return item
