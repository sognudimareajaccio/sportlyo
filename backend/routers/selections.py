from fastapi import APIRouter, HTTPException, Depends, Request
from deps import db, get_current_user
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


# ============== SELECTIONS (Organizer → Provider workflow) ==============

@router.get("/provider/selections")
async def get_provider_selections(current_user: dict = Depends(get_current_user)):
    """Provider: get all selections grouped by organizer"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    selections = await db.selections.find(
        {"provider_id": current_user['user_id']},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return {"selections": selections}


@router.get("/provider/selections/stats")
async def get_provider_selection_stats(current_user: dict = Depends(get_current_user)):
    """Provider: get selection stats (pending, in_progress, ready counts)"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    selections = await db.selections.find(
        {"provider_id": current_user['user_id']},
        {"_id": 0, "status": 1, "products": 1}
    ).to_list(200)

    stats = {"total": len(selections), "pending": 0, "in_progress": 0, "ready": 0, "total_products": 0, "customized_products": 0}
    for s in selections:
        stats[s.get("status", "pending")] = stats.get(s.get("status", "pending"), 0) + 1
        prods = s.get("products", [])
        stats["total_products"] += len(prods)
        stats["customized_products"] += sum(1 for p in prods if p.get("customized"))

    return stats


@router.get("/provider/selections/{selection_id}")
async def get_selection_detail(selection_id: str, current_user: dict = Depends(get_current_user)):
    """Provider: get a specific selection detail"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")
    sel = await db.selections.find_one(
        {"selection_id": selection_id, "provider_id": current_user['user_id']},
        {"_id": 0}
    )
    if not sel:
        raise HTTPException(status_code=404, detail="Selection non trouvee")
    return {"selection": sel}


@router.put("/provider/selections/{selection_id}/customize/{product_index}")
async def customize_selection_product(selection_id: str, product_index: int, request: Request, current_user: dict = Depends(get_current_user)):
    """Provider: customize a product in a selection (update images with logo)"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    data = await request.json()
    new_images = data.get("images", [])

    sel = await db.selections.find_one(
        {"selection_id": selection_id, "provider_id": current_user['user_id']},
        {"_id": 0}
    )
    if not sel:
        raise HTTPException(status_code=404, detail="Selection non trouvee")

    products = sel.get("products", [])
    if product_index < 0 or product_index >= len(products):
        raise HTTPException(status_code=400, detail="Index produit invalide")

    product_entry = products[product_index]
    product_entry["customized_images"] = new_images
    product_entry["customized"] = True
    product_entry["customized_at"] = datetime.now(timezone.utc).isoformat()

    # Update the selection
    await db.selections.update_one(
        {"selection_id": selection_id},
        {"$set": {
            f"products.{product_index}": product_entry,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Auto-sync: update the organizer's product copy with new images
    org_product_id = product_entry.get("organizer_product_id")
    if org_product_id and new_images:
        await db.products.update_one(
            {"product_id": org_product_id},
            {"$set": {
                "images": new_images,
                "image_url": new_images[0] if new_images else "",
                "customization_status": "ready",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    # Check if all products are customized
    all_customized = all(p.get("customized", False) for p in products)
    if all_customized:
        await db.selections.update_one(
            {"selection_id": selection_id},
            {"$set": {"status": "ready", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        # Notify organizer
        from routers.notifications import create_notification
        await create_notification(
            sel["organizer_id"],
            "selection_ready",
            "Produits personnalises",
            f"Vos produits ont ete personnalises par {current_user.get('company_name') or current_user['name']} ! Ils sont prets a publier."
        )

    return {"message": "Produit personnalise", "product": product_entry, "all_customized": all_customized}


@router.put("/provider/selections/{selection_id}/status")
async def update_selection_status(selection_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Provider: update selection status"""
    if current_user['role'] != 'provider':
        raise HTTPException(status_code=403, detail="Prestataire requis")

    data = await request.json()
    new_status = data.get("status")
    if new_status not in ["pending", "in_progress", "ready"]:
        raise HTTPException(status_code=400, detail="Statut invalide")

    sel = await db.selections.find_one(
        {"selection_id": selection_id, "provider_id": current_user['user_id']},
        {"_id": 0}
    )
    if not sel:
        raise HTTPException(status_code=404, detail="Selection non trouvee")

    await db.selections.update_one(
        {"selection_id": selection_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Notify organizer on status change
    if new_status == "in_progress":
        from routers.notifications import create_notification
        await create_notification(
            sel["organizer_id"],
            "selection_in_progress",
            "Personnalisation en cours",
            f"Le prestataire {current_user.get('company_name') or current_user['name']} a commence la personnalisation de votre selection."
        )

    return {"message": f"Statut mis a jour: {new_status}"}


@router.get("/organizer/selections")
async def get_organizer_selections(current_user: dict = Depends(get_current_user)):
    """Organizer: get all their selections"""
    if current_user['role'] not in ['organizer', 'admin']:
        raise HTTPException(status_code=403, detail="Organisateur requis")
    selections = await db.selections.find(
        {"organizer_id": current_user['user_id']},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return {"selections": selections}
