from typing import List
from fastapi import APIRouter
from app.models import PromotionModel, VoucherValidateRequest, VoucherValidateResponse
from app.database import PROMOTIONS_DATA, is_postgres_available, get_pg_connection

router = APIRouter(prefix="/api/promotions", tags=["Promotions & Vouchers"])

@router.get("", response_model=List[PromotionModel])
def get_promotions():
    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, code, title, description, discount_amount, discount_percent,
                               max_discount, min_order, badge
                        FROM promotions
                        WHERE is_active = TRUE
                        ORDER BY id ASC
                    """)
                    rows = cur.fetchall()
                    return [PromotionModel(**r) for r in rows]
            except Exception as e:
                print(f"[PROMOTIONS ROUTER] PG error: {e}")
            finally:
                conn.close()

    return [PromotionModel(**p) for p in PROMOTIONS_DATA]

@router.post("/validate", response_model=VoucherValidateResponse)
def validate_voucher(req: VoucherValidateRequest):
    code_clean = req.code.strip().upper()
    promo = None

    if is_postgres_available():
        conn = get_pg_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM promotions WHERE code = %s AND is_active = TRUE", (code_clean,))
                    promo = cur.fetchone()
            except Exception as e:
                print(f"[PROMO VALIDATE] PG error: {e}")
            finally:
                conn.close()

    if not promo:
        promo = next((p for p in PROMOTIONS_DATA if p["code"] == code_clean), None)

    if not promo:
        return VoucherValidateResponse(
            valid=False,
            code=code_clean,
            title="",
            discount=0,
            message="Mã ưu đãi không hợp lệ hoặc đã hết lượt áp dụng."
        )

    min_order = float(promo.get("min_order", 0))
    if req.subTotal < min_order:
        return VoucherValidateResponse(
            valid=False,
            code=code_clean,
            title=promo.get("title", ""),
            discount=0,
            message=f"Đơn hàng cần tối thiểu {int(min_order):,}đ để sử dụng mã này."
        )

    discount = float(promo.get("discount_amount", 0))
    pct = int(promo.get("discount_percent", 0))
    max_disc = float(promo.get("max_discount", 0))

    if pct > 0:
        calculated = (req.subTotal * pct) / 100.0
        if max_disc > 0:
            discount = min(calculated, max_disc)
        else:
            discount = calculated

    discount = min(discount, req.subTotal)

    return VoucherValidateResponse(
        valid=True,
        code=code_clean,
        title=promo.get("title", ""),
        discount=discount,
        message=f"Áp dụng thành công mã {code_clean}! Tiết kiệm {int(discount):,}đ"
    )
