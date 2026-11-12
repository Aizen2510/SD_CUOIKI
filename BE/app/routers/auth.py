import datetime
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, Dict, Any, List
from app.models import UserRegisterRequest, UserLoginRequest, UserResponse, AuthTokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional, ACCESS_TOKEN_EXPIRE_SECONDS
from app.database import get_pg_connection

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])

# 10 tài khoản khách hàng thử nghiệm (dùng chung mật khẩu: MeoTest@2026)
IN_MEMORY_USERS: List[Dict[str, Any]] = [
    {
        "id": i,
        "email": f"khach{i}@meocinema.test",
        "phone": f"09010000{i:02d}",
        "full_name": f"Khách thử nghiệm {i}",
        "password_hash": h,
        "salt": s,
        "role": "customer",
        "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed=khach{i}",
        "created_at": "2026-01-01T00:00:00"
    }
    for i, (h, s) in enumerate([
        ("fa9a6d0b042af75d2566f19f1a3b869b1a7a7ee2b816843015fc311d5767efb8", "c0e307a9ee29ea7c8fd1e9bca3976290"),
        ("c73adc8b7310028467e692d0bffa7e637d03114ac8edd33e9705937b2e10fd12", "00b05ecd80c8d55ee9a1fdda1ea9192b"),
        ("7ae062884fce25e0b3ef9ba6d7b611da611d60b1459ec8964b724aee904bd58e", "89ead2b46dd2bd3b33254858daaf45ee"),
        ("e0e8b2d1913dc5a7e3f65bdfda3b604897f54d530aacf9c0e065401a593cb0f8", "f71a24f0e2454af7f1b1de06cbff6b50"),
        ("cddebaa51a8c0d4f6f2644e7d12057e9fbecae6690bc2810268c7e6b10cfd225", "f746556d2c70090f9e3d97c9dd8c3d08"),
        ("02a091fe2dc82546e36cc7219d7c2663bef07143b1718d9fbce1c2ab7b88c38e", "2463a39427dfe4c65362963d21260425"),
        ("ff3163590eb6f11fec53261ee214dab2a15c3b1aeab6ec95b2abeae22a9704d3", "1afce2e2c3af4c7951123acde89ea618"),
        ("71395bae1a454b888f4d34de80245ad9ecec58b0a2a50f2811ad4eb2f279593b", "c930673aad3c5c8f8866a6f129beba68"),
        ("70dd860962b3eb4a516d306437035c9261d9c3e05939e33a82404715e3c22f32", "8b40cf777c8d6aba8923ebca9fe4a09e"),
        ("14cc18f35bf542d433132532877a1fcdaa604f25a5bdb472ff1de1cab8e23570", "d0bea1958fdd0bfaa35701be5221b90a"),
    ], 1)
]

def _find_user_by_account(account: str) -> Optional[Dict[str, Any]]:
    account_clean = account.strip().lower()
    # Try PostgreSQL first if available
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, email, phone, full_name, password_hash, salt, role, avatar_url, created_at
                    FROM users
                    WHERE LOWER(email) = %s OR phone = %s
                """, (account_clean, account.strip()))
                row = cur.fetchone()
                if row:
                    return dict(row)
        except Exception:
            pass
        finally:
            conn.close()

    # Fallback to In-Memory
    for u in IN_MEMORY_USERS:
        if u["email"].lower() == account_clean or u["phone"] == account.strip():
            return u
    return None

def _insert_user(full_name: str, email: str, phone: str, password_hash: str, salt: str) -> Dict[str, Any]:
    new_id = len(IN_MEMORY_USERS) + 1
    now_str = datetime.datetime.now().isoformat()
    new_user = {
        "id": new_id,
        "email": email.strip().lower(),
        "phone": phone.strip(),
        "full_name": full_name.strip(),
        "password_hash": password_hash,
        "salt": salt,
        "role": "customer",
        "avatar_url": f"https://api.dicebear.com/7.x/bottts/svg?seed={email.strip().lower()}",
        "created_at": now_str
    }

    # Registration must be durable; never return a token for a memory-only user.
    conn = get_pg_connection()
    if not conn:
        raise HTTPException(status_code=503, detail="Cụm database đang chuyển node; chưa đăng ký được. Vui lòng thử lại.")
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (email, phone, full_name, password_hash, salt, role, avatar_url, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, email, phone, full_name, role, avatar_url, created_at
            """, (
                new_user["email"], new_user["phone"], new_user["full_name"],
                new_user["password_hash"], new_user["salt"], new_user["role"],
                new_user["avatar_url"], now_str
            ))
            inserted = cur.fetchone()
            conn.commit()
            if inserted:
                new_user["id"] = inserted["id"]
    except Exception as exc:
        conn.rollback()
        if getattr(exc, "pgcode", None) == "23505":
            raise HTTPException(status_code=409, detail="Email hoặc số điện thoại đã được đăng ký.") from exc
        raise HTTPException(status_code=503, detail="Không thể lưu tài khoản vào database; chưa đăng ký thành công.") from exc
    finally:
        conn.close()

    IN_MEMORY_USERS.append(new_user)
    return new_user

@router.post("/register", summary="Đăng ký tài khoản người dùng mới", response_model=AuthTokenResponse)
def register(payload: UserRegisterRequest):
    email = payload.email.strip().lower()
    phone = payload.phone.strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Địa chỉ email không hợp lệ")
    if not phone or len(phone) < 9:
        raise HTTPException(status_code=400, detail="Số điện thoại không hợp lệ")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu tối thiểu phải từ 6 ký tự")

    existing_user = _find_user_by_account(email) or _find_user_by_account(phone)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email hoặc số điện thoại đã được đăng ký trong hệ thống")

    pwd_hash, salt = hash_password(payload.password)
    user = _insert_user(
        full_name=payload.fullName,
        email=email,
        phone=phone,
        password_hash=pwd_hash,
        salt=salt
    )

    token = create_access_token({
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user["full_name"],
        "role": user["role"]
    })

    user_resp = UserResponse(
        id=user["id"],
        fullName=user["full_name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        avatarUrl=user.get("avatar_url", ""),
        createdAt=str(user.get("created_at", ""))
    )

    return AuthTokenResponse(
        accessToken=token,
        tokenType="Bearer",
        expiresIn=ACCESS_TOKEN_EXPIRE_SECONDS,
        user=user_resp
    )

@router.post("/login", summary="Đăng nhập tài khoản bằng Email/SĐT và Mật khẩu", response_model=AuthTokenResponse)
def login(payload: UserLoginRequest):
    account = payload.account.strip()
    if not account or not payload.password:
        raise HTTPException(status_code=400, detail="Vui lòng nhập tài khoản và mật khẩu")

    user = _find_user_by_account(account)
    if not user:
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không chính xác")

    if not verify_password(payload.password, user["password_hash"], user["salt"]):
        raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không chính xác")

    token = create_access_token({
        "sub": str(user["id"]),
        "email": user["email"],
        "name": user["full_name"],
        "role": user["role"]
    })

    user_resp = UserResponse(
        id=user["id"],
        fullName=user["full_name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        avatarUrl=user.get("avatar_url", ""),
        createdAt=str(user.get("created_at", ""))
    )

    return AuthTokenResponse(
        accessToken=token,
        tokenType="Bearer",
        expiresIn=ACCESS_TOKEN_EXPIRE_SECONDS,
        user=user_resp
    )

@router.get("/me", summary="Lấy thông tin tài khoản người dùng hiện tại", response_model=UserResponse)
def get_me(user_claims: Dict[str, Any] = Depends(get_current_user)):
    user_id = user_claims.get("sub")
    account = user_claims.get("email")
    user = _find_user_by_account(account)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin tài khoản")

    return UserResponse(
        id=user["id"],
        fullName=user["full_name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        avatarUrl=user.get("avatar_url", ""),
        createdAt=str(user.get("created_at", ""))
    )

@router.post("/logout", summary="Đăng xuất phiên làm việc")
def logout(user_claims: Dict[str, Any] = Depends(get_current_user)):
    return {
        "success": True,
        "message": "Đăng xuất thành công",
        "timestamp": datetime.datetime.now().isoformat()
    }
