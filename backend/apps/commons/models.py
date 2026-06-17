# Import all models to ensure they are registered with SQLAlchemy
# Export Base for convenience
from apps.commons.base_models import Base

# isort: off
from apps.user.models import *

# isort: on

__all__ = ["Base"]
