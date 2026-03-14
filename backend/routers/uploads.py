from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from deps import db, get_current_user, UPLOAD_DIR
from pathlib import Path
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_DOC_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/registrations/{registration_id}/upload-pps")
async def upload_pps_document(registration_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    reg = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription introuvable")
    if reg['user_id'] != current_user['user_id'] and current_user['role'] not in ['admin', 'organizer']:
        raise HTTPException(status_code=403, detail="Non autorise")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorise. Utilisez: {', '.join(ALLOWED_DOC_EXTENSIONS)}")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
    unique_filename = f"pps_{registration_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = UPLOAD_DIR / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)
    pps_url = f"/api/uploads/{unique_filename}"
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {"pps_document_url": pps_url, "pps_uploaded_at": datetime.now(timezone.utc).isoformat(), "pps_verified": False, "pps_status": "pending"}}
    )
    return {"message": "PPS telecharge avec succes", "url": pps_url}


@router.post("/registrations/{registration_id}/verify-pps")
async def verify_pps_document(registration_id: str, request=None, current_user: dict = Depends(get_current_user)):
    from fastapi import Request
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    data = await request.json()
    action = data.get('action', 'approve')
    reg = await db.registrations.find_one({"registration_id": registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription introuvable")
    if action == 'approve':
        await db.registrations.update_one({"registration_id": registration_id}, {"$set": {"pps_verified": True, "pps_status": "approved"}})
        return {"message": "PPS verifie et approuve"}
    else:
        await db.registrations.update_one({"registration_id": registration_id}, {"$set": {"pps_verified": False, "pps_status": "rejected"}})
        return {"message": "PPS rejete"}


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['organizer', 'admin', 'provider']:
        raise HTTPException(status_code=403, detail="Not authorized")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Type de fichier non autorise. Utilisez: {', '.join(ALLOWED_EXTENSIONS)}")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)
    return {"filename": unique_filename, "url": f"/api/uploads/{unique_filename}", "size": len(content)}


@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    ext = Path(filename).suffix.lower()
    content_types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'}
    return FileResponse(path=file_path, media_type=content_types.get(ext, 'application/octet-stream'))
