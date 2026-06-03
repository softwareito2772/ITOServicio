from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from ..database import get_db
from ..models import Sale, SaleItem, Product, Client, User, InventoryMovementType
from ..schemas import SaleCreate, SaleUpdate, SaleResponse
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[SaleResponse])
async def get_sales(
    skip: int = 0,
    limit: int = 100,
    client_id: int = None,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale).filter(Sale.company_id == current_user.company_id)
    
    if client_id:
        query = query.filter(Sale.client_id == client_id)
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)
    
    sales = query.order_by(Sale.sale_date.desc()).offset(skip).limit(limit).all()
    return sales


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if current_user.company_id and sale.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return sale


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == sale.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    total = 0
    sale_items_data = []
    
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name}. Stock actual: {product.stock}"
            )
        
        product.stock -= item.quantity
        
        movement = InventoryMovementType.EXIT
        db_movement = type('InventoryMovement', (), {
            'product_id': product.id,
            'quantity': item.quantity,
            'movement_type': movement,
            'reason': f"Venta #{sale.client_id}",
            'created_by': current_user.id
        })()
        
        from .inventory import create_movement
        total += item.unit_price * item.quantity
    
    db_sale = Sale(
        client_id=sale.client_id,
        total=total,
        sale_date=date.today(),
        created_by=current_user.id,
        company_id=current_user.company_id,
        notes=sale.notes
    )
    db.add(db_sale)
    db.flush()
    
    for item in sale.items:
        db_item = SaleItem(
            sale_id=db_sale.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price
        )
        db.add(db_item)
        
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            from .inventory import create_movement
            pass
    
    db.commit()
    db.refresh(db_sale)
    return db_sale


@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale(
    sale_id: int,
    sale_update: SaleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if current_user.company_id and sale.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if sale_update.status:
        sale.status = sale_update.status
    if sale_update.notes is not None:
        sale.notes = sale_update.notes
    
    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}")
async def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    if current_user.company_id and sale.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db.delete(sale)
    db.commit()
    return {"message": "Venta eliminada correctamente"}
