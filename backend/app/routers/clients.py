from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import Client, Equipment, User
from ..schemas import ClientCreate, ClientUpdate, ClientResponse
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
async def get_clients(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Client).filter(Client.is_active == True)

    if current_user.company_id:
        query = query.filter(Client.company_id == current_user.company_id)

    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%")) |
            (Client.email.ilike(f"%{search}%"))
        )

    clients = query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return clients


@router.get("/inactive", response_model=List[ClientResponse])
async def get_inactive_clients(
    months: int = 6,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff_date = datetime.now().date() - relativedelta(months=months)

    equipment_query = db.query(Equipment.client_id).filter(
        Equipment.created_at >= cutoff_date
    )
    if current_user.company_id:
        equipment_query = equipment_query.filter(Equipment.company_id == current_user.company_id)

    active_client_ids = equipment_query.distinct().all()
    active_ids = [c[0] for c in active_client_ids]

    query = db.query(Client).filter(
        Client.is_active == True,
        ~Client.id.in_(active_ids) if active_ids else True
    )

    if current_user.company_id:
        query = query.filter(Client.company_id == current_user.company_id)

    clients = query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if current_user.company_id and client.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return client


@router.post("/", response_model=ClientResponse)
async def create_client(
    client: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_client = Client(**client.model_dump(), company_id=current_user.company_id)
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_update: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if current_user.company_id and client.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    for key, value in client_update.model_dump(exclude_unset=True).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}")
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if current_user.company_id and client.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    client.is_active = False
    db.commit()
    return {"message": "Cliente eliminado correctamente"}


@router.get("/{client_id}/equipment", response_model=List)
async def get_client_equipment(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(
        Equipment.client_id == client_id
    ).order_by(Equipment.created_at.desc()).all()

    if current_user.company_id:
        equipment = [e for e in equipment if e.company_id == current_user.company_id]

    result = []
    for eq in equipment:
        result.append({
            "id": eq.id,
            "type_name": eq.type_name,
            "brand": eq.brand,
            "model": eq.model,
            "serial_number": eq.serial_number,
            "status": eq.status,
            "arrival_date": eq.arrival_date,
            "created_at": eq.created_at
        })

    return result
