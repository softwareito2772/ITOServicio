from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from .database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"


class ServiceLocation(str, enum.Enum):
    LOCAL = "local"
    SITIO = "sitio"


class EquipmentStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_PARTS = "waiting_parts"
    COMPLETED = "completed"
    DELIVERED = "delivered"


class ArrivalCondition(str, enum.Enum):
    SEVERE_DAMAGE = "Dañado severo"
    MODERATE_DAMAGE = "Dañado moderado"
    PARTIAL_WORKING = "Funcionando parcialmente"
    BROKEN_SCREEN = "Pantalla rota"
    NO_BOOT = "Sin arranque"
    OTHER = "Otros"


class WarrantyType(str, enum.Enum):
    ONE_MONTH = "1 mes"
    THREE_MONTHS = "3 meses"
    SIX_MONTHS = "6 meses"
    ONE_YEAR = "1 año"
    TWO_YEARS = "2 años"
    FIVE_YEARS = "5 años"
    SEVEN_YEARS = "7 años"
    TEN_YEARS = "10 años"


class InventoryMovementType(str, enum.Enum):
    ENTRY = "entrada"
    EXIT = "salida"


AVAILABLE_MODULES = [
    "ventas", "mantenimiento", "reparaciones", "equipos",
    "productos", "clientes", "garantias", "reportes", "inventario"
]


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    logo_url = Column(Text, nullable=True)
    email_domain = Column(String(100), nullable=True)
    primary_color = Column(String(7), default="#7C9CBF")
    secondary_color = Column(String(7), default="#B4C7E7")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company")
    modules = relationship("CompanyModule", back_populates="company", cascade="all, delete-orphan")


class CompanyModule(Base):
    __tablename__ = "company_modules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    module_name = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, default=True)

    company = relationship("Company", back_populates="modules")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(20), default="user")
    avatar = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="users")
    sales = relationship("Sale", back_populates="created_by_user")
    maintenance = relationship("Maintenance", back_populates="technician")
    repairs = relationship("Repair", back_populates="technician")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="client")
    sales = relationship("Sale", back_populates="client")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="category")
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, default=0)
    stock = Column(Integer, default=0)
    stock_min = Column(Integer, default=5)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product")
    inventory = relationship("InventoryMovement", back_populates="product")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    movement_type = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="inventory")
    user = relationship("User")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    total = Column(Float, default=0)
    status = Column(String(50), default="completed")
    sale_date = Column(Date, default=date.today)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="sales")
    created_by_user = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    type_name = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=False)
    serial_number = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    purchase_date = Column(Date, nullable=True)
    manufacturer_warranty = Column(Text, nullable=True)
    service_location = Column(String(50), default="local")
    status = Column(String(50), default="pending")
    arrival_date = Column(Date, default=date.today)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client", back_populates="equipment")
    category = relationship("Category", back_populates="equipment")
    maintenance = relationship("Maintenance", back_populates="equipment")
    repairs = relationship("Repair", back_populates="equipment")
    warranties = relationship("Warranty", back_populates="equipment")


class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=False)
    technician_notes = Column(Text, nullable=True)
    service_location = Column(String(50), default="local")
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    next_maintenance_date = Column(Date, nullable=True)
    cost = Column(Float, default=0)
    status = Column(String(50), default="pending")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="maintenance")
    technician = relationship("User", back_populates="maintenance")
    images = relationship("MaintenanceImage", back_populates="maintenance", cascade="all, delete-orphan")
    warranty = relationship("Warranty", back_populates="maintenance", uselist=False)


class MaintenanceImage(Base):
    __tablename__ = "maintenance_images"

    id = Column(Integer, primary_key=True, index=True)
    maintenance_id = Column(Integer, ForeignKey("maintenance.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    image_type = Column(String(20), default="before")
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    maintenance = relationship("Maintenance", back_populates="images")


class Repair(Base):
    __tablename__ = "repairs"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    arrival_condition = Column(String(50), nullable=False)
    arrival_condition_other = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    parts_used = Column(Text, nullable=True)
    total_cost = Column(Float, default=0)
    service_location = Column(String(50), default="local")
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    status = Column(String(50), default="pending")
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="repairs")
    technician = relationship("User", back_populates="repairs")
    images = relationship("RepairImage", back_populates="repair", cascade="all, delete-orphan")
    warranty = relationship("Warranty", back_populates="repair")


class RepairImage(Base):
    __tablename__ = "repair_images"

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(Integer, ForeignKey("repairs.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    image_type = Column(String(20), default="before")
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repair = relationship("Repair", back_populates="images")


class Warranty(Base):
    __tablename__ = "warranties"

    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    repair_id = Column(Integer, ForeignKey("repairs.id"), nullable=True)
    maintenance_id = Column(Integer, ForeignKey("maintenance.id"), nullable=True)
    warranty_type = Column(String(50), nullable=False)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default="active")
    notes = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    equipment = relationship("Equipment", back_populates="warranties")
    repair = relationship("Repair", back_populates="warranty")
    maintenance = relationship("Maintenance", back_populates="warranty")


class EquipmentArrivalStatus(Base):
    __tablename__ = "equipment_arrival_statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
