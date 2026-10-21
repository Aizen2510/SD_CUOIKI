import datetime
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, Dict, Any, List
from app.models import UserRegisterRequest, UserLoginRequest, UserResponse, AuthTokenResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user, get_current_user_optional, ACCESS_TOKEN_EXPIRE_SECONDS
from app.database import get_pg_connection

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])

# Test accounts are seeded in PostgreSQL; fallback starts without hardcoded users.
IN_MEMORY_USERS: List[Dict[str, Any]] = []

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

    # Save to PostgreSQL if connected
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO users (email, phone, full_name, password_hash, salt, role, avatar_url, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, email, phone, full_name, role, avatar_url, created_at
                """, (
                    new_user["email"],
                    new_user["phone"],
                    new_user["full_name"],
                    new_user["password_hash"],
                    new_user["salt"],
                    new_user["role"],
                    new_user["avatar_url"],
                    now_str
                ))
                inserted = cur.fetchone()
                conn.commit()
                if inserted:
                    new_user["id"] = inserted["id"]
        except Exception:
            if conn:
                conn.rollback()
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
