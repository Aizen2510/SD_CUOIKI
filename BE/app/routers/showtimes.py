from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import ShowtimeSlotModel, ShowtimeSeatsResponse, SeatModel
from app.database import (
    SHOWTIMES_DATA, RESERVED_SEATS_MAP,
    is_postgres_available, get_pg_connection
)

router = APIRouter(prefix="/api/showtimes", tags=["Showtimes & Seats"])

@router.get("", response_model=List[ShowtimeSlotModel])
def get_showtimes(
    movie_id: Optional[int] = Query(None, description="Lọc theo phim"),
    theater_id: Optional[int] = Query(None, description="Lọc theo rạp"),
    city_id: Optional[int] = Query(None, description="Lọc theo tỉnh thành"),
    date: Optional[str] = Query(None, description="Ngày chiếu (YYYY-MM-DD)")
):
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    query = """
                        SELECT s.id, s.movie_id, s.theater_id, s.start_time::text, s.end_time::text,
                               s.show_date::text, s.room_name, s.format, s.base_price, s.total_seats,
                               (s.total_seats - COALESCE(
                                   (SELECT COUNT(*) FROM booking_seats bs WHERE bs.showtime_id = s.id), 0
                               )) as empty_seats
                        FROM showtimes s
                        JOIN cinema_theaters t ON s.theater_id = t.id
                        WHERE 1=1
                    """
                    params = []
                    if movie_id:
                        query += " AND s.movie_id = %s"
                        params.append(movie_id)
                    if theater_id:
                        query += " AND s.theater_id = %s"
                        params.append(theater_id)
                    if city_id:
                        query += " AND t.city_id = %s"
                        params.append(city_id)
                    if date:
                        query += " AND s.show_date = %s"
                        params.append(date)
                    query += " ORDER BY s.start_time ASC"
                    cur.execute(query, params)
                    rows = cur.fetchall()
                    return [ShowtimeSlotModel(**r) for r in rows]
            except Exception as e:
                print(f"[SHOWTIMES ROUTER] PG error: {e}")
            finally:
                conn.close()

    results = SHOWTIMES_DATA
    if movie_id:
        results = [s for s in results if s["movie_id"] == movie_id]
    if theater_id:
        results = [s for s in results if s["theater_id"] == theater_id]
    if date:
        results = [s for s in results if s.get("show_date") == date]

    # Calculate live empty seats based on RESERVED_SEATS_MAP
    formatted = []
    for s in results:
        reserved_set = RESERVED_SEATS_MAP.get(s["id"], set())
        cur_empty = max(0, s["total_seats"] - len(reserved_set))
        s_copy = dict(s)
        s_copy["empty_seats"] = cur_empty
        formatted.append(ShowtimeSlotModel(**s_copy))

    return formatted

@router.get("/{showtime_id}/seats", response_model=ShowtimeSeatsResponse)
def get_seats_for_showtime(showtime_id: str):
    showtime = next((s for s in SHOWTIMES_DATA if s["id"] == showtime_id), None)
    base_price = showtime["base_price"] if showtime else 85000
    room_name = showtime["room_name"] if showtime else "Cinema 1"
    show_format = showtime["format"] if showtime else "2D Phụ đề"

    # Get reserved seats from PG or memory
    reserved_set = set()
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT seat_code FROM booking_seats WHERE showtime_id = %s", (showtime_id,))
                    rows = cur.fetchall()
                    reserved_set = {r["seat_code"] for r in rows}
            except Exception as e:
                print(f"[SEATS ROUTER] PG error: {e}")
            finally:
                conn.close()

    # Merge with in-memory map
    reserved_set.update(RESERVED_SEATS_MAP.get(showtime_id, set()))

    # Generate standard theater seat layout (Rows A to H, Cols 1 to 12)
    rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    seats_list = []

    for r_idx, r in enumerate(rows):
        for col in range(1, 13):
            seat_id = f"{r}{col}"

            # Type and pricing rules
            if r in ['D', 'E', 'F', 'G'] and 3 <= col <= 10:
                s_type = 'vip'
                price = base_price + 15000
            elif r == 'H' and col in [5, 6, 7, 8]:
                s_type = 'sweetbox'
                price = (base_price * 2) - 10000
            else:
                s_type = 'standard'
                price = base_price

            is_reserved = seat_id in reserved_set
            status = 'reserved' if is_reserved else 'available'

            seats_list.append(SeatModel(
                id=seat_id,
                row=r,
                col=col,
                type=s_type,
                price=price,
                status=status
            ))

    empty_count = sum(1 for s in seats_list if s.status == 'available')

    return ShowtimeSeatsResponse(
        showtimeId=showtime_id,
        roomName=room_name,
        format=show_format,
        basePrice=base_price,
        totalSeats=len(seats_list),
        emptySeats=empty_count,
        seats=seats_list
    )
