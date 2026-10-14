import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS, BACKEND_HOST, BACKEND_PORT
from app.database import init_postgres_schema, is_postgres_available
from app.routers import movies, theaters, showtimes, combos, promotions, bookings

app = FastAPI(
    title="MeoCinema API - SD_CUOIKI",
    description="Hệ thống Backend FastAPI Quản lý Đặt Vé Xem Phim & Suất Chiếu MeoCinema (Đồ án SD_CUOIKI)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cấu hình CORS cho phép React frontend kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các API Routers
app.include_router(movies.router)
app.include_router(theaters.router)
app.include_router(showtimes.router)
app.include_router(combos.router)
app.include_router(promotions.router)
app.include_router(bookings.router)

@app.on_event("startup")
def on_startup():
    print("=" * 60)
    print("🚀 Khởi động MeoCinema FastAPI Server (SD_CUOIKI)")
    print(f"📡 API Documentation (Swagger UI): http://localhost:{BACKEND_PORT}/docs")
    print(f"📡 Redoc: http://localhost:{BACKEND_PORT}/redoc")
    pg_ok = init_postgres_schema()
    if pg_ok:
        print("✅ Đã kết nối & nạp database.sql vào PostgreSQL thành công!")
    else:
        print("ℹ️  Đang chạy với Hybrid Repository Engine (Sẵn sàng hoạt động độc lập hoặc với PostgreSQL)")
    print("=" * 60)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "MeoCinema Backend API",
        "version": "1.0.0",
        "project": "SD_CUOIKI",
        "postgres_connected": is_postgres_available(),
        "timestamp": datetime.datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=BACKEND_HOST, port=BACKEND_PORT, reload=True)
