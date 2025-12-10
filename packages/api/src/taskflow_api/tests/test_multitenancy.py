"""Tests for multi-tenancy project isolation."""

import pytest
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from taskflow_api.models.project import Project


@pytest.mark.asyncio
async def test_list_projects_tenant_isolation(client: AsyncClient, session: AsyncSession) -> None:
    """Test that projects from tenant A are not visible to tenant B."""
    # Create project in tenant A (using X-Tenant-ID header in dev mode)
    response_a = await client.post(
        "/api/projects",
        json={
            "slug": "tenant-a-project",
            "name": "Tenant A Project",
            "description": "Project in tenant A",
        },
        headers={"X-Tenant-ID": "tenant-a"},
    )
    assert response_a.status_code == 201
    project_a_id = response_a.json()["id"]
    assert response_a.json()["tenant_id"] == "tenant-a"

    # Create project in tenant B
    response_b = await client.post(
        "/api/projects",
        json={
            "slug": "tenant-b-project",
            "name": "Tenant B Project",
            "description": "Project in tenant B",
        },
        headers={"X-Tenant-ID": "tenant-b"},
    )
    assert response_b.status_code == 201
    project_b_id = response_b.json()["id"]
    assert response_b.json()["tenant_id"] == "tenant-b"

    # List projects in tenant A - should only see tenant A projects
    list_a = await client.get("/api/projects", headers={"X-Tenant-ID": "tenant-a"})
    assert list_a.status_code == 200
    projects_a = list_a.json()
    tenant_a_ids = [p["id"] for p in projects_a]
    assert project_a_id in tenant_a_ids
    assert project_b_id not in tenant_a_ids

    # List projects in tenant B - should only see tenant B projects
    list_b = await client.get("/api/projects", headers={"X-Tenant-ID": "tenant-b"})
    assert list_b.status_code == 200
    projects_b = list_b.json()
    tenant_b_ids = [p["id"] for p in projects_b]
    assert project_b_id in tenant_b_ids
    assert project_a_id not in tenant_b_ids


@pytest.mark.asyncio
async def test_get_project_wrong_tenant_returns_404(
    client: AsyncClient, session: AsyncSession
) -> None:
    """Test that accessing a project from wrong tenant returns 404 (not 403)."""
    # Create project in tenant A
    response = await client.post(
        "/api/projects",
        json={
            "slug": "secure-project",
            "name": "Secure Project",
            "description": "Should not be visible cross-tenant",
        },
        headers={"X-Tenant-ID": "tenant-a"},
    )
    assert response.status_code == 201
    project_id = response.json()["id"]

    # Try to access from tenant B - should get 404
    get_response = await client.get(
        f"/api/projects/{project_id}",
        headers={"X-Tenant-ID": "tenant-b"},
    )
    assert get_response.status_code == 404
    assert get_response.json()["error"] == "Project not found"


@pytest.mark.asyncio
async def test_create_project_sets_tenant(client: AsyncClient, session: AsyncSession) -> None:
    """Test that new projects get current tenant context."""
    # Create project with X-Tenant-ID header
    response = await client.post(
        "/api/projects",
        json={
            "slug": "new-tenant-project",
            "name": "New Tenant Project",
            "description": "Should get tenant from header",
        },
        headers={"X-Tenant-ID": "custom-tenant"},
    )
    assert response.status_code == 201
    project_data = response.json()
    assert project_data["tenant_id"] == "custom-tenant"

    # Verify in database
    stmt = select(Project).where(Project.id == project_data["id"])
    result = await session.exec(stmt)
    project = result.first()
    assert project is not None
    assert project.tenant_id == "custom-tenant"


@pytest.mark.asyncio
async def test_default_tenant_fallback(client: AsyncClient, session: AsyncSession) -> None:
    """Test that projects without tenant_id claim use 'taskflow' default."""
    # Create project without X-Tenant-ID header (should use default)
    response = await client.post(
        "/api/projects",
        json={
            "slug": "default-tenant-project",
            "name": "Default Tenant Project",
            "description": "Should get default tenant",
        },
    )
    assert response.status_code == 201
    project_data = response.json()
    assert project_data["tenant_id"] == "taskflow-default-org-id"

    # List projects without tenant header - should see default tenant projects
    list_response = await client.get("/api/projects")
    assert list_response.status_code == 200
    projects = list_response.json()
    project_ids = [p["id"] for p in projects]
    assert project_data["id"] in project_ids


@pytest.mark.asyncio
async def test_slug_unique_per_tenant(client: AsyncClient, session: AsyncSession) -> None:
    """Test that same slug can exist in different tenants."""
    # Create project with slug 'roadmap' in tenant A
    response_a = await client.post(
        "/api/projects",
        json={
            "slug": "roadmap",
            "name": "Tenant A Roadmap",
            "description": "Roadmap for tenant A",
        },
        headers={"X-Tenant-ID": "tenant-a"},
    )
    assert response_a.status_code == 201
    assert response_a.json()["slug"] == "roadmap"
    assert response_a.json()["tenant_id"] == "tenant-a"

    # Create project with same slug 'roadmap' in tenant B - should succeed
    response_b = await client.post(
        "/api/projects",
        json={
            "slug": "roadmap",
            "name": "Tenant B Roadmap",
            "description": "Roadmap for tenant B",
        },
        headers={"X-Tenant-ID": "tenant-b"},
    )
    assert response_b.status_code == 201
    assert response_b.json()["slug"] == "roadmap"
    assert response_b.json()["tenant_id"] == "tenant-b"

    # Try to create another 'roadmap' in tenant A - should fail
    response_dup = await client.post(
        "/api/projects",
        json={
            "slug": "roadmap",
            "name": "Another Roadmap",
            "description": "Duplicate slug in same tenant",
        },
        headers={"X-Tenant-ID": "tenant-a"},
    )
    assert response_dup.status_code == 400
    assert "already exists in your organization" in response_dup.json()["error"].lower()
