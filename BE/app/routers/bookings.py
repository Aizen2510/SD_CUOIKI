import random
import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from app.models import (
    BookingCreateRequest, DigitalTicketResponse
)
from app.database import (
    BOOKINGS_STORE, RESERVED_SEATS_MAP, SHOWTIMES_DATA, MOVIES_DATA,
    THEATERS_DATA, COMBOS_DATA, PROMOTIONS_DATA,
    is_postgres_available, get_pg_connection
)

router = APIRouter(prefix="/api/bookings", tags=["Bookings & Tickets"])

@router.post("", response_model=DigitalTicketResponse, status_code=status.HTTP_201_CREATED)
def create_booking(req: BookingCreateRequest):
    if not req.seats or len(req.seats) == 0:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 ghế")

    seat_codes = [s.id for s in req.seats]

    # Find showtime context
    showtime = next((s for s in SHOWTIMES_DATA if s["id"] == req.showtimeId), None)
    if not showtime:
        raise HTTPException(status_code=404, detail="Suất chiếu không tồn tại")

    movie = next((m for m in MOVIES_DATA if m["id"] == showtime["movie_id"]), None)
    theater = next((t for t in THEATERS_DATA if t["id"] == showtime["theater_id"]), None)

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
    now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    qr_url = f"https://meocinema.vn/ticket/{booking_code}"

    # 5. Save to PostgreSQL if connected
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                conn.autocommit = False
                with conn.cursor() as cur:
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
                raise
            except Exception as e:
                conn.rollback()
                print(f"[BOOKING PG ERROR]: {e}")
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
        "movie_title": movie["title"] if movie else "Phim chiếu rạp",
        "poster_url": movie["poster_url"] if movie else "",
        "cinema_name": theater["name"] if theater else "Cụm rạp MeoCinema",
        "cinema_address": theater["address"] if theater else "TP. Hồ Chí Minh",
        "screen_room": showtime["room_name"] if showtime else "Cinema 1",
        "format": showtime["format"] if showtime else "2D Phụ đề",
        "show_date": showtime["show_date"] if showtime else datetime.date.today().isoformat(),
        "show_time": showtime["start_time"] if showtime else "20:00",
        "combos": chosen_combos_desc
    }
    BOOKINGS_STORE.append(ticket_data)

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
                        SELECT b.booking_code, b.created_at::text, b.customer_name, b.customer_phone,
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
                            bookingTime=str(row["created_at"]),
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
                            paymentStatus="Đã thanh toán",
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
        paymentStatus="Đã thanh toán",
        qrCodeValue=item["qr_code_value"]
    )

@router.get("/by-phone/{phone}", response_model=List[DigitalTicketResponse])
def get_bookings_by_phone(phone: str):
    phone_clean = phone.strip()
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
            paymentStatus="Đã thanh toán",
            qrCodeValue=item["qr_code_value"]
        ))
    return output
