from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from deps import db, get_current_user, format_duration
from datetime import datetime, timezone

router = APIRouter(prefix="/api")


@router.post("/timing/start")
async def start_race_timer(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    registration_id = data.get('registration_id')
    registration = await db.registrations.find_one(
        {"registration_id": registration_id, "user_id": current_user['user_id']}, {"_id": 0}
    )
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.get('race_started'):
        raise HTTPException(status_code=400, detail="Race already started")
    start_time = datetime.now(timezone.utc).isoformat()
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {"race_started": True, "race_start_time": start_time}}
    )
    return {"message": "Timer started", "start_time": start_time}


@router.post("/timing/stop")
async def stop_race_timer(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    registration_id = data.get('registration_id')
    registration = await db.registrations.find_one(
        {"registration_id": registration_id, "user_id": current_user['user_id']}, {"_id": 0}
    )
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    if not registration.get('race_started'):
        raise HTTPException(status_code=400, detail="Race not started")
    if registration.get('race_finished'):
        raise HTTPException(status_code=400, detail="Race already finished")
    finish_time = datetime.now(timezone.utc)
    start_time = datetime.fromisoformat(registration['race_start_time'].replace('Z', '+00:00'))
    duration = (finish_time - start_time).total_seconds()
    await db.registrations.update_one(
        {"registration_id": registration_id},
        {"$set": {"race_finished": True, "race_finish_time": finish_time.isoformat(), "race_duration_seconds": int(duration)}}
    )
    formatted_time = format_duration(duration)
    return {"message": "Timer stopped", "finish_time": finish_time.isoformat(), "duration_seconds": int(duration), "formatted_time": formatted_time}


@router.get("/timing/results/{event_id}")
async def get_race_results(event_id: str, race: Optional[str] = None, category: Optional[str] = None):
    query = {"event_id": event_id, "race_finished": True, "race_duration_seconds": {"$ne": None}}
    if race:
        query["selected_race"] = race
    if category:
        query["category"] = category
    results = await db.registrations.find(
        query,
        {"_id": 0, "user_name": 1, "first_name": 1, "last_name": 1, "bib_number": 1,
         "rfid_chip_id": 1, "selected_race": 1, "gender": 1, "category": 1,
         "race_duration_seconds": 1, "race_start_time": 1, "race_finish_time": 1}
    ).sort("race_duration_seconds", 1).to_list(1000)

    category_counters = {}
    gender_counters = {}
    for idx, result in enumerate(results):
        result['rank'] = idx + 1
        result['formatted_time'] = format_duration(result['race_duration_seconds'])
        cat = result.get('category', 'SEN')
        category_counters[cat] = category_counters.get(cat, 0) + 1
        result['category_rank'] = category_counters[cat]
        g = result.get('gender', 'M')
        gender_counters[g] = gender_counters.get(g, 0) + 1
        result['gender_rank'] = gender_counters[g]

    all_regs = await db.registrations.find(
        {"event_id": event_id, "race_finished": True},
        {"_id": 0, "category": 1, "selected_race": 1, "gender": 1}
    ).to_list(10000)
    categories = sorted(set(r.get('category', 'SEN') for r in all_regs))
    races = sorted(set(r.get('selected_race', '') for r in all_regs if r.get('selected_race')))
    return {
        "results": results, "total": len(results),
        "categories": categories, "races": races,
        "stats": {"total_finishers": len(results), "male": sum(1 for r in results if r.get('gender') == 'M'), "female": sum(1 for r in results if r.get('gender') == 'F')}
    }


@router.get("/timing/my-results")
async def get_my_results(current_user: dict = Depends(get_current_user)):
    results = await db.registrations.find(
        {"user_id": current_user['user_id'], "race_finished": True, "race_duration_seconds": {"$ne": None}}, {"_id": 0}
    ).sort("race_finish_time", -1).to_list(100)
    for result in results:
        event = await db.events.find_one({"event_id": result['event_id']}, {"_id": 0, "title": 1, "date": 1})
        result['event'] = event
        result['formatted_time'] = format_duration(result['race_duration_seconds'])
    return {"results": results}


# ============== RFID ==============

@router.post("/rfid-read")
async def rfid_read(request: Request):
    data = await request.json()
    chip_id = str(data.get('chip_id', ''))
    timestamp = data.get('timestamp')
    checkpoint = data.get('checkpoint', 'finish')
    event_id = data.get('event_id')
    if not chip_id or not timestamp:
        raise HTTPException(status_code=400, detail="chip_id et timestamp requis")
    query = {"rfid_chip_id": chip_id}
    if event_id:
        query["event_id"] = event_id
    registration = await db.registrations.find_one(query, {"_id": 0})
    if not registration:
        await db.rfid_readings.insert_one({
            "chip_id": chip_id, "timestamp": timestamp, "checkpoint": checkpoint,
            "event_id": event_id, "matched": False, "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"status": "unmatched", "chip_id": chip_id, "message": "Puce RFID non trouvee"}
    reading_doc = {
        "chip_id": chip_id, "registration_id": registration['registration_id'],
        "event_id": registration['event_id'], "bib_number": registration['bib_number'],
        "timestamp": timestamp, "checkpoint": checkpoint, "matched": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rfid_readings.insert_one(reading_doc)
    if checkpoint == 'start':
        await db.registrations.update_one(
            {"registration_id": registration['registration_id']},
            {"$set": {"race_started": True, "race_start_time": timestamp, "checked_in": True}}
        )
        return {"status": "ok", "action": "start_recorded", "bib": registration['bib_number'],
                "name": f"{registration.get('first_name', '')} {registration.get('last_name', '')}"}
    elif checkpoint == 'finish':
        start_time_str = registration.get('race_start_time')
        duration_seconds = None
        formatted_time = None
        if start_time_str:
            try:
                start_dt = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                finish_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                duration_seconds = int((finish_dt - start_dt).total_seconds())
                formatted_time = format_duration(duration_seconds)
            except:
                pass
        await db.registrations.update_one(
            {"registration_id": registration['registration_id']},
            {"$set": {"race_finished": True, "race_finish_time": timestamp, "race_duration_seconds": duration_seconds}}
        )
        return {"status": "ok", "action": "finish_recorded", "bib": registration['bib_number'],
                "name": f"{registration.get('first_name', '')} {registration.get('last_name', '')}",
                "duration_seconds": duration_seconds, "formatted_time": formatted_time}
    else:
        await db.registrations.update_one(
            {"registration_id": registration['registration_id']},
            {"$push": {"checkpoints": {"name": checkpoint, "timestamp": timestamp}}}
        )
        return {"status": "ok", "action": "checkpoint_recorded", "checkpoint": checkpoint, "bib": registration['bib_number']}


@router.post("/rfid-read/bulk")
async def rfid_read_bulk(request: Request):
    data = await request.json()
    readings = data.get('readings', [])
    results = []
    for reading in readings:
        try:
            chip_id = str(reading.get('chip_id', ''))
            timestamp = reading.get('timestamp')
            checkpoint = reading.get('checkpoint', 'finish')
            event_id = reading.get('event_id')
            query = {"rfid_chip_id": chip_id}
            if event_id:
                query["event_id"] = event_id
            reg = await db.registrations.find_one(query, {"_id": 0})
            if reg and checkpoint == 'finish' and reg.get('race_start_time'):
                try:
                    start_dt = datetime.fromisoformat(reg['race_start_time'].replace('Z', '+00:00'))
                    finish_dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    duration = int((finish_dt - start_dt).total_seconds())
                    await db.registrations.update_one(
                        {"registration_id": reg['registration_id']},
                        {"$set": {"race_finished": True, "race_finish_time": timestamp, "race_duration_seconds": duration}}
                    )
                    results.append({"chip_id": chip_id, "status": "ok", "bib": reg['bib_number']})
                except:
                    results.append({"chip_id": chip_id, "status": "error"})
            elif reg and checkpoint == 'start':
                await db.registrations.update_one(
                    {"registration_id": reg['registration_id']},
                    {"$set": {"race_started": True, "race_start_time": timestamp}}
                )
                results.append({"chip_id": chip_id, "status": "ok", "bib": reg['bib_number']})
            else:
                results.append({"chip_id": chip_id, "status": "unmatched"})
        except:
            results.append({"chip_id": reading.get('chip_id'), "status": "error"})
    return {"processed": len(results), "results": results}
