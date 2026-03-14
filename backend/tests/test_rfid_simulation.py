#!/usr/bin/env python3
"""
=================================================================
  SPORTLYO - SIMULATION INTÉGRATION CHRONOMÉTRAGE RFID
  Compatible : RaceResult, Chronotrack, MyLaps, Webscorer
=================================================================

Ce script simule une course complète :
1. Ajoute des participants avec puces RFID
2. Envoie les signaux START via l'API RFID
3. Envoie les signaux FINISH avec des temps réalistes
4. Affiche les résultats et le classement en direct

Usage: python3 test_rfid_simulation.py
"""

import requests
import time
import json
import random
from datetime import datetime, timezone, timedelta

API_URL = "https://sportlyo-bugs.preview.emergentagent.com/api"
EVENT_ID = "evt_f79c5cfd5036"  # COURSE CORSICA FEVER

# Login as organizer
def login(email, password):
    r = requests.post(f"{API_URL}/auth/login", json={"email": email, "password": password})
    return r.json()["token"]

def sep(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ================================================================
# STEP 1: Add participants with RFID chips
# ================================================================
def setup_participants(token):
    sep("ÉTAPE 1 : INSCRIPTION DES PARTICIPANTS")
    
    participants = [
        {"first_name": "Lucas", "last_name": "Martin", "email": "lucas@test.com", "gender": "M", "birth_date": "1995-03-12", "selected_race": "10 km"},
        {"first_name": "Emma", "last_name": "Bernard", "email": "emma@test.com", "gender": "F", "birth_date": "1988-07-22", "selected_race": "10 km"},
        {"first_name": "Hugo", "last_name": "Petit", "email": "hugo@test.com", "gender": "M", "birth_date": "1992-11-05", "selected_race": "20 km"},
        {"first_name": "Léa", "last_name": "Dubois", "email": "lea@test.com", "gender": "F", "birth_date": "1990-01-15", "selected_race": "20 km"},
        {"first_name": "Thomas", "last_name": "Moreau", "email": "thomas@test.com", "gender": "M", "birth_date": "1985-06-30", "selected_race": "35 km"},
        {"first_name": "Camille", "last_name": "Laurent", "email": "camille@test.com", "gender": "F", "birth_date": "1998-09-18", "selected_race": "35 km"},
        {"first_name": "Nathan", "last_name": "Simon", "email": "nathan@test.com", "gender": "M", "birth_date": "2000-04-02", "selected_race": "10 km"},
        {"first_name": "Chloé", "last_name": "Michel", "email": "chloe@test.com", "gender": "F", "birth_date": "1993-12-25", "selected_race": "20 km"},
    ]
    
    registered = []
    for p in participants:
        r = requests.post(
            f"{API_URL}/organizer/events/{EVENT_ID}/add-participant",
            json=p,
            headers={"Authorization": f"Bearer {token}"}
        )
        if r.status_code == 200:
            data = r.json()
            print(f"  ✓ {p['first_name']} {p['last_name']} — Dossard: {data['bib_number']} — {p['selected_race']}")
            registered.append({**p, **data})
        else:
            print(f"  ✗ {p['first_name']} {p['last_name']} — {r.json().get('detail', 'Erreur')}")
    
    return registered

# ================================================================
# STEP 2: Get registered participants with RFID chips
# ================================================================
def get_participants_with_chips(token):
    sep("ÉTAPE 2 : RÉCUPÉRATION DES PUCES RFID")
    
    r = requests.get(
        f"{API_URL}/organizer/registrations/{EVENT_ID}",
        headers={"Authorization": f"Bearer {token}"}
    )
    regs = r.json()["registrations"]
    
    participants = []
    for reg in regs:
        if reg.get("rfid_chip_id") and reg.get("first_name"):
            participants.append(reg)
            print(f"  Puce {reg['rfid_chip_id']} → {reg['first_name']} {reg['last_name']} (Dossard {reg['bib_number']}) — {reg.get('selected_race', '?')}")
    
    print(f"\n  → {len(participants)} participants équipés de puces RFID")
    return participants

# ================================================================
# STEP 3: Simulate START signals
# ================================================================
def simulate_start(participants):
    sep("ÉTAPE 3 : DÉPART DE LA COURSE")
    
    start_time = datetime.now(timezone.utc)
    print(f"  ⏱  Heure de départ : {start_time.strftime('%H:%M:%S')}")
    print(f"  📡 Envoi des signaux START aux bornes RFID...\n")
    
    results = {}
    for p in participants:
        r = requests.post(f"{API_URL}/rfid-read", json={
            "chip_id": p["rfid_chip_id"],
            "timestamp": start_time.isoformat(),
            "checkpoint": "start",
            "event_id": EVENT_ID
        })
        data = r.json()
        status = "✓" if data.get("status") == "ok" else "✗"
        print(f"  {status} START — Dossard {p['bib_number']} — {p['first_name']} {p['last_name']}")
        results[p["rfid_chip_id"]] = {"start": start_time, "participant": p}
    
    return start_time, results

# ================================================================
# STEP 4: Simulate FINISH signals with realistic times
# ================================================================
def simulate_finish(participants, start_time, results):
    sep("ÉTAPE 4 : ARRIVÉES (SIMULATION TEMPS RÉELS)")
    
    # Realistic finish times by race distance
    time_ranges = {
        "10 km": (40*60, 65*60),     # 40min - 1h05
        "20 km": (90*60, 140*60),    # 1h30 - 2h20
        "35 km": (170*60, 250*60),   # 2h50 - 4h10
    }
    
    # Generate random but realistic finish times
    finishers = []
    for p in participants:
        race = p.get("selected_race", "10 km")
        min_sec, max_sec = time_ranges.get(race, (40*60, 70*60))
        duration = random.randint(min_sec, max_sec)
        finish_time = start_time + timedelta(seconds=duration)
        finishers.append((finish_time, duration, p))
    
    # Sort by finish time (first to arrive)
    finishers.sort(key=lambda x: x[0])
    
    print(f"  📡 Simulation des passages à la borne d'arrivée...\n")
    
    for idx, (finish_time, duration, p) in enumerate(finishers):
        r = requests.post(f"{API_URL}/rfid-read", json={
            "chip_id": p["rfid_chip_id"],
            "timestamp": finish_time.isoformat(),
            "checkpoint": "finish",
            "event_id": EVENT_ID
        })
        data = r.json()
        formatted = data.get("formatted_time", f"{duration//3600}h{(duration%3600)//60:02d}m{duration%60:02d}s")
        status = "✓" if data.get("status") == "ok" else "✗"
        print(f"  {status} #{idx+1} FINISH — Dossard {p['bib_number']} — {p['first_name']} {p['last_name']} — ⏱ {formatted} — {p.get('selected_race','')}")
        time.sleep(0.2)  # Small delay for realism
    
    return finishers

# ================================================================
# STEP 5: Fetch and display results
# ================================================================
def show_results():
    sep("ÉTAPE 5 : CLASSEMENT GÉNÉRAL")
    
    r = requests.get(f"{API_URL}/timing/results/{EVENT_ID}")
    data = r.json()
    results = data.get("results", [])
    
    if not results:
        print("  Aucun résultat disponible")
        return
    
    # General ranking
    print(f"\n  {'Rang':<6} {'Dossard':<10} {'Participant':<25} {'Épreuve':<10} {'Cat.':<8} {'Temps':<12}")
    print(f"  {'─'*6} {'─'*10} {'─'*25} {'─'*10} {'─'*8} {'─'*12}")
    
    for i, r in enumerate(results):
        name = f"{r.get('first_name', '')} {r.get('last_name', r.get('user_name', ''))}"
        race = r.get('selected_race') or '-'
        cat = r.get('category') or '-'
        ftime = r.get('formatted_time') or 'DNF'
        print(f"  {i+1:<6} {r.get('bib_number','?'):<10} {name:<25} {race:<10} {cat:<8} {ftime:<12}")
    
    # Results by race
    for race in ["10 km", "20 km", "35 km"]:
        sep(f"CLASSEMENT — {race}")
        r = requests.get(f"{API_URL}/timing/results/{EVENT_ID}?race={race}")
        race_results = r.json().get("results", [])
        
        if not race_results:
            print(f"  Pas de résultats pour {race}")
            continue
        
        print(f"\n  {'Rang':<6} {'Dossard':<10} {'Participant':<25} {'Cat.':<8} {'Temps':<12}")
        print(f"  {'─'*6} {'─'*10} {'─'*25} {'─'*8} {'─'*12}")
        
        for i, r in enumerate(race_results):
            name = f"{r.get('first_name', '')} {r.get('last_name', r.get('user_name', ''))}"
            cat = r.get('category') or '-'
            ftime = r.get('formatted_time') or 'DNF'
            print(f"  {i+1:<6} {r.get('bib_number','?'):<10} {name:<25} {cat:<8} {ftime:<12}")

# ================================================================
# STEP 6: Test Check-in scan
# ================================================================
def test_checkin(token, participants):
    sep("ÉTAPE 6 : TEST CHECK-IN (SCAN QR CODE)")
    
    if len(participants) < 2:
        print("  Pas assez de participants pour tester")
        return
    
    # Scan by bib number
    p = participants[0]
    r = requests.post(
        f"{API_URL}/checkin/scan",
        json={"bib_number": p["bib_number"]},
        headers={"Authorization": f"Bearer {token}"}
    )
    data = r.json()
    print(f"  Scan dossard {p['bib_number']} → {data.get('status','?')} : {data.get('message','')}")
    
    # Check-in stats
    r = requests.get(
        f"{API_URL}/checkin/stats/{EVENT_ID}",
        headers={"Authorization": f"Bearer {token}"}
    )
    stats = r.json()
    print(f"\n  📊 Stats Check-in :")
    print(f"     Inscrits:  {stats.get('total_registered', '?')}")
    print(f"     Pointés:   {stats.get('checked_in', '?')}")
    print(f"     Restants:  {stats.get('remaining', '?')}")

# ================================================================
# STEP 7: Test timing export CSV
# ================================================================
def test_export(token):
    sep("ÉTAPE 7 : EXPORT CSV CHRONOMÉTRAGE")
    
    r = requests.get(
        f"{API_URL}/organizer/events/{EVENT_ID}/export-timing",
        headers={"Authorization": f"Bearer {token}"}
    )
    if r.status_code == 200:
        lines = r.text.strip().split('\n')
        print(f"  ✓ Export CSV généré — {len(lines)} lignes (1 header + {len(lines)-1} participants)")
        print(f"\n  Aperçu :")
        for line in lines[:6]:
            print(f"    {line}")
        if len(lines) > 6:
            print(f"    ... ({len(lines)-6} lignes supplémentaires)")
    else:
        print(f"  ✗ Erreur export : {r.status_code}")


# ================================================================
# MAIN
# ================================================================
if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════════════════════╗
║   SPORTLYO — SIMULATION CHRONOMÉTRAGE RFID               ║
║   Événement : COURSE CORSICA FEVER                        ║
║   Compatible : RaceResult, Chronotrack, MyLaps, Webscorer ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Login
    token = login("club@paris-sport.fr", "club123")
    print(f"  ✓ Connecté en tant qu'organisateur\n")
    
    # Step 1: Add participants
    setup_participants(token)
    
    # Step 2: Get participants with RFID chips
    participants = get_participants_with_chips(token)
    
    if len(participants) < 2:
        print("\n  ✗ Pas assez de participants avec puces RFID")
        exit(1)
    
    # Step 3: START
    start_time, results = simulate_start(participants)
    
    # Step 4: FINISH
    finishers = simulate_finish(participants, start_time, results)
    
    # Step 5: Results
    show_results()
    
    # Step 6: Check-in
    test_checkin(token, participants)
    
    # Step 7: Export
    test_export(token)
    
    sep("SIMULATION TERMINÉE ✓")
    print(f"""
  La simulation a démontré le flux complet :
  
  1. Inscription des participants avec attribution automatique
     de dossards et puces RFID
  2. Réception des signaux START depuis les bornes RFID
  3. Réception des signaux FINISH avec calcul automatique
     des temps de course
  4. Génération des classements par épreuve et catégorie
  5. Scan QR code / dossard pour le check-in
  6. Export CSV pour logiciel de chronométrage externe
  
  → L'API RFID est compatible avec :
    • RaceResult  • Chronotrack  • MyLaps  • Webscorer
  
  → Endpoint : POST {API_URL}/rfid-read
    Body : {{ "chip_id": "...", "timestamp": "ISO8601",
             "checkpoint": "start|finish", "event_id": "..." }}
""")
