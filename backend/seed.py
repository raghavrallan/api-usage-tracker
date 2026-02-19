"""
Seed script: Creates a default tenant, admin user, sample departments, projects,
and demo usage data so the dashboard is populated for testing.

Usage:
  cd backend
  python seed.py
"""
import asyncio
import uuid
import random
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.database import engine, async_session, Base
from app.models import *  # noqa
from app.services.auth_service import hash_password
from app.services.encryption_service import encrypt_api_key

MODELS_BY_PLATFORM = {
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "text-embedding-3-small"],
    "anthropic": ["claude-sonnet-4-20250514", "claude-3.5-haiku", "claude-3-opus"],
    "google": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
}


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if already seeded
        existing = await db.execute(select(Tenant))
        if existing.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # Tenant
        tenant = Tenant(name="Demo Organization", slug="demo-org")
        db.add(tenant)
        await db.flush()

        # Departments
        eng_dept = Department(tenant_id=tenant.id, name="Engineering", description="Software engineering team")
        ml_dept = Department(tenant_id=tenant.id, name="Machine Learning", description="ML/AI research team")
        product_dept = Department(tenant_id=tenant.id, name="Product", description="Product management")
        db.add_all([eng_dept, ml_dept, product_dept])
        await db.flush()

        # Admin user
        admin = User(
            tenant_id=tenant.id, department_id=eng_dept.id,
            email="admin@demo.com", password_hash=hash_password("admin123"),
            full_name="Admin User", role="admin",
        )
        # Regular users
        users = [
            User(tenant_id=tenant.id, department_id=eng_dept.id, email="alice@demo.com", password_hash=hash_password("user123"), full_name="Alice Engineer", role="user"),
            User(tenant_id=tenant.id, department_id=ml_dept.id, email="bob@demo.com", password_hash=hash_password("user123"), full_name="Bob Researcher", role="user"),
            User(tenant_id=tenant.id, department_id=product_dept.id, email="carol@demo.com", password_hash=hash_password("user123"), full_name="Carol PM", role="user"),
        ]
        db.add(admin)
        db.add_all(users)
        await db.flush()

        # Projects
        proj_chatbot = Project(tenant_id=tenant.id, department_id=eng_dept.id, name="Chatbot Production", description="Customer-facing chatbot")
        proj_internal = Project(tenant_id=tenant.id, department_id=eng_dept.id, name="Internal Tools", description="Internal dev tools using AI")
        proj_research = Project(tenant_id=tenant.id, department_id=ml_dept.id, name="ML Research", description="ML experimentation")
        proj_content = Project(tenant_id=tenant.id, department_id=product_dept.id, name="Content Generation", description="Marketing content generation")
        db.add_all([proj_chatbot, proj_internal, proj_research, proj_content])
        await db.flush()

        # User-project access
        for u in users:
            db.add(UserProjectAccess(user_id=u.id, project_id=proj_chatbot.id, permission_level="view"))

        db.add(UserProjectAccess(user_id=users[0].id, project_id=proj_internal.id, permission_level="manage"))
        db.add(UserProjectAccess(user_id=users[1].id, project_id=proj_research.id, permission_level="manage"))
        db.add(UserProjectAccess(user_id=users[2].id, project_id=proj_content.id, permission_level="manage"))
        await db.flush()

        # Platform keys (fake encrypted keys for demo)
        keys_data = [
            (proj_chatbot.id, "openai", "OpenAI Chatbot Key"),
            (proj_chatbot.id, "anthropic", "Anthropic Chatbot Key"),
            (proj_internal.id, "openai", "OpenAI Internal Key"),
            (proj_research.id, "anthropic", "Anthropic Research Key"),
            (proj_research.id, "google", "Gemini Research Key"),
            (proj_content.id, "openai", "OpenAI Content Key"),
            (proj_content.id, "google", "Gemini Content Key"),
        ]
        platform_keys = []
        for project_id, platform, label in keys_data:
            pk = PlatformKey(
                project_id=project_id,
                platform=platform,
                api_key_encrypted=encrypt_api_key(f"demo-{platform}-key-{uuid.uuid4().hex[:8]}"),
                key_label=label,
                last_synced_at=datetime.now(timezone.utc),
            )
            db.add(pk)
            platform_keys.append(pk)
        await db.flush()

        # Generate usage records for the last 60 days
        today = date.today()
        for pk in platform_keys:
            models = MODELS_BY_PLATFORM.get(pk.platform, ["unknown"])
            for day_offset in range(60):
                d = today - timedelta(days=day_offset)
                for model in random.sample(models, min(len(models), random.randint(1, 3))):
                    input_tok = random.randint(500, 50000)
                    output_tok = random.randint(200, 20000)
                    total_tok = input_tok + output_tok

                    cost_per_1k = {"gpt-4o": 0.005, "gpt-4o-mini": 0.0003, "gpt-4-turbo": 0.01, "gpt-3.5-turbo": 0.001,
                                   "text-embedding-3-small": 0.00002, "claude-sonnet-4-20250514": 0.003, "claude-3.5-haiku": 0.001,
                                   "claude-3-opus": 0.015, "gemini-2.0-flash": 0.0001, "gemini-1.5-pro": 0.00125,
                                   "gemini-1.5-flash": 0.000075}.get(model, 0.001)
                    cost = Decimal(str(round(total_tok * cost_per_1k / 1000, 6)))
                    requests = random.randint(10, 500)

                    db.add(UsageRecord(
                        platform_key_id=pk.id, recorded_at=d, model=model,
                        input_tokens=input_tok, output_tokens=output_tok, total_tokens=total_tok,
                        cost_usd=cost, request_count=requests,
                    ))

        await db.commit()
        print("Seed complete!")
        print(f"  Admin login: admin@demo.com / admin123")
        print(f"  User logins: alice@demo.com, bob@demo.com, carol@demo.com / user123")
        print(f"  Tenant: {tenant.name} ({tenant.id})")
        print(f"  Departments: 3, Projects: 4, Keys: 7")
        print(f"  ~60 days of usage data generated")


if __name__ == "__main__":
    asyncio.run(seed())
