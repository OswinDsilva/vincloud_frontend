from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from backend.models import CreateVolumeRequest, LaunchInstanceRequest


class CloudProvider(ABC):
    @abstractmethod
    def overview(self) -> dict[str, Any]: ...

    @abstractmethod
    def catalog(self) -> dict[str, Any]: ...

    @abstractmethod
    def list_instances(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def get_instance(self, instance_id: str) -> dict[str, Any]: ...

    @abstractmethod
    def create_instance(self, request: LaunchInstanceRequest) -> list[dict[str, Any]]: ...

    @abstractmethod
    def instance_action(self, instance_id: str, action: str) -> dict[str, Any]: ...

    @abstractmethod
    def delete_instance(self, instance_id: str) -> None: ...

    @abstractmethod
    def list_volumes(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def get_volume(self, volume_id: str) -> dict[str, Any]: ...

    @abstractmethod
    def create_volume(self, request: CreateVolumeRequest) -> dict[str, Any]: ...

    @abstractmethod
    def delete_volume(self, volume_id: str) -> None: ...

    @abstractmethod
    def attach_volume(
        self, volume_id: str, instance_id: str, device: str | None
    ) -> dict[str, Any]: ...

    @abstractmethod
    def detach_volume(self, volume_id: str) -> dict[str, Any]: ...

    @abstractmethod
    def list_networks(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def list_images(self) -> list[dict[str, Any]]: ...
