# Alembic Setup Guide

## What is Alembic?
Alembic is a database migration tool for SQLAlchemy, allowing you to manage database schema changes over time.

## Installation

```bash
pip install alembic
```

## Initial Setup

### 1. Initialize Alembic in your project
```bash
alembic init alembic
```

This creates:
- `alembic/` directory with migration files
- `alembic.ini` configuration file

### 2. Configure alembic.ini

No database URL configuration needed in `alembic.ini` if you're using dynamic configuration (as shown in step 3).

### 3. Configure env.py

Edit `alembic/env.py` to import your models and configure database connection:

```python
# alembic/env.py
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

# Add the project root directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import your models
# Import all models so they're registered with SQLAlchemy
from apps.user.models import *
from apps.papers.models import *

# This is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata from your models
target_metadata = Base.metadata

def get_database_url():
    """Get the database URL from project configuration"""
    from dotenv import load_dotenv
    from main.config import get_configurations, Environments

    # Load environment variables
    load_dotenv()
    current_env = os.getenv("ENVIRONMENT", "local").strip()

    # Get database configuration
    configurations = get_configurations(current_env)
    db_details = configurations['rds_database_details']

    # Build database URL
    db_host = db_details.get('HOST')
    db_username = db_details.get('USER')
    db_password = db_details.get('PASSWORD')
    db_name = db_details.get('NAME')

    return f"postgresql+psycopg2://{db_username}:{db_password}@{db_host}:5432/{db_name}"

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Create engine with database URL
    database_url = get_database_url()
    connectable = create_engine(database_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

## Creating Migrations

### 1. Generate migration automatically
```bash
alembic revision --autogenerate -m "Create user table"
```

### 2. Create empty migration
```bash
alembic revision -m "Add custom index"
```

### 3. Edit migration file
Migration files are created in `alembic/versions/`. Edit them as needed:

```python
# Example migration file
def upgrade():
    op.create_table('user',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('email', sa.String(120), unique=True)
    )

def downgrade():
    op.drop_table('user')
```

## Running Migrations

### Apply migrations
```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade ae1027a6acf

# Apply next migration only
alembic upgrade +1
```

### Rollback migrations
```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade ae1027a6acf

# Rollback all migrations
alembic downgrade base
```

## Common Commands

```bash
# Show current migration version
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic show

# Stamp database with specific version (without running migration)
alembic stamp head
```

## Best Practices

1. **Review auto-generated migrations** - Always check before applying
2. **Test migrations** - Run on development/staging first
3. **Backup before migrations** - Especially in production
4. **Use descriptive names** - Clear migration messages
5. **Don't edit applied migrations** - Create new ones instead

## Example Project Structure

```
your_project/
├── alembic/
│   ├── versions/
│   │   ├── 001_create_user_table.py
│   │   └── 002_add_email_index.py
│   ├── env.py
│   └── script.py.mako
├── alembic.ini
├── your_app/
│   ├── models.py
│   └── __init__.py
└── main.py
```

## Troubleshooting

### Common Issues

1. **Import errors in env.py**
   - Check Python path configuration
   - Ensure all dependencies are installed

2. **Database connection issues**
   - Verify database URL in alembic.ini
   - Check database credentials and accessibility

3. **Target metadata not found**
   - Ensure models are properly imported in env.py
   - Check that Base.metadata is correctly set

### Environment Variables

For dynamic database URLs:

```python
# In env.py
import os
from sqlalchemy import create_engine

# Use environment variable if available
database_url = os.getenv('DATABASE_URL') or config.get_main_option("sqlalchemy.url")
```

This guide should get you started with Alembic in any new project!