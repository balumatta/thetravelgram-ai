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

# Import your view classes
from apps.your_domain.views.your_management_view import YourManagementView
from apps.your_domain.views.another_view import AnotherView

# Create API router
api_router = APIRouter()

# Initialize view classes
your_management_view = YourManagementView()
another_view = AnotherView()

# Register routes using add_api_route
api_router.add_api_route(
    path="/api/your-domain/", 
    endpoint=your_management_view.list_items, 
    methods=["GET"]
)

api_router.add_api_route(
    path="/api/your-domain/{item_id}/", 
    endpoint=your_management_view.get_item_info, 
    methods=["GET"]
)

api_router.add_api_route(
    path="/api/your-domain/", 
    endpoint=your_management_view.create_item, 
    methods=["POST"]
)

api_router.add_api_route(
    path="/api/your-domain/{item_id}/", 
    endpoint=your_management_view.update_item, 
    methods=["PUT"]
)

api_router.add_api_route(
    path="/api/your-domain/{item_id}/", 
    endpoint=your_management_view.delete_item, 
    methods=["DELETE"]
)
```

### 3.2 View Implementation (`apps/your_domain/views/your_management_view.py`)

```python
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import Depends, Request
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from apps.your_domain.controllers import YourManagementController
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
            params = dict(request.query_params)
            items = db.query(YourModel)

            # Get user from request state (set by middleware)
            user = getattr(request, "user", None)
            if user:
                items = items.filter(YourModel.user_id == user.id)
            else:
                items = items.filter(YourModel.id == None)  # Return no results for security

            # Apply filters based on query params
            if params.get("status"):
                items = items.filter(YourModel.status == params["status"])

            # Pagination
            page = int(params.get("page", 1))
            limit = int(params.get("limit", 10))
            offset = (page - 1) * limit

            total_count = items.count()
            items_list = items.offset(offset).limit(limit).all()

            result = []
            for item in items_list:
                item_dict = YourOutputSerializer.from_model(item).model_dump()
                result.append(item_dict)

            response = YourStatusCodes.ITEMS_OBTAINED
            response.update({
                "data": result,
                "pagination": {
                    "current_page": page,
                    "total_pages": (total_count + limit - 1) // limit,
                    "total_count": total_count,
                    "per_page": limit,
                    "has_next": page * limit < total_count,
                    "has_prev": page > 1,
                },
            })

            return JSONResponse(content=response, status_code=200)

        except Exception as e:
            logger.error(f"Error fetching items: {str(e)}")
            return JSONResponse(content={"error": f"Error fetching items: {str(e)}"}, status_code=500)

    @log_method_calls
    async def get_item_info(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            user = getattr(request, "user", None)

            if user:
                item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first()
            else:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            response = YourStatusCodes.ITEM_OBTAINED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=200)

        except Exception as e:
            logger.error(f"Error fetching item info: {str(e)}")
            return JSONResponse(content={"error": f"Error fetching item info: {str(e)}"}, status_code=500)

    @log_method_calls
    async def create_item(self, request: Request, db=Depends(khaitan_db_connection.get_conn)):
        try:
            request_data = await request.json()
            user = getattr(request, "user", None)
            user_id = user.id if user else None

            # Validate input using serializer
            serializer = YourInputSerializer(**request_data)

            # Create new item
            item = YourModel(
                name=serializer.name,
                description=serializer.description,
                user_id=user_id,
                status="active",
                created_at=datetime.now(),
            )
            db.add(item)
            db.commit()
            db.refresh(item)

            response = YourStatusCodes.ITEM_CREATED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=201)

        except Exception as e:
            logger.error(f"Error creating item: {str(e)}")
            db.rollback()
            return JSONResponse(content={"error": f"Error creating item: {str(e)}"}, status_code=500)

    @log_method_calls
    async def update_item(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            request_data = await request.json()
            user = getattr(request, "user", None)

            if user:
                item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first()
            else:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            # Update fields
            for field, value in request_data.items():
                if hasattr(item, field):
                    setattr(item, field, value)

            db.commit()
            db.refresh(item)

            response = YourStatusCodes.ITEM_UPDATED
            response["data"] = YourOutputSerializer.from_model(item).model_dump()
            return JSONResponse(content=response, status_code=200)

        except Exception as e:
            logger.error(f"Error updating item: {str(e)}")
            db.rollback()
            return JSONResponse(content={"error": f"Error updating item: {str(e)}"}, status_code=500)

    @log_method_calls
    async def delete_item(self, request: Request, item_id: str, db=Depends(khaitan_db_connection.get_conn)):
        try:
            user = getattr(request, "user", None)

            if user:
                item = db.query(YourModel).filter(YourModel.id == item_id, YourModel.user_id == user.id).first()
            else:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            if not item:
                return JSONResponse(content=YourStatusCodes.ITEM_NOT_FOUND, status_code=404)

            db.delete(item)
            db.commit()

            response = YourStatusCodes.ITEM_DELETED
            return JSONResponse(content=response, status_code=200)

        except Exception as e:
            logger.error(f"Error deleting item: {str(e)}")
            db.rollback()
            return JSONResponse(content={"error": f"Error deleting item: {str(e)}"}, status_code=500)
```

---

## 📋 Section 4: Apps Folder - Serializers (Pydantic Schemas)

### 4.1 Serializer Implementation (`apps/your_domain/serializer.py`)

```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator
from pydantic.v1 import root_validator

class YourInputSerializer(BaseModel):
    """Input validation for creating/updating items"""
    name: str = Field(..., min_length=1, max_length=128, description="Item name")
    description: Optional[str] = Field(None, max_length=500, description="Item description")
    category: str = Field(..., description="Item category")
    is_active: bool = Field(True, description="Whether item is active")
    
    # Custom validation
    @model_validator(mode='after')
    def validate_fields(cls, values):
        # Add custom validation logic
        if values.name and values.name.strip() == "":
            raise ValueError("Name cannot be empty")
        return values

class YourOutputSerializer(BaseModel):
    """Output serializer for API responses"""
    id: str = Field(..., description="Item ID")
    name: str = Field(..., description="Item name")
    description: Optional[str] = Field(None, description="Item description")
    category: str = Field(..., description="Item category")
    is_active: bool = Field(..., description="Whether item is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    user_id: Optional[str] = Field(None, description="Owner user ID")

    @classmethod
    def from_model(cls, model_instance, include_relations: bool = False):
        """Convert SQLAlchemy model to serializer"""
        data = {
            "id": str(model_instance.id),
            "name": model_instance.name,
            "description": model_instance.description,
            "category": model_instance.category,
            "is_active": model_instance.is_active,
            "created_at": model_instance.created_at,
            "updated_at": getattr(model_instance, "updated_at", None),
            "user_id": str(model_instance.user_id) if model_instance.user_id else None,
        }
        
        if include_relations:
            # Add related data if needed
            data["related_items"] = [
                {"id": str(item.id), "name": item.name} 
                for item in getattr(model_instance, "related_items", [])
            ]
        
        return cls(**data)

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# Specialized serializers for different use cases
class YourListSerializer(BaseModel):
    """Serializer for list endpoints with pagination"""
    items: List[YourOutputSerializer]
    pagination: dict = Field(..., description="Pagination info")

class YourDetailSerializer(YourOutputSerializer):
    """Extended serializer with more details"""
    metadata: Optional[dict] = Field(None, description="Additional metadata")
    stats: Optional[dict] = Field(None, description="Item statistics")
    
    @classmethod
    def from_model(cls, model_instance):
        """Convert model with additional details"""
        base_data = super().from_model(model_instance, include_relations=True)
        
        # Add additional fields for detail view
        extra_data = {
            "metadata": getattr(model_instance, "metadata", {}),
            "stats": {
                "total_usage": getattr(model_instance, "usage_count", 0),
                "last_accessed": getattr(model_instance, "last_accessed", None),
            }
        }
        
        return cls(**{**base_data.model_dump(), **extra_data})

# Complex validation example
class YourComplexInputSerializer(BaseModel):
    """Input with complex validation rules"""
    name: str = Field(..., description="Item name")
    settings: dict = Field(..., description="Configuration settings")
    percentages: dict = Field(..., description="Percentage breakdown")
    
    @root_validator
    def validate_percentages(cls, values):
        """Ensure percentages sum to 100"""
        percentages = values.get("percentages", {})
        if percentages:
            total = sum(percentages.values())
            if total != 100:
                raise ValueError(f"Percentages must sum to 100%. Current total: {total}%")
        return values
    
    @root_validator
    def validate_settings(cls, values):
        """Validate settings structure"""
        settings = values.get("settings", {})
        required_keys = ["mode", "threshold"]
        for key in required_keys:
            if key not in settings:
                raise ValueError(f"Settings must include '{key}' field")
        return values
```

---

## 📊 Section 5: Apps Folder - Status Codes

### 5.1 Status Codes (`apps/your_domain/status_codes.py`)

```python
class YourDomainStatusCodes:
    # Success responses
    ITEM_OBTAINED = {"code": 200, "reason": "Item(s) retrieved successfully."}
    ITEMS_OBTAINED = {"code": 200, "reason": "Items retrieved successfully."}
    ITEM_CREATED = {"code": 201, "reason": "Item created successfully."}
    ITEM_UPDATED = {"code": 200, "reason": "Item updated successfully."}
    ITEM_DELETED = {"code": 200, "reason": "Item deleted successfully."}
    
    # Error responses
    ITEM_NOT_FOUND = {"code": 1001, "reason": "Invalid or missing item."}
    INVALID_CATEGORY = {"code": 1002, "reason": "Invalid or missing category."}
    DUPLICATE_ITEM_NAME = {"code": 1003, "reason": "Item with this name already exists."}
    ITEM_IN_USE = {"code": 1004, "reason": "Item cannot be deleted as it is currently in use."}
    VALIDATION_ERROR = {"code": 1005, "reason": "Input validation failed."}
    PERMISSION_DENIED = {"code": 1006, "reason": "You don't have permission to access this item."}
    
    # Business logic specific
    MAX_ITEMS_LIMIT_REACHED = {"code": 1007, "reason": "You have reached the maximum limit of items."}
    INVALID_OPERATION = {"code": 1008, "reason": "This operation is not allowed for the current item state."}
    REQUIRED_DEPENDENCY = {"code": 1009, "reason": "Required dependency is missing for this operation."}
    
    # Complex workflow states
    PROCESSING_STARTED = {"code": 202, "reason": "Item processing started successfully."}
    PROCESSING_COMPLETED = {"code": 200, "reason": "Item processing completed successfully."}
    PROCESSING_FAILED = {"code": 500, "reason": "Item processing failed. Please try again."}
    PROCESSING_CANCELLED = {"code": 200, "reason": "Item processing cancelled successfully."}
```

---

## 🏗️ Section 6: Apps Folder - Models & Database

### 6.1 Model Implementation (`apps/your_domain/models.py`)

```python
from datetime import datetime
from uuid import uuid4
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from apps.commons.base_models import PaperbeeBase  # Your base model class

class YourDomainModel(PaperbeeBase):
    """Main model for your domain"""
    __tablename__ = "your_domain_items"
    __table_args__ = {'schema': 'your_schema'}  # Optional: use schema

    # Primary fields
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4, unique=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Core data fields
    name = Column(String(128), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # JSON fields for flexible data
    metadata = Column(JSON, nullable=True, default={})
    settings = Column(JSON, nullable=True, default={})
    
    # Computed fields
    usage_count = Column(Integer, default=0, nullable=False)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    # related_items = relationship("RelatedModel", back_populates="main_item")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_domain_user_status', 'user_id', 'status'),
        Index('idx_domain_category_active', 'category', 'is_active'),
        Index('idx_domain_created_at', 'created_at'),
        {'schema': 'your_schema'}  # Optional: use schema
    )
    
    def __repr__(self):
        return f"<YourDomainModel(id={self.id}, name='{self.name}')>"

class RelatedModel(PaperbeeBase):
    """Related model example"""
    __tablename__ = "your_domain_related"
    __table_args__ = {'schema': 'your_schema'}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    main_item_id = Column(UUID(as_uuid=True), ForeignKey("your_schema.your_domain_items.id"), nullable=False)
    name = Column(String(100), nullable=False)
    value = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship back to main model
    # main_item = relationship("YourDomainModel", back_populates="related_items")

# Constants for your domain
class YourDomainStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class YourDomainCategory:
    TYPE_A = "type_a"
    TYPE_B = "type_b"
    TYPE_C = "type_c"
```

---

## 🔧 Section 7: Apps Folder - Controllers (Business Logic)

### 7.1 Controller Implementation (`apps/your_domain/controllers.py`)

```python
import logging
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from apps.your_domain.models import YourDomainModel, YourDomainStatus
from helpers.aws import AWSS3  # If you need AWS services
from helpers.utils import generate_unique_filename

logger = logging.getLogger(__name__)

class YourDomainController:
    """Business logic controller for your domain"""
    
    def __init__(self):
        self.s3_client = AWSS3()  # If using AWS
    
    def process_item_creation(self, item_data: Dict, user_id: str, db: Session) -> Dict:
        """Complex business logic for item creation"""
        try:
            # Pre-processing validation
            self._validate_creation_rules(item_data, user_id, db)
            
            # Create the main item
            item = YourDomainModel(
                name=item_data['name'],
                description=item_data.get('description'),
                category=item_data['category'],
                user_id=user_id,
                metadata=item_data.get('metadata', {}),
                settings=item_data.get('settings', {})
            )
            
            db.add(item)
            db.flush()  # Get the ID without committing
            
            # Post-processing steps
            self._setup_default_configurations(item, db)
            self._create_related_resources(item, item_data, db)
            
            db.commit()
            db.refresh(item)
            
            # Async operations (if needed)
            self._trigger_background_processing(item.id)
            
            return {
                "item_id": str(item.id),
                "status": "created",
                "next_steps": self._get_next_steps(item)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating item: {str(e)}")
            raise
    
    def _validate_creation_rules(self, item_data: Dict, user_id: str, db: Session) -> None:
        """Validate business rules for item creation"""
        # Check user limits
        user_item_count = db.query(YourDomainModel).filter(
            YourDomainModel.user_id == user_id,
            YourDomainModel.is_active == True
        ).count()
        
        if user_item_count >= 100:  # Example limit
            raise ValueError("Maximum item limit reached for user")
        
        # Check for duplicates
        existing_item = db.query(YourDomainModel).filter(
            YourDomainModel.name == item_data['name'],
            YourDomainModel.user_id == user_id,
            YourDomainModel.is_active == True
        ).first()
        
        if existing_item:
            raise ValueError(f"Item with name '{item_data['name']}' already exists")
        
        # Validate business-specific rules
        if item_data.get('settings', {}).get('auto_process') and not item_data.get('category'):
            raise ValueError("Category is required for auto-processing")
    
    def _setup_default_configurations(self, item: YourDomainModel, db: Session) -> None:
        """Setup default configurations for new item"""
        default_settings = {
            "auto_backup": True,
            "notification_enabled": True,
            "retention_days": 30
        }
        
        # Merge with existing settings
        item.settings = {**default_settings, **(item.settings or {})}
        
        # Set initial metadata
        if not item.metadata:
            item.metadata = {}
        
        item.metadata.update({
            "created_by": "system",
            "version": "1.0.0",
            "initialized_at": datetime.now().isoformat()
        })
    
    def _create_related_resources(self, item: YourDomainModel, item_data: Dict, db: Session) -> None:
        """Create related resources for the item"""
        # Example: Create default related items
        if item_data.get('create_defaults'):
            default_items = [
                {"name": "Default Config", "value": "{}"},
                {"name": "Default Template", "value": "template_v1"}
            ]
            
            for default_item in default_items:
                # Create related items (uncomment if you have the model)
                # related = RelatedModel(
                #     main_item_id=item.id,
                #     name=default_item['name'],
                #     value=default_item['value']
                # )
                # db.add(related)
                pass
    
    def _trigger_background_processing(self, item_id: str) -> None:
        """Trigger background processing tasks"""
        # Example: Trigger Celery tasks
        try:
            # from apps.your_domain.tasks import process_item_async
            # process_item_async.delay(str(item_id))
            logger.info(f"Triggered background processing for item {item_id}")
        except Exception as e:
            logger.error(f"Failed to trigger background processing: {str(e)}")
    
    def _get_next_steps(self, item: YourDomainModel) -> List[Dict]:
        """Get next steps for the user"""
        steps = []
        
        if item.category == "type_a":
            steps.append({
                "action": "configure_settings",
                "description": "Configure advanced settings for your item",
                "url": f"/api/your-domain/{item.id}/settings/"
            })
        
        if item.settings.get('auto_process'):
            steps.append({
                "action": "monitor_progress",
                "description": "Monitor the automatic processing progress",
                "url": f"/api/your-domain/{item.id}/progress/"
            })
        
        return steps
    
    def process_item_update(self, item: YourDomainModel, update_data: Dict, db: Session) -> Dict:
        """Handle complex item updates"""
        try:
            # Pre-update validation
            self._validate_update_rules(item, update_data, db)
            
            # Track changes
            changes = self._track_changes(item, update_data)
            
            # Apply updates
            for field, value in update_data.items():
                if hasattr(item, field) and field not in ['id', 'created_at', 'user_id']:
                    setattr(item, field, value)
            
            # Update metadata
            if not item.metadata:
                item.metadata = {}
            
            item.metadata.update({
                "last_modified": datetime.now().isoformat(),
                "change_count": item.metadata.get("change_count", 0) + 1,
                "last_changes": changes
            })
            
            db.commit()
            db.refresh(item)
            
            return {
                "item_id": str(item.id),
                "status": "updated",
                "changes": changes
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating item {item.id}: {str(e)}")
            raise
    
    def _validate_update_rules(self, item: YourDomainModel, update_data: Dict, db: Session) -> None:
        """Validate business rules for updates"""
        # Check if item can be updated
        if item.status == YourDomainStatus.PROCESSING:
            raise ValueError("Cannot update item while processing")
        
        # Validate specific field updates
        if 'name' in update_data and update_data['name'] != item.name:
            # Check for name conflicts
            existing = db.query(YourDomainModel).filter(
                YourDomainModel.name == update_data['name'],
                YourDomainModel.user_id == item.user_id,
                YourDomainModel.id != item.id,
                YourDomainModel.is_active == True
            ).first()
            
            if existing:
                raise ValueError(f"Item with name '{update_data['name']}' already exists")
    
    def _track_changes(self, item: YourDomainModel, update_data: Dict) -> List[Dict]:
        """Track what changes are being made"""
        changes = []
        
        for field, new_value in update_data.items():
            if hasattr(item, field):
                old_value = getattr(item, field)
                if old_value != new_value:
                    changes.append({
                        "field": field,
                        "old_value": str(old_value) if old_value is not None else None,
                        "new_value": str(new_value) if new_value is not None else None,
                        "timestamp": datetime.now().isoformat()
                    })
        
        return changes

    def archive_item(self, item: YourDomainModel, db: Session) -> Dict:
        """Archive an item with business logic"""
        try:
            # Validate archiving rules
            if item.status == YourDomainStatus.PROCESSING:
                raise ValueError("Cannot archive item while processing")
            
            # Archive related resources
            self._archive_related_resources(item, db)
            
            # Update item status
            item.is_active = False
            item.status = "archived"
            
            if not item.metadata:
                item.metadata = {}
            
            item.metadata.update({
                "archived_at": datetime.now().isoformat(),
                "archived_by": "user"
            })
            
            db.commit()
            
            return {
                "item_id": str(item.id),
                "status": "archived",
                "archived_at": item.metadata.get("archived_at")
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error archiving item {item.id}: {str(e)}")
            raise
    
    def _archive_related_resources(self, item: YourDomainModel, db: Session) -> None:
        """Archive or cleanup related resources"""
        # Example: Archive files to cold storage, cleanup caches, etc.
        logger.info(f"Archiving related resources for item {item.id}")
        
        # Cleanup temporary files
        # Move files to archive storage
        # Cancel any pending background tasks
        pass
```

---

## 🚫 Section 8: Apps Folder - Exceptions

### 8.1 Custom Exceptions (`apps/your_domain/exceptions.py`)

```python
class YourDomainException(Exception):
    """Base exception for your domain"""
    pass

class ItemNotFoundException(YourDomainException):
    """Item not found exception"""
    pass

class ItemValidationException(YourDomainException):
    """Item validation failed exception"""
    pass

class DuplicateItemException(YourDomainException):
    """Duplicate item exception"""
    pass

class ItemPermissionException(YourDomainException):
    """Item permission denied exception"""
    pass

class ItemProcessingException(YourDomainException):
    """Item processing error exception"""
    pass

class ItemLimitException(YourDomainException):
    """Item limit reached exception"""
    pass

class ItemStateException(YourDomainException):
    """Invalid item state for operation exception"""
    pass
```

---

## 📋 Section 9: Apps Folder Structure Summary

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

#### ✅ **Step 7: Add Exceptions (`exceptions.py`)**
- [ ] Create domain-specific exception hierarchy
- [ ] Extend base domain exception class
- [ ] Handle in views and controllers appropriately

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