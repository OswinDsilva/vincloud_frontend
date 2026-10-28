import httpx
import pytest

from backend.main import app, get_provider


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as session:
        yield session


def setup_function():
    get_provider.cache_clear()


@pytest.mark.anyio
async def test_health_and_overview(client: httpx.AsyncClient):
    assert (await client.get("/api/health")).json()["status"] == "ok"
    overview = await client.get("/api/overview")
    assert overview.status_code == 200
    assert overview.json()["project"]["name"] == "demo"


@pytest.mark.anyio
async def test_launch_and_manage_instance(client: httpx.AsyncClient):
    response = await client.post(
        "/api/instances",
        json={
            "name": "test-vm",
            "image_id": "img-ubuntu-2404",
            "flavor_id": "flavor-2",
            "network_id": "net-private",
            "security_group_ids": ["sg-default"],
        },
    )
    assert response.status_code == 202
    instance = response.json()[0]
    assert instance["name"] == "test-vm"
    stopped = await client.post(f"/api/instances/{instance['id']}/actions", json={"action": "stop"})
    assert stopped.json()["status"] == "SHUTOFF"
    assert (await client.delete(f"/api/instances/{instance['id']}")).status_code == 204


@pytest.mark.anyio
async def test_create_attach_and_detach_volume(client: httpx.AsyncClient):
    volume = (await client.post("/api/volumes", json={"name": "test-volume", "size": 12})).json()
    attached = await client.post(
        f"/api/volumes/{volume['id']}/attach", json={"instance_id": "srv-2c94"}
    )
    assert attached.json()["status"] == "in-use"
    detached = await client.post(f"/api/volumes/{volume['id']}/detach")
    assert detached.json()["status"] == "available"
    assert (await client.delete(f"/api/volumes/{volume['id']}")).status_code == 204
