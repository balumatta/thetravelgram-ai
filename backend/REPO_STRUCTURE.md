# FastAPI Project Boilerplate - Implementation Guide

## Overview
This document serves as a comprehensive boilerplate template for setting up FastAPI projects with modern Python development practices. Use this guide to implement features section by section in any new project.

---

## 🚀 Quick Setup Checklist

### Initial Project Setup
- [ ] Create project directory structure
- [ ] Setup virtual environment
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Setup database connections
- [ ] Configure Alembic migrations
- [ ] Setup middleware
- [ ] Create basic app structure
- [ ] Setup Celery (if needed)
- [ ] Configure logging

---

## 📁 Project Structure Template

```
your-project/
├── .env                        # Environment variables
├── .env.example               # Environment template
├── requirements.txt           # Core dependencies
├── requirements-dev.txt       # Development dependencies
├── run_fastapi.py            # Application entry point
├── alembic.ini               # Alembic configuration
├── docker-compose.yml        # Docker setup
├── .pre-commit-config.yaml   # Code quality hooks
├── .pylintrc                 # Linting configuration
├── .gitignore               # Git ignore rules
│
├── main/                     # Core application config
│   ├── __init__.py
│   ├── config.py            # Application configuration
│   ├── settings.py          # Environment settings
│   └── urls.py              # Main URL routing
│
├── apps/                     # Business logic modules
│   ├── __init__.py
│   ├── database/            # Database configuration
│   │   ├── __init__.py
│   │   ├── base.py         # Base model & database setup
│   │   └── connection.py   # Database connections
│   │
│   ├── user/               # User management
│   │   ├── __init__.py
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── urls.py         # FastAPI routes
│   │   ├── services.py     # Business logic
│   │   ├── status_codes.py # HTTP status codes
│   │   ├── tasks.py        # Celery tasks (if needed)
│   │   └── exceptions.py   # Custom exceptions
│   │
│   └── [other_domains]/    # Additional business domains
│
├── helpers/                 # Shared utilities
│   ├── __init__.py
│   ├── logger.py           # Logging configuration
│   ├── utils.py            # General utilities
│   ├── celery.py           # Celery configuration
│   └── response.py         # Response utilities
│
├── middlewares/            # FastAPI middleware
│   ├── __init__.py
│   ├── cors.py            # CORS middleware
│   ├── auth.py            # Authentication middleware
│   └── logging.py         # Request logging middleware
│
├── alembic/               # Database migrations
│   ├── versions/          # Migration files
│   └── env.py            # Alembic environment
│
└── tests/                 # Test files
    ├── __init__.py
    ├── conftest.py       # Test configuration
    └── test_*.py         # Test modules
```

---

## 🛠 Section 1: Core Configuration Setup

The core configuration files (`main/settings.py`, `main/config.py`, `run_fastapi.py`) will be standard boilerplate that you'll have in every project. This guide focuses on the `apps/` folder structure and implementation patterns.

---

## 🗄️ Section 2: Database Setup

Database connections, base models, and Alembic configuration will be part of your standard boilerplate. The key thing to know is you'll use `Depends(khaitan_db_connection.get_conn)` for dependency injection in your views.

---

## 🔄 Section 3: Apps Folder - URL Routing

### 3.1 URL Configuration (`apps/your_domain/urls.py`)

```python
from fastapi import APIRouter
from apps.your_domain.views.your_management_view import YourManagementView

api_router = APIRouter()
view = YourManagementView()

api_router.add_api_route("/api/your-domain/", view.list_items, methods=["GET"])
api_router.add_api_route("/api/your-domain/{item_id}/", view.get_item_info, methods=["GET"])
api_router.add_api_route("/api/your-domain/", view.create_item, methods=["POST"])
api_router.add_api_route("/api/your-domain/{item_id}/", view.update_item, methods=["PUT"])
api_router.add_api_route("/api/your-domain/{item_id}/", view.delete_item, methods=["DELETE"])
```

### 3.2 View Implementation (`apps/your_domain/views/your_management_view.py`)

```python
import logging
from fastapi import Depends, Request
from starlette.responses import JSONResponse
from apps.your_domain.models import YourModel
from apps.your_domain.serializer import YourOutputSerializer, YourInputSerializer
from apps.your_domain.status_codes import YourStatusCodes
from helpers.utils import log_method_calls
from main.settings import khaitan_db_connection

logger = logging.getLogger(__name__)

class YourManagementView:
    def __init__(self):
        pass

    @log_method_calls
    async def list_items(self, request: Request, db=Depends(khaitan_db_connection.get_conn)):
        try:
            user = getattr(request, "user", None)
            params = dict(request.query_params)
            page, limit = int(params.get("page", 1)), int(params.get("limit", 10))
            items = db.query(YourModel).filter(YourModel.user_id == user.id if user else YourModel.id == None)
            total = items.count()
            result = [YourOutputSerializer.from_model(i).model_dump() for i in items.offset((page-1)*limit).limit(limit).all()]
            response = YourStatusCodes.ITEMS_OBTAINED
            response.update({"data": result, "pagination": {"current_page": page, "total_pages": (total+limit-1)//limit, "total_count": total}})
            return JSONResponse(content=response, status_code=200)
        except Exception as e:
            return JSONResponse(content={"error": str(e)}, status_code=500)

    @log_method_calls
    async def get_item_info(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            user = getattr(request, "user", None)
            item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first() if user else None
            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)
            response = YourStatusCodes.ITEM_OBTAINED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=200)
        except Exception as e:
            return JSONResponse(content={"error": str(e)}, status_code=500)

    @log_method_calls
    async def create_item(self, request: Request, db=Depends(khaitan_db_connection.get_conn)):
        try:
            data = await request.json()
            user = getattr(request, "user", None)
            serializer = YourInputSerializer(**data)
            item = YourModel(**serializer.model_dump(), user_id=user.id if user else None)
            db.add(item); db.commit(); db.refresh(item)
            response = YourStatusCodes.ITEM_CREATED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=201)
        except Exception as e:
            db.rollback()
            return JSONResponse(content={"error": str(e)}, status_code=500)

    @log_method_calls
    async def update_item(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            data = await request.json()
            user = getattr(request, "user", None)
            item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first() if user else None
            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)
            for k, v in data.items():
                if hasattr(item, k): setattr(item, k, v)
            db.commit(); db.refresh(item)
            response = YourStatusCodes.ITEM_UPDATED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=200)
        except Exception as e:
            db.rollback()
            return JSONResponse(content={"error": str(e)}, status_code=500)

    @log_method_calls
    async def delete_item(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            user = getattr(request, "user", None)
            item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first() if user else None
            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)
            db.delete(item); db.commit()
            return JSONResponse(content=YourStatusCodes.ITEM_DELETED, status_code=200)
        except Exception as e:
            db.rollback()
            return JSONResponse(content={"error": str(e)}, status_code=500)
```

---

## 📋 Section 4: Apps Folder - Serializers (Pydantic Schemas)

### 4.1 Serializer Implementation (`apps/your_domain/serializer.py`)

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator

class YourInputSerializer(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = None
    category: str
    is_active: bool = True

    @model_validator(mode='after')
    def validate_fields(cls, values):
        if values.name and values.name.strip() == "":
            raise ValueError("Name cannot be empty")
        return values

class YourOutputSerializer(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_id: Optional[str] = None

    @classmethod
    def from_model(cls, m):
        return cls(
            id=str(m.id), name=m.name, description=m.description,
            category=m.category, is_active=m.is_active, created_at=m.created_at,
            updated_at=getattr(m, "updated_at", None),
            user_id=str(m.user_id) if m.user_id else None,
        )

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}
```

---

## 📊 Section 5: Apps Folder - Status Codes

### 5.1 Status Codes (`apps/your_domain/status_codes.py`)

```python
class YourDomainStatusCodes:
    ITEM_OBTAINED = {"code": 200, "reason": "Item(s) retrieved successfully."}
    ITEMS_OBTAINED = {"code": 200, "reason": "Items retrieved successfully."}
    ITEM_CREATED = {"code": 201, "reason": "Item created successfully."}
    ITEM_UPDATED = {"code": 200, "reason": "Item updated successfully."}
    ITEM_DELETED = {"code": 200, "reason": "Item deleted successfully."}
    ITEM_NOT_FOUND = {"code": 1001, "reason": "Invalid or missing item."}
    DUPLICATE_ITEM_NAME = {"code": 1003, "reason": "Item with this name already exists."}
    VALIDATION_ERROR = {"code": 1005, "reason": "Input validation failed."}
    PERMISSION_DENIED = {"code": 1006, "reason": "You don't have permission to access this item."}
    MAX_ITEMS_LIMIT_REACHED = {"code": 1007, "reason": "You have reached the maximum limit of items."}
    PROCESSING_STARTED = {"code": 202, "reason": "Item processing started successfully."}
    PROCESSING_FAILED = {"code": 500, "reason": "Item processing failed. Please try again."}
```

---

## 🏗️ Section 6: Apps Folder - Models & Database

### 6.1 Model Implementation (`apps/your_domain/models.py`)

```python
from uuid import uuid4
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from apps.database.base import YourBase

class YourDomainModel(YourBase):
    __tablename__ = "your_domain_items"
    __table_args__ = (
        Index('idx_domain_user_status', 'user_id', 'status'),
        {'schema': 'your_schema'},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    name = Column(String(128), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    metadata = Column(JSON, nullable=True, default={})
    settings = Column(JSON, nullable=True, default={})

class YourDomainStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
```

---

## 🔧 Section 7: Apps Folder - Controllers (Business Logic)

### 7.1 Controller Implementation (`apps/your_domain/controllers.py`)

```python
import logging
from datetime import datetime
from typing import Dict
from sqlalchemy.orm import Session
from apps.your_domain.models import YourDomainModel, YourDomainStatus

logger = logging.getLogger(__name__)

class YourDomainController:
    def create_item(self, item_data: Dict, user_id: str, db: Session) -> YourDomainModel:
        self._validate_no_duplicate(item_data['name'], user_id, db)
        item = YourDomainModel(**item_data, user_id=user_id)
        db.add(item); db.flush()
        db.commit(); db.refresh(item)
        return item

    def update_item(self, item: YourDomainModel, update_data: Dict, db: Session) -> YourDomainModel:
        if item.status == YourDomainStatus.PROCESSING:
            raise ValueError("Cannot update item while processing")
        for k, v in update_data.items():
            if hasattr(item, k) and k not in ['id', 'created_at', 'user_id']:
                setattr(item, k, v)
        db.commit(); db.refresh(item)
        return item

    def archive_item(self, item: YourDomainModel, db: Session) -> YourDomainModel:
        if item.status == YourDomainStatus.PROCESSING:
            raise ValueError("Cannot archive item while processing")
        item.is_active = False
        item.status = "archived"
        db.commit()
        return item

    def _validate_no_duplicate(self, name: str, user_id: str, db: Session) -> None:
        exists = db.query(YourDomainModel).filter(
            YourDomainModel.name == name,
            YourDomainModel.user_id == user_id,
            YourDomainModel.is_active == True
        ).first()
        if exists:
            raise ValueError(f"Item '{name}' already exists")
```

---

## 📋 Section 8: Apps Folder Structure Summary

### Complete Apps Folder Structure
```
apps/your_domain/
├── __init__.py
├── models.py           # SQLAlchemy models
├── serializer.py       # Pydantic schemas for validation
├── status_codes.py     # Domain-specific status codes
├── urls.py            # URL routing configuration
├── controllers.py     # Business logic
├── exceptions.py      # Custom exceptions
├── constants.py       # Domain constants
├── tasks.py           # Celery tasks (if needed)
└── views/             # View classes
    ├── __init__.py
    ├── your_management_view.py
    └── other_view.py
```

### Implementation Checklist

When implementing a new domain in the apps folder:

#### ✅ **Step 1: Create Models (`models.py`)**
- [ ] Define SQLAlchemy models with proper relationships
- [ ] Add appropriate indexes for performance
- [ ] Use UUID primary keys and proper foreign keys
- [ ] Include metadata and settings JSON fields for flexibility

#### ✅ **Step 2: Create Serializers (`serializer.py`)**
- [ ] Create input serializers for validation
- [ ] Create output serializers for API responses
- [ ] Add `from_model()` class methods for conversion
- [ ] Include proper validation with Pydantic validators

#### ✅ **Step 3: Define Status Codes (`status_codes.py`)**
- [ ] Create domain-specific status codes class
- [ ] Include both success and error responses
- [ ] Use consistent code numbering within your domain

#### ✅ **Step 4: Implement Controllers (`controllers.py`)**
- [ ] Create controller classes for complex business logic
- [ ] Implement validation methods
- [ ] Add audit/tracking functionality
- [ ] Handle background task triggers

#### ✅ **Step 5: Create Views (`views/`)**
- [ ] Create view classes with `@log_method_calls` decorator
- [ ] Use `Depends(khaitan_db_connection.get_conn)` for DB injection
- [ ] Implement proper error handling with try/catch
- [ ] Return JSONResponse with status codes
- [ ] Handle user authentication with `getattr(request, "user", None)`

#### ✅ **Step 6: Setup URLs (`urls.py`)**
- [ ] Create APIRouter instance
- [ ] Instantiate view classes
- [ ] Register routes with `api_router.add_api_route()`
- [ ] Use proper HTTP methods and path parameters

### Key Patterns to Follow

1. **Database Dependency**: Always use `Depends(khaitan_db_connection.get_conn)`
2. **Authentication**: Get user with `user = getattr(request, "user", None)`
3. **Response Format**: Use JSONResponse with your status codes
4. **Error Handling**: Wrap view methods in try/catch with rollback
5. **Business Logic**: Keep complex logic in controllers, not views
6. **Validation**: Use Pydantic serializers for input validation
7. **Logging**: Use `@log_method_calls` decorator on view methods

### Integration with Main App

The main URL router will import your domain router like this:
```python
# main/urls.py
from apps.your_domain.urls import api_router as your_domain_router

router.include_router(your_domain_router)
```

---

This guide focuses specifically on what you need to implement in the `apps/` folder. All other boilerplate (main/, helpers/, middlewares/, etc.) will already be available in your project template.