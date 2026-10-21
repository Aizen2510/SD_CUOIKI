import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, Body, HTTPException, status
from zoneinfo import ZoneInfo
from app.models import (
    BookingCreateRequest, DigitalTicketResponse
)
from app.database import (
    BOOKINGS_STORE, RESERVED_SEATS_MAP, SHOWTIMES_DATA, MOVIES_DATA,
    THEATERS_DATA, COMBOS_DATA, PROMOTIONS_DATA,
    is_postgres_available, get_pg_connection, save_persistent_state, BOOKING_LOCK
)

router = APIRouter(prefix="/api/bookings", tags=["Bookings & Tickets"])


def _ensure_showtime_row(cur, req: BookingCreateRequest, show_date: str, show_time: str) -> None:
    cur.execute("SELECT 1 FROM showtimes WHERE id = %s", (req.showtimeId,))
    if cur.fetchone():
        return

    # The schedule UI generates date-specific slot IDs (movie-theater-date-index).
    # Materialize that selected slot so bookings and refunds have a real FK row.
    parts = req.showtimeId.split("-")
    try:
        movie_id, theater_id = int(parts[0]), int(parts[1])
        date_value = datetime.date.fromisoformat(show_date)
        time_value = datetime.time.fromisoformat(show_time)
    except (ValueError, IndexError, TypeError):
        raise HTTPException(status_code=400, detail="Mã suất chiếu không hợp lệ hoặc thiếu ngày/giờ chiếu.")

    cur.execute("SELECT duration FROM movies WHERE id = %s", (movie_id,))
    movie_row = cur.fetchone()
    if not movie_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy phim của suất chiếu này.")
    cur.execute("SELECT 1 FROM cinema_theaters WHERE id = %s", (theater_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Không tìm thấy rạp của suất chiếu này.")

    cur.execute("""
        SELECT id, room_number, format, total_seats
        FROM rooms WHERE theater_id = %s ORDER BY id LIMIT 1
    """, (theater_id,))
    room = cur.fetchone()
    end_time = (datetime.datetime.combine(date_value, time_value) + datetime.timedelta(minutes=movie_row["duration"])).time()
    cur.execute("""
        INSERT INTO showtimes (
            id, movie_id, theater_id, room_id, show_date, start_time, end_time,
            room_name, format, base_price, total_seats
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, (
        req.showtimeId, movie_id, theater_id, room["id"] if room else None,
        date_value, time_value, end_time, req.screenRoom or (room["room_number"] if room else "Cinema 1"),
        req.showFormat or (room["format"] if room else "2D Phụ đề"),
        req.basePrice or min(seat.price for seat in req.seats),
        req.totalSeats or (room["total_seats"] if room else 96),
    ))


def _create_booking(req: BookingCreateRequest):
    if not req.seats or len(req.seats) == 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 ghế")

    seat_codes = [s.id for s in req.seats]

    # Find showtime context
    showtime = next((s for s in SHOWTIMES_DATA if s["id"] == req.showtimeId), None)

    # Check if showtime has already passed
    now = datetime.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).replace(tzinfo=None)
    target_date = req.showDate or (showtime["show_date"] if showtime else None)
    target_time = req.showTime or (showtime["start_time"] if showtime else None)

    # If not found in SHOWTIMES_DATA, try parsing date from showtimeId format: {movie_id}-{theater_id}-{YYYY-MM-DD}-{idx}
    if not target_date and "-" in req.showtimeId:
        parts = req.showtimeId.split("-")
        if len(parts) >= 5:
            target_date = f"{parts[2]}-{parts[3]}-{parts[4]}"

    if target_date and target_time:
        try:
            t_str = target_time.strip()
            if len(t_str.split(":")) == 2:
                t_str += ":00"
            dt_target = datetime.datetime.strptime(f"{target_date} {t_str}", "%Y-%m-%d %H:%M:%S")
            if dt_target <= now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Suất chiếu lúc {target_time} ngày {target_date} đã qua giờ chiếu. Vui lòng chọn suất chiếu khác!"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[TIME CHECK WARNING]: {e}")

    # Resolve movie and theater
    movie_id = showtime["movie_id"] if showtime else None
    theater_id = showtime["theater_id"] if showtime else None
    if not movie_id and "-" in req.showtimeId:
        try:
            parts = req.showtimeId.split("-")
            movie_id = int(parts[0])
            theater_id = int(parts[1])
        except Exception:
            pass

    movie = next((m for m in MOVIES_DATA if m["id"] == movie_id), None) if movie_id else None
    theater = next((t for t in THEATERS_DATA if t["id"] == theater_id), None) if theater_id else None

    movie_title = req.movieTitle or (movie["title"] if movie else "Phim MeoCinema")
    poster_url = movie["poster_url"] if movie else ""
    cinema_name = req.cinemaName or (theater["name"] if theater else "Cụm rạp MeoCinema")
    cinema_address = theater["address"] if theater else "TP. Hồ Chí Minh"
    screen_room = showtime["room_name"] if showtime else (req.screenRoom or "Cinema 1")
    show_format = showtime["format"] if showtime else (req.showFormat or "2D Phụ đề")
    final_show_date = target_date or datetime.date.today().isoformat()
    final_show_time = target_time or "19:30"

    # 1. Double-booking check
    reserved_set = RESERVED_SEATS_MAP.get(req.showtimeId, set())
    for s_code in seat_codes:
        if s_code in reserved_set:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ghế {s_code} vừa có khách đặt trước. Vui lòng chọn ghế khác!"
            )

    # 2. Calculate totals
    seat_total = sum(s.price for s in req.seats)

    combo_total = 0.0
    chosen_combos_desc = []
    if req.combos:
        for c_id, qty in req.combos.items():
            if qty > 0:
                c_item = next((c for c in COMBOS_DATA if c["id"] == c_id), None)
                if c_item:
                    c_price = float(c_item["price"])
                    combo_total += c_price * qty
                    chosen_combos_desc.append(f"{qty}x {c_item['name']}")

    sub_total = seat_total + combo_total

    # 3. Apply Voucher Discount
    discount_amount = 0.0
    if req.voucherCode:
        v_code = req.voucherCode.strip().upper()
        promo = next((p for p in PROMOTIONS_DATA if p["code"] == v_code), None)
        if promo and sub_total >= promo.get("min_order", 0):
            d_amt = float(promo.get("discount_amount", 0))
            d_pct = int(promo.get("discount_percent", 0))
            if d_pct > 0:
                calc = (sub_total * d_pct) / 100.0
                max_d = float(promo.get("max_discount", 0))
                d_amt = min(calc, max_d) if max_d > 0 else calc
            discount_amount = min(d_amt, sub_total)

    final_total = max(0.0, sub_total - discount_amount)

    # 4. Generate unique Booking ID & QR
    booking_code = f"MEO-{random.randint(100000, 999999)}"
    now_str = now.strftime("%d/%m/%Y %H:%M:%S")
    qr_url = f"https://meocinema.vn/ticket/{booking_code}"

    # 5. Save to PostgreSQL if connected
    if is_postgres_available():
        conn = get_pg_connection()
        if not conn:
            raise HTTPException(status_code=503, detail="Không kết nối được cơ sở dữ liệu; chưa tạo vé.")
        try:
            conn.autocommit = False
            with conn.cursor() as cur:
                    _ensure_showtime_row(cur, req, final_show_date, final_show_time)
                    # Check seat conflicts at database level
                    cur.execute(
                        "SELECT seat_code FROM booking_seats WHERE showtime_id = %s AND seat_code = ANY(%s)",
                        (req.showtimeId, seat_codes)
                    )
                    conflicts = cur.fetchall()
                    if conflicts:
                        conn.rollback()
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Ghế {conflicts[0]['seat_code']} đã có người đặt trước trong cơ sở dữ liệu."
                        )

                    # Insert booking
                    insert_b_sql = """
                        INSERT INTO bookings (
                            booking_code, customer_name, customer_phone, customer_email,
                            showtime_id, seat_count, seat_numbers, seat_total, combo_total,
                            discount_total, final_total, voucher_code, payment_method, payment_status,
                            qr_code_value
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """
                    cur.execute(insert_b_sql, (
                        booking_code, req.customerName, req.customerPhone, req.customerEmail or "",
                        req.showtimeId, len(seat_codes), seat_codes, seat_total, combo_total,
                        discount_amount, final_total, req.voucherCode or "", req.paymentMethod, "paid",
                        qr_url
                    ))
                    new_b_id = cur.fetchone()["id"]

                    # Insert seats
                    for s in req.seats:
                        cur.execute("""
                            INSERT INTO booking_seats (
                                booking_id, showtime_id, seat_code, seat_row, seat_col, seat_type, price
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (new_b_id, req.showtimeId, s.id, s.row, s.col, s.type, s.price))

                    # Insert combos
                    if req.combos:
                        for c_id, qty in req.combos.items():
                            if qty > 0:
                                c_item = next((c for c in COMBOS_DATA if c["id"] == c_id), None)
                                if c_item:
                                    cur.execute("""
                                        INSERT INTO booking_combos (
                                            booking_id, combo_id, combo_name, quantity, unit_price, total_price
                                        ) VALUES (%s, %s, %s, %s, %s, %s)
                                    """, (new_b_id, c_id, c_item["name"], qty, c_item["price"], c_item["price"] * qty))

                    conn.commit()
        except HTTPException:
            conn.rollback()
            raise
        except Exception as e:
            conn.rollback()
            # A concurrent request may pass the preliminary SELECT too;
            # the database UNIQUE constraint is the final arbiter.
            if getattr(e, "pgcode", None) == "23505":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Một hoặc nhiều ghế vừa được khách khác đặt. Vui lòng chọn ghế khác!"
                )
            print(f"[BOOKING PG ERROR]: {e}")
            raise HTTPException(status_code=503, detail="Không thể lưu vé vào PostgreSQL; chưa tạo vé.")
        finally:
            conn.close()

    # 6. Save in memory repository
    if req.showtimeId not in RESERVED_SEATS_MAP:
        RESERVED_SEATS_MAP[req.showtimeId] = set()
    RESERVED_SEATS_MAP[req.showtimeId].update(seat_codes)

    ticket_data = {
        "id": len(BOOKINGS_STORE) + 1,
        "booking_code": booking_code,
        "customer_name": req.customerName,
        "customer_phone": req.customerPhone,
        "customer_email": req.customerEmail or "",
        "showtime_id": req.showtimeId,
        "seat_count": len(seat_codes),
        "seat_numbers": seat_codes,
        "seat_total": seat_total,
        "combo_total": combo_total,
        "discount_total": discount_amount,
        "final_total": final_total,
        "voucher_code": req.voucherCode or "",
        "payment_method": req.paymentMethod,
        "payment_status": "paid",
        "created_at": now_str,
        "qr_code_value": qr_url,
        "movie_title": movie_title,
        "poster_url": poster_url,
        "cinema_name": cinema_name,
        "cinema_address": cinema_address,
        "screen_room": screen_room,
        "format": show_format,
        "show_date": final_show_date,
        "show_time": final_show_time,
        "combos": chosen_combos_desc
    }
    BOOKINGS_STORE.append(ticket_data)
    save_persistent_state()

    return DigitalTicketResponse(
        bookingId=booking_code,
        bookingTime=now_str,
        customerName=req.customerName,
        customerPhone=req.customerPhone,
        customerEmail=req.customerEmail or "",
        movieTitle=ticket_data["movie_title"],
        posterUrl=ticket_data["poster_url"],
        cinemaName=ticket_data["cinema_name"],
        cinemaAddress=ticket_data["cinema_address"],
        screenRoom=ticket_data["screen_room"],
        format=ticket_data["format"],
        showDate=ticket_data["show_date"],
        showTime=ticket_data["show_time"],
        seatNumbers=seat_codes,
        combos=chosen_combos_desc,
        totalPrice=final_total,
        paymentStatus="Đã thanh toán (MoMo)",
        qrCodeValue=qr_url
    )


@router.post("", response_model=DigitalTicketResponse, status_code=status.HTTP_201_CREATED)
def create_booking(req: BookingCreateRequest):
    # Keep the in-memory check-and-reserve operation atomic. PostgreSQL's
    # unique_showtime_seat constraint handles races across backend processes.
    with BOOKING_LOCK:
        return _create_booking(req)

@router.get("/{booking_code}", response_model=DigitalTicketResponse)
def get_booking_by_code(booking_code: str):
    code_clean = booking_code.strip().upper()

    # Search in PG
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    query = """
                        SELECT b.booking_code,
                               TO_CHAR(b.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI:SS') AS booking_time,
                               b.customer_name, b.customer_phone,
                               b.customer_email, m.title as movie_title, m.poster_url,
                               t.name as cinema_name, t.address as cinema_address,
                               s.room_name as screen_room, s.format, s.show_date::text,
                               s.start_time::text as show_time, b.seat_numbers,
                               b.final_total as total_price, b.payment_status, b.qr_code_value
                        FROM bookings b
                        JOIN showtimes s ON b.showtime_id = s.id
                        JOIN movies m ON s.movie_id = m.id
                        JOIN cinema_theaters t ON s.theater_id = t.id
                        WHERE b.booking_code = %s
                    """
                    cur.execute(query, (code_clean,))
                    row = cur.fetchone()
                    if row:
                        return DigitalTicketResponse(
                            bookingId=row["booking_code"],
                            bookingTime=row["booking_time"],
                            customerName=row["customer_name"],
                            customerPhone=row["customer_phone"],
                            customerEmail=row.get("customer_email", ""),
                            movieTitle=row["movie_title"],
                            posterUrl=row["poster_url"],
                            cinemaName=row["cinema_name"],
                            cinemaAddress=row["cinema_address"],
                            screenRoom=row["screen_room"],
                            format=row["format"],
                            showDate=str(row["show_date"]),
                            showTime=str(row["show_time"]),
                            seatNumbers=row["seat_numbers"],
                            combos=[],
                            totalPrice=float(row["total_price"]),
                            paymentStatus="Đã hoàn tiền" if row["payment_status"] == "refunded" else "Đã thanh toán",
                            qrCodeValue=row["qr_code_value"]
                        )
            except Exception as e:
                print(f"[GET BOOKING PG ERROR]: {e}")
            finally:
                conn.close()

    item = next((b for b in BOOKINGS_STORE if b["booking_code"].upper() == code_clean), None)
    if not item:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn vé với mã {booking_code}")

    return DigitalTicketResponse(
        bookingId=item["booking_code"],
        bookingTime=item["created_at"],
        customerName=item["customer_name"],
        customerPhone=item["customer_phone"],
        customerEmail=item.get("customer_email", ""),
        movieTitle=item["movie_title"],
        posterUrl=item["poster_url"],
        cinemaName=item["cinema_name"],
        cinemaAddress=item["cinema_address"],
        screenRoom=item["screen_room"],
        format=item["format"],
        showDate=item["show_date"],
        showTime=item["show_time"],
        seatNumbers=item["seat_numbers"],
        combos=item.get("combos", []),
        totalPrice=float(item["final_total"]),
        paymentStatus="Đã hoàn tiền" if item.get("payment_status") == "refunded" else "Đã thanh toán",
        qrCodeValue=item["qr_code_value"]
    )

@router.get("/by-phone/{phone}", response_model=List[DigitalTicketResponse])
def get_bookings_by_phone(phone: str):
    phone_clean = phone.strip()

    # Tickets stored in PostgreSQL must be visible after an API restart and
    # from any backend process, not only from this process's in-memory cache.
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT b.booking_code,
                               TO_CHAR(b.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI:SS') AS booking_time,
                               b.customer_name, b.customer_phone, b.customer_email,
                               COALESCE(m.title, 'Phim MeoCinema') AS movie_title,
                               COALESCE(m.poster_url, '') AS poster_url,
                               COALESCE(t.name, 'Cụm rạp MeoCinema') AS cinema_name,
                               COALESCE(t.address, '') AS cinema_address,
                               COALESCE(s.room_name, 'Cinema 1') AS screen_room,
                               COALESCE(s.format, '2D Phụ đề') AS format,
                               COALESCE(s.show_date::text, '') AS show_date,
                               COALESCE(s.start_time::text, '') AS show_time,
                               b.seat_numbers, b.final_total, b.payment_status,
                               b.qr_code_value
                        FROM bookings b
                        LEFT JOIN showtimes s ON s.id = b.showtime_id
                        LEFT JOIN movies m ON m.id = s.movie_id
                        LEFT JOIN cinema_theaters t ON t.id = s.theater_id
                        WHERE b.customer_phone = %s
                        ORDER BY b.created_at DESC
                    """, (phone_clean,))
                    rows = cur.fetchall()
                    db_tickets = [DigitalTicketResponse(
                        bookingId=row["booking_code"],
                        bookingTime=str(row["booking_time"]),
                        customerName=row["customer_name"],
                        customerPhone=row["customer_phone"],
                        customerEmail=row.get("customer_email", ""),
                        movieTitle=row["movie_title"],
                        posterUrl=row["poster_url"],
                        cinemaName=row["cinema_name"],
                        cinemaAddress=row["cinema_address"],
                        screenRoom=row["screen_room"],
                        format=row["format"],
                        showDate=row["show_date"],
                        showTime=row["show_time"],
                        seatNumbers=row["seat_numbers"] or [],
                        combos=[],
                        totalPrice=float(row["final_total"] or 0),
                        paymentStatus="Đã thanh toán" if row["payment_status"] == "paid" else "Đã hoàn tiền" if row["payment_status"] == "refunded" else str(row["payment_status"]),
                        qrCodeValue=row["qr_code_value"] or row["booking_code"]
                    ) for row in rows]
                    db_booking_codes = {ticket.bookingId for ticket in db_tickets}
                    # Keep any fallback-only bookings visible if a PostgreSQL
                    # write previously failed and the app used memory storage.
                    for item in BOOKINGS_STORE:
                        if (
                            item.get("customer_phone", "").strip() == phone_clean
                            and item["booking_code"] not in db_booking_codes
                        ):
                            db_tickets.append(DigitalTicketResponse(
                                bookingId=item["booking_code"],
                                bookingTime=item["created_at"],
                                customerName=item["customer_name"],
                                customerPhone=item["customer_phone"],
                                customerEmail=item.get("customer_email", ""),
                                movieTitle=item["movie_title"],
                                posterUrl=item["poster_url"],
                                cinemaName=item["cinema_name"],
                                cinemaAddress=item["cinema_address"],
                                screenRoom=item["screen_room"],
                                format=item["format"],
                                showDate=item["show_date"],
                                showTime=item["show_time"],
                                seatNumbers=item["seat_numbers"],
                                combos=item.get("combos", []),
                                totalPrice=float(item["final_total"]),
                                paymentStatus="Đã hoàn tiền" if item.get("payment_status") == "refunded" else "Đã thanh toán",
                                qrCodeValue=item["qr_code_value"]
                            ))
                    return db_tickets
            except Exception as e:
                print(f"[GET BOOKINGS BY PHONE PG ERROR]: {e}")
            finally:
                conn.close()

    results = [b for b in BOOKINGS_STORE if b.get("customer_phone", "").strip() == phone_clean]

    output = []
    for item in results:
        output.append(DigitalTicketResponse(
            bookingId=item["booking_code"],
            bookingTime=item["created_at"],
            customerName=item["customer_name"],
            customerPhone=item["customer_phone"],
            customerEmail=item.get("customer_email", ""),
            movieTitle=item["movie_title"],
            posterUrl=item["poster_url"],
            cinemaName=item["cinema_name"],
            cinemaAddress=item["cinema_address"],
            screenRoom=item["screen_room"],
            format=item["format"],
            showDate=item["show_date"],
            showTime=item["show_time"],
            seatNumbers=item["seat_numbers"],
            combos=item.get("combos", []),
            totalPrice=float(item["final_total"]),
            paymentStatus="Đã hoàn tiền" if item.get("payment_status") == "refunded" else "Đã thanh toán",
            qrCodeValue=item["qr_code_value"]
        ))
    return output


def _showtime_has_started(show_date: str, show_time: str) -> bool:
    date_part = datetime.date.fromisoformat(str(show_date)[:10])
    time_part = datetime.time.fromisoformat(str(show_time).split("+")[0])
    show_start = datetime.datetime.combine(date_part, time_part).replace(tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))
    return datetime.datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")) >= show_start


@router.post("/{booking_code}/refund")
def refund_booking(booking_code: str, customer_phone: str = Body(..., embed=True)):
    """Refund a paid booking before showtime and release its seats atomically."""
    code_clean = booking_code.strip().upper()
    phone_clean = customer_phone.strip()

    with BOOKING_LOCK:
        if is_postgres_available():
            conn = get_pg_connection()
            if conn:
                refunded_in_pg = None
                try:
                    conn.autocommit = False
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT b.id, b.booking_code, b.showtime_id, b.seat_numbers,
                                   b.payment_status, s.show_date::text AS show_date,
                                   s.start_time::text AS start_time
                            FROM bookings b
                            JOIN showtimes s ON s.id = b.showtime_id
                            WHERE b.booking_code = %s AND b.customer_phone = %s
                            FOR UPDATE OF b
                        """, (code_clean, phone_clean))
                        row = cur.fetchone()
                        if not row:
                            raise LookupError("booking is only present in legacy memory storage")
                        if row["payment_status"] == "refunded":
                            raise HTTPException(status_code=409, detail="Vé này đã được hoàn tiền.")
                        if row["payment_status"] != "paid":
                            raise HTTPException(status_code=409, detail="Trạng thái vé hiện tại không thể hoàn tiền.")
                        if _showtime_has_started(row["show_date"], row["start_time"]):
                            raise HTTPException(status_code=400, detail="Phim đã bắt đầu hoặc đã chiếu; vé không thể hoàn tiền.")

                        # Deleting seat rows releases the UNIQUE(showtime_id, seat_code) reservation.
                        cur.execute("DELETE FROM booking_seats WHERE booking_id = %s", (row["id"],))
                        cur.execute("UPDATE bookings SET payment_status = 'refunded' WHERE id = %s", (row["id"],))
                        conn.commit()
                        seat_codes = row["seat_numbers"] or []
                        showtime_id = row["showtime_id"]
                        refunded_in_pg = (showtime_id, seat_codes)
                except LookupError:
                    conn.rollback()
                except HTTPException:
                    conn.rollback()
                    raise
                except Exception as e:
                    conn.rollback()
                    print(f"[REFUND PG ERROR]: {e}")
                    raise HTTPException(status_code=500, detail="Không thể hoàn tiền lúc này. Vui lòng thử lại.")
                finally:
                    conn.close()

                if refunded_in_pg:
                    showtime_id, seat_codes = refunded_in_pg
                    RESERVED_SEATS_MAP.get(showtime_id, set()).difference_update(seat_codes)
                    item = next((b for b in BOOKINGS_STORE if b["booking_code"].upper() == code_clean), None)
                    if item:
                        item["payment_status"] = "refunded"
                    save_persistent_state()
                    return {"success": True, "bookingId": code_clean, "paymentStatus": "Đã hoàn tiền", "showtimeId": showtime_id, "releasedSeats": seat_codes}

        item = next((b for b in BOOKINGS_STORE if b["booking_code"].upper() == code_clean and b.get("customer_phone", "").strip() == phone_clean), None)
        if not item:
            raise HTTPException(status_code=404, detail="Không tìm thấy vé phù hợp để hoàn tiền.")
        if item.get("payment_status", "paid") == "refunded":
            raise HTTPException(status_code=409, detail="Vé này đã được hoàn tiền.")
        try:
            if _showtime_has_started(item["show_date"], item["show_time"]):
                raise HTTPException(status_code=400, detail="Phim đã bắt đầu hoặc đã chiếu; vé không thể hoàn tiền.")
        except (KeyError, ValueError):
            raise HTTPException(status_code=400, detail="Thiếu thời gian suất chiếu nên không thể xác nhận hoàn tiền.")

        item["payment_status"] = "refunded"
        showtime_id = item.get("showtime_id", "")
        RESERVED_SEATS_MAP.get(showtime_id, set()).difference_update(item.get("seat_numbers", []))
        save_persistent_state()
        return {"success": True, "bookingId": code_clean, "paymentStatus": "Đã hoàn tiền", "showtimeId": showtime_id, "releasedSeats": item.get("seat_numbers", [])}
