from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Company, CompanyModule, User, UserRole, AVAILABLE_MODULES
from ..schemas import CompanyCreate, CompanyUpdate, CompanyResponse, CompanyWithModules, CompanyModuleUpdate, UserResponse
from ..auth import get_current_super_admin, get_current_admin_user, hash_password, get_company_data

router = APIRouter()


@router.get("/", response_model=List[CompanyWithModules])
async def get_all_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    companies = db.query(Company).all()
    result = []
    for c in companies:
        modules = [m.module_name for m in db.query(CompanyModule).filter(
            CompanyModule.company_id == c.id,
            CompanyModule.is_enabled == True
        ).all()]
        result.append(CompanyWithModules(
            id=c.id,
            name=c.name,
            slug=c.slug,
            email_domain=c.email_domain,
            primary_color=c.primary_color,
            secondary_color=c.secondary_color,
            description=c.description,
            logo_url=c.logo_url,
            is_active=c.is_active,
            created_at=c.created_at,
            modules=modules,
        ))
    return result


@router.post("/", response_model=CompanyWithModules)
async def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    existing = db.query(Company).filter(
        (Company.slug == data.slug) | (Company.name == data.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese nombre o slug")

    company = Company(
        name=data.name,
        slug=data.slug,
        logo_url=data.logo_url,
        email_domain=data.email_domain,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        description=data.description,
    )
    db.add(company)
    db.flush()

    for mod in data.modules:
        if mod in AVAILABLE_MODULES:
            cm = CompanyModule(company_id=company.id, module_name=mod, is_enabled=True)
            db.add(cm)

    admin_user = User(
        email=data.admin_email,
        password_hash=hash_password(data.admin_password),
        name=data.admin_name,
        role=UserRole.ADMIN,
        company_id=company.id,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(company)

    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company.id,
        CompanyModule.is_enabled == True
    ).all()]

    return CompanyWithModules(
        id=company.id,
        name=company.name,
        slug=company.slug,
        email_domain=company.email_domain,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        description=company.description,
        logo_url=company.logo_url,
        is_active=company.is_active,
        created_at=company.created_at,
        modules=modules,
    )


@router.get("/available-modules")
async def get_available_modules(
    current_user: User = Depends(get_current_super_admin)
):
    return AVAILABLE_MODULES


@router.get("/{company_id}", response_model=CompanyWithModules)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company.id,
        CompanyModule.is_enabled == True
    ).all()]

    return CompanyWithModules(
        id=company.id,
        name=company.name,
        slug=company.slug,
        email_domain=company.email_domain,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        description=company.description,
        logo_url=company.logo_url,
        is_active=company.is_active,
        created_at=company.created_at,
        modules=modules,
    )


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    return company


@router.put("/{company_id}/modules", response_model=CompanyWithModules)
async def update_company_modules(
    company_id: int,
    data: CompanyModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    db.query(CompanyModule).filter(CompanyModule.company_id == company_id).delete()

    for mod in data.modules:
        if mod in AVAILABLE_MODULES:
            cm = CompanyModule(company_id=company_id, module_name=mod, is_enabled=True)
            db.add(cm)

    db.commit()

    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company_id,
        CompanyModule.is_enabled == True
    ).all()]

    return CompanyWithModules(
        id=company.id,
        name=company.name,
        slug=company.slug,
        email_domain=company.email_domain,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        description=company.description,
        logo_url=company.logo_url,
        is_active=company.is_active,
        created_at=company.created_at,
        modules=modules,
    )


@router.get("/{company_id}/users", response_model=List[UserResponse])
async def get_company_users(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)
):
    users = db.query(User).filter(User.company_id == company_id).all()
    return users


@router.put("/my/settings", response_model=CompanyWithModules)
async def update_my_company(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No tienes empresa asignada")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)

    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company.id,
        CompanyModule.is_enabled == True
    ).all()]

    return CompanyWithModules(
        id=company.id,
        name=company.name,
        slug=company.slug,
        email_domain=company.email_domain,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        description=company.description,
        logo_url=company.logo_url,
        is_active=company.is_active,
        created_at=company.created_at,
        modules=modules,
    )


@router.put("/my/modules", response_model=CompanyWithModules)
async def update_my_modules(
    data: CompanyModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="No tienes empresa asignada")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    db.query(CompanyModule).filter(CompanyModule.company_id == company.id).delete()

    for mod in data.modules:
        if mod in AVAILABLE_MODULES:
            cm = CompanyModule(company_id=company.id, module_name=mod, is_enabled=True)
            db.add(cm)

    db.commit()

    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company.id,
        CompanyModule.is_enabled == True
    ).all()]

    return CompanyWithModules(
        id=company.id,
        name=company.name,
        slug=company.slug,
        email_domain=company.email_domain,
        primary_color=company.primary_color,
        secondary_color=company.secondary_color,
        description=company.description,
        logo_url=company.logo_url,
        is_active=company.is_active,
        created_at=company.created_at,
        modules=modules,
    )
