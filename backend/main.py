from functools import lru_cache

from fastapi import Depends, FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from backend.config import Settings, get_settings
from backend.demo_provider import DemoProvider
from backend.models import (
    CreateVolumeRequest,
    InstanceActionRequest,
    LaunchInstanceRequest,
    VolumeAttachmentRequest,
)
from backend.openstack_provider import OpenStackProvider
from backend.provider import CloudProvider

app = FastAPI(title="VinCloud API", version="0.1.0", docs_url="/api/docs")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache
def get_provider() -> CloudProvider:
    active_settings: Settings = get_settings()
    if active_settings.mode.lower() == "openstack":
        return OpenStackProvider(active_settings)
    return DemoProvider()


async def provider_dependency() -> CloudProvider:
    return get_provider()


@app.get("/api/health")
async def health(provider: CloudProvider = Depends(provider_dependency)):
    return {"status": "ok", "mode": settings.mode, "provider": provider.__class__.__name__}


@app.get("/api/overview")
async def overview(provider: CloudProvider = Depends(provider_dependency)):
    return provider.overview()


@app.get("/api/catalog")
async def catalog(provider: CloudProvider = Depends(provider_dependency)):
    return provider.catalog()


@app.get("/api/instances")
async def instances(provider: CloudProvider = Depends(provider_dependency)):
    return provider.list_instances()


@app.get("/api/instances/{instance_id}")
async def instance(instance_id: str, provider: CloudProvider = Depends(provider_dependency)):
    return provider.get_instance(instance_id)


@app.post("/api/instances", status_code=status.HTTP_202_ACCEPTED)
async def launch_instance(
    request: LaunchInstanceRequest, provider: CloudProvider = Depends(provider_dependency)
):
    return provider.create_instance(request)


@app.post("/api/instances/{instance_id}/actions", status_code=status.HTTP_202_ACCEPTED)
async def instance_action(
    instance_id: str,
    request: InstanceActionRequest,
    provider: CloudProvider = Depends(provider_dependency),
):
    return provider.instance_action(instance_id, request.action)


@app.delete("/api/instances/{instance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_instance(instance_id: str, provider: CloudProvider = Depends(provider_dependency)):
    provider.delete_instance(instance_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/volumes")
async def volumes(provider: CloudProvider = Depends(provider_dependency)):
    return provider.list_volumes()


@app.get("/api/volumes/{volume_id}")
async def volume(volume_id: str, provider: CloudProvider = Depends(provider_dependency)):
    return provider.get_volume(volume_id)


@app.post("/api/volumes", status_code=status.HTTP_202_ACCEPTED)
async def create_volume(
    request: CreateVolumeRequest, provider: CloudProvider = Depends(provider_dependency)
):
    return provider.create_volume(request)


@app.delete("/api/volumes/{volume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_volume(volume_id: str, provider: CloudProvider = Depends(provider_dependency)):
    provider.delete_volume(volume_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/volumes/{volume_id}/attach", status_code=status.HTTP_202_ACCEPTED)
async def attach_volume(
    volume_id: str,
    request: VolumeAttachmentRequest,
    provider: CloudProvider = Depends(provider_dependency),
):
    return provider.attach_volume(volume_id, request.instance_id, request.device)


@app.post("/api/volumes/{volume_id}/detach", status_code=status.HTTP_202_ACCEPTED)
async def detach_volume(volume_id: str, provider: CloudProvider = Depends(provider_dependency)):
    return provider.detach_volume(volume_id)


@app.get("/api/networks")
async def networks(provider: CloudProvider = Depends(provider_dependency)):
    return provider.list_networks()


@app.get("/api/images")
async def images(provider: CloudProvider = Depends(provider_dependency)):
    return provider.list_images()
