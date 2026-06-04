from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from .models import UserRole, ServiceLocation, EquipmentStatus, ArrivalCondition, WarrantyType, InventoryMovementType


AVAILABLE_MODULES = [
    "ventas", "mantenimiento", "reparaciones", "equipos",
    "productos", "clientes", "garantias", "reportes", "inventario"
]


class CompanyBase(BaseModel):
    name: str
    slug: str
    email_domain: Optional[str] = None
    primary_color: str = "#7C9CBF"
    secondary_color: str = "#B4C7E7"
    description: Optional[str] = None


class CompanyCreate(CompanyBase):
    logo_url: Optional[str] = None
    modules: List[str] = []
    admin_email: str
    admin_password: str
    admin_name: str


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    email_domain: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(CompanyBase):
    id: int
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyWithModules(CompanyResponse):
    modules: List[str] = []


class CompanyModuleUpdate(BaseModel):
    modules: List[str]


class UserBase(BaseModel):
    email: str
    name: str


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    avatar: Optional[str] = None


class UserResponse(UserBase):
    id: int
    role: str
    avatar: Optional[str] = None
    is_active: bool
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    company_primary_color: Optional[str] = None
    company_secondary_color: Optional[str] = None
    company_modules: List[str] = []


class TokenData(BaseModel):
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    role: Optional[str] = None


class ClientBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    id: int
    is_active: bool
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = 0
    stock: int = 0
    stock_min: int = 5
    category_id: Optional[int] = None
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    stock_min: Optional[int] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    company_id: Optional[int] = None
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class InventoryMovementBase(BaseModel):
    product_id: int
    quantity: int
    movement_type: InventoryMovementType
    reason: Optional[str] = None


class InventoryMovementCreate(InventoryMovementBase):
    pass


class InventoryMovementResponse(InventoryMovementBase):
    id: int
    created_by: Optional[int] = None
    company_id: Optional[int] = None
    created_at: datetime
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True


class SaleItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float


class SaleItemCreate(SaleItemBase):
    pass


class SaleItemResponse(SaleItemBase):
    id: int
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    client_id: int
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    items: List[SaleItemCreate]


class SaleUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class SaleResponse(SaleBase):
    id: int
    total: float
    status: str
    sale_date: date
    created_by: Optional[int] = None
    company_id: Optional[int] = None
    created_at: datetime
    client: Optional[ClientResponse] = None
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True


class EquipmentBase(BaseModel):
    client_id: int
    category_id: Optional[int] = None
    type_name: str
    brand: Optional[str] = None
    model: str
    serial_number: str
    description: Optional[str] = None
    purchase_date: Optional[date] = None
    manufacturer_warranty: Optional[str] = None
    service_location: ServiceLocation = ServiceLocation.LOCAL


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    category_id: Optional[int] = None
    type_name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    description: Optional[str] = None
    purchase_date: Optional[date] = None
    manufacturer_warranty: Optional[str] = None
    service_location: Optional[ServiceLocation] = None
    status: Optional[EquipmentStatus] = None


class EquipmentResponse(EquipmentBase):
    id: int
    status: EquipmentStatus
    arrival_date: date
    company_id: Optional[int] = None
    created_at: datetime
    client: Optional[ClientResponse] = None
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class MaintenanceImageBase(BaseModel):
    image_url: str
    image_type: str = "before"
    caption: Optional[str] = None


class MaintenanceImageCreate(MaintenanceImageBase):
    pass


class MaintenanceImageResponse(MaintenanceImageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MaintenanceBase(BaseModel):
    equipment_id: int
    description: str
    technician_notes: Optional[str] = None
    service_location: ServiceLocation = ServiceLocation.LOCAL
    start_date: date = None
    end_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    cost: float = 0
    status: EquipmentStatus = EquipmentStatus.PENDING


class MaintenanceCreate(MaintenanceBase):
    images: List[MaintenanceImageCreate] = []


class MaintenanceUpdate(BaseModel):
    description: Optional[str] = None
    technician_notes: Optional[str] = None
    service_location: Optional[ServiceLocation] = None
    end_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    cost: Optional[float] = None
    status: Optional[EquipmentStatus] = None


class MaintenanceResponse(MaintenanceBase):
    id: int
    technician_id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: datetime
    equipment: Optional[EquipmentResponse] = None
    technician: Optional[UserResponse] = None
    images: List[MaintenanceImageResponse] = []

    class Config:
        from_attributes = True


class RepairImageBase(BaseModel):
    image_url: str
    image_type: str = "before"
    caption: Optional[str] = None


class RepairImageCreate(RepairImageBase):
    pass


class RepairImageResponse(RepairImageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RepairBase(BaseModel):
    equipment_id: int
    arrival_condition: ArrivalCondition
    arrival_condition_other: Optional[str] = None
    diagnosis: Optional[str] = None
    solution: Optional[str] = None
    parts_used: Optional[str] = None
    total_cost: float = 0
    service_location: ServiceLocation = ServiceLocation.LOCAL
    start_date: date = None
    end_date: Optional[date] = None
    status: EquipmentStatus = EquipmentStatus.PENDING


class RepairCreate(RepairBase):
    images: List[RepairImageCreate] = []


class RepairUpdate(BaseModel):
    arrival_condition: Optional[ArrivalCondition] = None
    arrival_condition_other: Optional[str] = None
    diagnosis: Optional[str] = None
    solution: Optional[str] = None
    parts_used: Optional[str] = None
    total_cost: Optional[float] = None
    service_location: Optional[ServiceLocation] = None
    end_date: Optional[date] = None
    status: Optional[EquipmentStatus] = None


class RepairResponse(RepairBase):
    id: int
    technician_id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: datetime
    equipment: Optional[EquipmentResponse] = None
    technician: Optional[UserResponse] = None
    images: List[RepairImageResponse] = []

    class Config:
        from_attributes = True


class WarrantyBase(BaseModel):
    equipment_id: int
    repair_id: Optional[int] = None
    maintenance_id: Optional[int] = None
    warranty_type: WarrantyType
    start_date: date = None
    end_date: date = None
    notes: Optional[str] = None


class WarrantyCreate(WarrantyBase):
    pass


class WarrantyUpdate(BaseModel):
    warranty_type: Optional[WarrantyType] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class WarrantyResponse(WarrantyBase):
    id: int
    status: str
    company_id: Optional[int] = None
    created_at: datetime
    equipment: Optional[EquipmentResponse] = None
    repair: Optional[RepairResponse] = None
    maintenance: Optional[MaintenanceResponse] = None

    class Config:
        from_attributes = True


class ArrivalStatusBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


class ArrivalStatusCreate(ArrivalStatusBase):
    pass


class ArrivalStatusUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ArrivalStatusResponse(ArrivalStatusBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_clients: int
    total_equipment: int
    total_products: int
    low_stock_products: int
    total_sales: float
    sales_this_month: float
    total_maintenance_cost: float
    total_repair_cost: float
    maintenance_cost_this_month: float
    repair_cost_this_month: float
    total_combined_this_month: float
    pending_maintenance: int
    pending_repairs: int
    active_warranties: int
    inactive_clients_6_months: int


class ReportFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    client_id: Optional[int] = None
    technician_id: Optional[int] = None
    status: Optional[str] = None


class ImageUploadResponse(BaseModel):
    url: str
    public_id: str
