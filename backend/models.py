from typing import Literal

from pydantic import BaseModel, Field


class LaunchInstanceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=255)
    count: int = Field(default=1, ge=1, le=10)
    image_id: str
    flavor_id: str
    network_id: str
    key_name: str | None = None
    security_group_ids: list[str] = Field(default_factory=list)
    availability_zone: str | None = None
    boot_volume_size: int | None = Field(default=None, ge=1, le=16384)
    delete_on_termination: bool = True


class InstanceActionRequest(BaseModel):
    action: Literal["start", "stop", "soft_reboot", "hard_reboot"]


class CreateVolumeRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=255)
    size: int = Field(ge=1, le=16384)
    volume_type: str | None = None
    availability_zone: str | None = None
    source_type: Literal["empty", "image"] = "empty"
    image_id: str | None = None


class VolumeAttachmentRequest(BaseModel):
    instance_id: str
    device: str | None = None


class FloatingIpRequest(BaseModel):
    network_id: str


class FloatingIpAssociationRequest(BaseModel):
    address: str
