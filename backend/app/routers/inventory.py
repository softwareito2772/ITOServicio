from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from ..database import get_db
from ..models import InventoryMovement, Product, User, InventoryMovementType
from ..schemas import InventoryMovementCreate, InventoryMovementResponse
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[InventoryMovementResponse])
async def get_movements(
    skip: int = 0,
    limit: int = 100,
    product_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryMovement)
    
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    
    movements = query.order_by(InventoryMovement.created_at.desc()).offset(skip).limit(limit).all()
    return movements


@router.post("/", response_model=InventoryMovementResponse)
async def create_movement(
    movement: InventoryMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == movement.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if movement.movement_type == InventoryMovementType.ENTRY:
        product.stock += movement.quantity
    elif movement.movement_type == InventoryMovementType.EXIT:
        if product.stock < movement.quantity:
            raise HTTPException(status_code=400, detail="Stock insuficiente")
        product.stock -= movement.quantity
    
    db_movement = InventoryMovement(
        **movement.model_dump(),
        created_by=current_user.id
    )
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    return db_movement


@router.get("/product/{product_id}/history")
async def get_product_history(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.product_id == product_id
    ).order_by(InventoryMovement.created_at.desc()).all()
    
    return {
        "product": {
            "id": product.id,
            "name": product.name,
            "current_stock": product.stock,
            "stock_min": product.stock_min
        },
        "movements": movements
    }
