from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import MovieModel
from app.database import MOVIES_DATA, is_postgres_available, get_pg_connection

router = APIRouter(prefix="/api/movies", tags=["Movies"])

@router.get("", response_model=List[MovieModel])
def get_movies(
    status: Optional[str] = Query(None, description="'now' (đang chiếu) hoặc 'soon' (sắp chiếu)"),
    genre: Optional[str] = Query(None, description="Lọc theo thể loại"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên phim")
):
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    query = "SELECT * FROM movies WHERE 1=1"
                    params = []
                    if status:
                        query += " AND status = %s"
                        params.append(status)
                    if genre:
                        query += " AND genre ILIKE %s"
                        params.append(f"%{genre}%")
                    if search:
                        query += " AND (title ILIKE %s OR title_en ILIKE %s)"
                        params.extend([f"%{search}%", f"%{search}%"])
                    query += " ORDER BY is_hot DESC, rating_point DESC"
                    cur.execute(query, params)
                    rows = cur.fetchall()
                    return [MovieModel(**row) for row in rows]
            except Exception as e:
                print(f"[MOVIES ROUTER] PG error, falling back to cache: {e}")
            finally:
                conn.close()

    # Fallback / In-Memory
    results = MOVIES_DATA
    if status:
        results = [m for m in results if m.get("status") == status]
    if genre:
        results = [m for m in results if genre.lower() in m.get("genre", "").lower()]
    if search:
        s_low = search.lower()
        results = [m for m in results if s_low in m.get("title", "").lower() or s_low in m.get("title_en", "").lower()]

    return [MovieModel(**m) for m in results]

@router.get("/{movie_id}", response_model=MovieModel)
def get_movie_detail(movie_id: int):
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM movies WHERE id = %s", (movie_id,))
                    row = cur.fetchone()
                    if row:
                        return MovieModel(**row)
            except Exception as e:
                print(f"[MOVIES ROUTER] PG error: {e}")
            finally:
                conn.close()

    movie = next((m for m in MOVIES_DATA if m["id"] == movie_id), None)
    if not movie:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim với ID này")
    return MovieModel(**movie)
