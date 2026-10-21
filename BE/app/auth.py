import hmac
import hashlib
import base64
import json
import time
import secrets
from typing import Optional, Dict, Any
from fastapi import HTTPException, Header, Depends

SECRET_KEY = "meocinema-distributed-systems-secret-key-super-secure-token"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400 * 7 # 7 days

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Tạo salt và hash password sử dụng PBKDF2 HMAC SHA-256."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """Xác thực mật khẩu."""
    check_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(check_hash, hashed_password)

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _b64_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4)) if len(data_str) % 4 != 0 else ''
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_access_token(payload: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """Sinh JWT token theo chuẩn RFC 7519."""
    exp = int(time.time()) + (expires_delta if expires_delta else ACCESS_TOKEN_EXPIRE_SECONDS)
    header = {"alg": ALGORITHM, "typ": "JWT"}
    body = {**payload, "exp": exp, "iat": int(time.time())}

    header_b64 = _b64_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    body_b64 = _b64_encode(json.dumps(body, separators=(',', ':')).encode('utf-8'))
    signing_input = f"{header_b64}.{body_b64}".encode('utf-8')

    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header_b64}.{body_b64}.{sig_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Giải mã và kiểm tra tính hợp lệ của JWT token."""
    parts = token.strip().split('.')
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Token không đúng định dạng JWT")

    header_b64, body_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{body_b64}".encode('utf-8')
    expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()

    try:
        given_sig = _b64_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Chữ ký Token không hợp lệ")

    if not hmac.compare_digest(expected_sig, given_sig):
        raise HTTPException(status_code=401, detail="Chữ ký Token không khớp")

    try:
        body = json.loads(_b64_decode(body_b64).decode('utf-8'))
    except Exception:
        raise HTTPException(status_code=401, detail="Dữ liệu Token bị lỗi")

    if "exp" in body and body["exp"] < time.time():
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn")

    return body

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Lấy thông tin người dùng nếu có header Authorization Bearer."""
    if not authorization:
        return None
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
        return decode_access_token(token)
    except Exception:
        return None

def get_current_user(authorization: str = Header(..., description="Bearer JWT Token")) -> Dict[str, Any]:
    """Bắt buộc có người dùng đã đăng nhập."""
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Header Authorization phải là Bearer")
        return decode_access_token(token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
