from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from threading import Lock
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from backend.models import CreateVolumeRequest, LaunchInstanceRequest
from backend.provider import CloudProvider

NOW = "2026-10-26T04:45:00Z"


class DemoProvider(CloudProvider):
    def __init__(self) -> None:
        self._lock = Lock()
        self.images = [
            {
                "id": "img-ubuntu-2404",
                "name": "Ubuntu 24.04 LTS",
                "status": "active",
                "size": 3_804_266_496,
                "disk_format": "qcow2",
                "min_disk": 12,
                "min_ram": 1024,
                "visibility": "public",
                "created_at": "2026-09-14T08:30:00Z",
            },
            {
                "id": "img-debian-12",
                "name": "Debian 12 Bookworm",
                "status": "active",
                "size": 702_545_920,
                "disk_format": "qcow2",
                "min_disk": 8,
                "min_ram": 512,
                "visibility": "public",
                "created_at": "2026-08-20T11:12:00Z",
            },
            {
                "id": "img-rocky-9",
                "name": "Rocky Linux 9",
                "status": "active",
                "size": 1_887_436_800,
                "disk_format": "qcow2",
                "min_disk": 10,
                "min_ram": 1024,
                "visibility": "shared",
                "created_at": "2026-07-02T16:06:00Z",
            },
        ]
        self.flavors = [
            {
                "id": "flavor-1",
                "name": "m1.tiny",
                "vcpus": 1,
                "ram": 512,
                "disk": 1,
                "ephemeral": 0,
                "is_public": True,
            },
            {
                "id": "flavor-2",
                "name": "m1.small",
                "vcpus": 1,
                "ram": 2048,
                "disk": 20,
                "ephemeral": 0,
                "is_public": True,
            },
            {
                "id": "flavor-3",
                "name": "m1.medium",
                "vcpus": 2,
                "ram": 4096,
                "disk": 40,
                "ephemeral": 0,
                "is_public": True,
            },
            {
                "id": "flavor-4",
                "name": "m1.large",
                "vcpus": 4,
                "ram": 8192,
                "disk": 80,
                "ephemeral": 0,
                "is_public": True,
            },
        ]
        self.networks = [
            {
                "id": "net-private",
                "name": "private",
                "status": "ACTIVE",
                "admin_state_up": True,
                "shared": False,
                "external": False,
                "subnets": [
                    {
                        "id": "subnet-private",
                        "name": "private-subnet",
                        "cidr": "10.0.0.0/24",
                        "gateway_ip": "10.0.0.1",
                        "ip_version": 4,
                    }
                ],
                "created_at": "2026-06-01T09:00:00Z",
            },
            {
                "id": "net-public",
                "name": "public",
                "status": "ACTIVE",
                "admin_state_up": True,
                "shared": True,
                "external": True,
                "subnets": [
                    {
                        "id": "subnet-public",
                        "name": "public-subnet",
                        "cidr": "192.168.100.0/24",
                        "gateway_ip": "192.168.100.1",
                        "ip_version": 4,
                    }
                ],
                "created_at": "2026-06-01T09:00:00Z",
            },
            {
                "id": "net-storage",
                "name": "storage",
                "status": "ACTIVE",
                "admin_state_up": True,
                "shared": False,
                "external": False,
                "subnets": [
                    {
                        "id": "subnet-storage",
                        "name": "storage-subnet",
                        "cidr": "172.16.10.0/24",
                        "gateway_ip": "172.16.10.1",
                        "ip_version": 4,
                    }
                ],
                "created_at": "2026-08-12T14:20:00Z",
            },
        ]
        self.security_groups = [
            {
                "id": "sg-default",
                "name": "default",
                "description": "Default security group",
                "rules": 4,
            },
            {
                "id": "sg-web",
                "name": "web-servers",
                "description": "HTTP, HTTPS and SSH ingress",
                "rules": 7,
            },
            {
                "id": "sg-db",
                "name": "database",
                "description": "Internal database access",
                "rules": 5,
            },
        ]
        self.keypairs = [
            {
                "name": "vincloud-admin",
                "fingerprint": "8a:64:11:32:84:9e:74:2b:30:2e:fc:71:d2:17:c8:41",
            },
            {
                "name": "development",
                "fingerprint": "6f:0b:63:e1:42:4a:d0:2a:17:b8:20:19:7a:11:cc:9d",
            },
        ]
        self.instances = [
            {
                "id": "srv-7fa1",
                "name": "api-production-01",
                "description": "Public API service",
                "status": "ACTIVE",
                "power_state": "Running",
                "task_state": None,
                "created_at": "2026-10-24T09:12:31Z",
                "updated_at": "2026-10-26T04:35:10Z",
                "image": self.images[0],
                "flavor": self.flavors[2],
                "addresses": [
                    {"network": "private", "address": "10.0.0.14", "type": "fixed", "version": 4},
                    {
                        "network": "public",
                        "address": "192.168.100.84",
                        "type": "floating",
                        "version": 4,
                    },
                ],
                "key_name": "vincloud-admin",
                "availability_zone": "nova",
                "host": "compute-01",
                "security_groups": ["default", "web-servers"],
                "volumes": ["vol-83bd"],
                "metadata": {"environment": "production", "service": "api"},
            },
            {
                "id": "srv-2c94",
                "name": "worker-02",
                "description": "Background jobs",
                "status": "ACTIVE",
                "power_state": "Running",
                "task_state": None,
                "created_at": "2026-10-25T06:44:03Z",
                "updated_at": "2026-10-25T06:45:42Z",
                "image": self.images[1],
                "flavor": self.flavors[1],
                "addresses": [
                    {"network": "private", "address": "10.0.0.23", "type": "fixed", "version": 4}
                ],
                "key_name": "development",
                "availability_zone": "nova",
                "host": "compute-01",
                "security_groups": ["default"],
                "volumes": [],
                "metadata": {"environment": "staging"},
            },
            {
                "id": "srv-915e",
                "name": "analytics-lab",
                "description": "Data experiments",
                "status": "SHUTOFF",
                "power_state": "Shutdown",
                "task_state": None,
                "created_at": "2026-10-20T13:18:11Z",
                "updated_at": "2026-10-25T18:20:02Z",
                "image": self.images[2],
                "flavor": self.flavors[3],
                "addresses": [
                    {"network": "private", "address": "10.0.0.31", "type": "fixed", "version": 4}
                ],
                "key_name": "development",
                "availability_zone": "nova",
                "host": "compute-01",
                "security_groups": ["default"],
                "volumes": ["vol-1da4"],
                "metadata": {"environment": "development"},
            },
            {
                "id": "srv-b807",
                "name": "docs-preview",
                "description": "Documentation previews",
                "status": "ERROR",
                "power_state": "No state",
                "task_state": None,
                "created_at": "2026-10-26T02:02:56Z",
                "updated_at": "2026-10-26T02:04:16Z",
                "image": self.images[0],
                "flavor": self.flavors[0],
                "addresses": [],
                "key_name": "development",
                "availability_zone": "nova",
                "host": None,
                "security_groups": ["default", "web-servers"],
                "volumes": [],
                "metadata": {},
                "fault": {"message": "No valid host was found", "code": 500},
            },
        ]
        self.volumes = [
            {
                "id": "vol-83bd",
                "name": "api-data",
                "description": "Production API persistent data",
                "status": "in-use",
                "size": 80,
                "volume_type": "__DEFAULT__",
                "bootable": False,
                "encrypted": False,
                "created_at": "2026-10-22T10:40:11Z",
                "availability_zone": "nova",
                "attachments": [
                    {
                        "server_id": "srv-7fa1",
                        "server_name": "api-production-01",
                        "device": "/dev/vdb",
                    }
                ],
                "snapshot_id": None,
                "source_volume_id": None,
            },
            {
                "id": "vol-1da4",
                "name": "analytics-datasets",
                "description": "Lab datasets",
                "status": "in-use",
                "size": 150,
                "volume_type": "__DEFAULT__",
                "bootable": False,
                "encrypted": False,
                "created_at": "2026-10-20T13:21:09Z",
                "availability_zone": "nova",
                "attachments": [
                    {"server_id": "srv-915e", "server_name": "analytics-lab", "device": "/dev/vdb"}
                ],
                "snapshot_id": None,
                "source_volume_id": None,
            },
            {
                "id": "vol-aa72",
                "name": "database-backup",
                "description": "Restored database backup",
                "status": "available",
                "size": 40,
                "volume_type": "__DEFAULT__",
                "bootable": False,
                "encrypted": False,
                "created_at": "2026-10-25T19:05:44Z",
                "availability_zone": "nova",
                "attachments": [],
                "snapshot_id": "snap-db-1025",
                "source_volume_id": None,
            },
        ]

    def _copy(self, value: Any) -> Any:
        return deepcopy(value)

    def overview(self) -> dict[str, Any]:
        active = sum(i["status"] == "ACTIVE" for i in self.instances)
        used_vcpus = sum(i["flavor"]["vcpus"] for i in self.instances if i["status"] != "ERROR")
        used_ram = sum(i["flavor"]["ram"] for i in self.instances if i["status"] != "ERROR")
        used_storage = sum(v["size"] for v in self.volumes)
        return {
            "project": {
                "id": "project-demo",
                "name": "demo",
                "domain": "Default",
                "region": "RegionOne",
            },
            "stats": {
                "instances": {"used": len(self.instances), "limit": 10, "active": active},
                "vcpus": {"used": used_vcpus, "limit": 20},
                "ram": {"used": used_ram, "limit": 51200, "unit": "MB"},
                "storage": {"used": used_storage, "limit": 1000, "unit": "GB"},
                "floating_ips": {"used": 1, "limit": 10},
            },
            "activity": [
                {
                    "id": "evt-1",
                    "action": "Instance started",
                    "resource": "api-production-01",
                    "at": "2026-10-26T04:35:10Z",
                    "status": "success",
                },
                {
                    "id": "evt-2",
                    "action": "Instance launch failed",
                    "resource": "docs-preview",
                    "at": "2026-10-26T02:04:16Z",
                    "status": "error",
                },
                {
                    "id": "evt-3",
                    "action": "Volume created",
                    "resource": "database-backup",
                    "at": "2026-10-25T19:05:44Z",
                    "status": "success",
                },
            ],
        }

    def catalog(self) -> dict[str, Any]:
        return self._copy(
            {
                "images": self.images,
                "flavors": self.flavors,
                "networks": self.networks,
                "security_groups": self.security_groups,
                "keypairs": self.keypairs,
                "availability_zones": ["nova"],
                "volume_types": ["__DEFAULT__", "fast-ssd"],
            }
        )

    def list_instances(self) -> list[dict[str, Any]]:
        return self._copy(self.instances)

    def get_instance(self, instance_id: str) -> dict[str, Any]:
        instance = next((item for item in self.instances if item["id"] == instance_id), None)
        if not instance:
            raise HTTPException(404, "Instance not found")
        return self._copy(instance)

    def create_instance(self, request: LaunchInstanceRequest) -> list[dict[str, Any]]:
        image = next((item for item in self.images if item["id"] == request.image_id), None)
        flavor = next((item for item in self.flavors if item["id"] == request.flavor_id), None)
        network = next((item for item in self.networks if item["id"] == request.network_id), None)
        if not all((image, flavor, network)):
            raise HTTPException(400, "Invalid image, flavor, or network selection")
        created = []
        with self._lock:
            for index in range(request.count):
                suffix = f"-{index + 1}" if request.count > 1 else ""
                instance = {
                    "id": f"srv-{uuid4().hex[:8]}",
                    "name": f"{request.name}{suffix}",
                    "description": request.description,
                    "status": "ACTIVE",
                    "power_state": "Running",
                    "task_state": None,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                    "image": self._copy(image),
                    "flavor": self._copy(flavor),
                    "addresses": [
                        {
                            "network": network["name"],
                            "address": f"10.0.0.{40 + len(self.instances)}",
                            "type": "fixed",
                            "version": 4,
                        }
                    ],
                    "key_name": request.key_name,
                    "availability_zone": request.availability_zone or "nova",
                    "host": "compute-01",
                    "security_groups": [
                        next(
                            (g["name"] for g in self.security_groups if g["id"] == group_id),
                            group_id,
                        )
                        for group_id in request.security_group_ids
                    ]
                    or ["default"],
                    "volumes": [],
                    "metadata": {},
                }
                self.instances.insert(0, instance)
                created.append(self._copy(instance))
        return created

    def instance_action(self, instance_id: str, action: str) -> dict[str, Any]:
        instance = next((item for item in self.instances if item["id"] == instance_id), None)
        if not instance:
            raise HTTPException(404, "Instance not found")
        if action == "stop":
            instance.update(status="SHUTOFF", power_state="Shutdown")
        elif action in {"start", "soft_reboot", "hard_reboot"}:
            instance.update(status="ACTIVE", power_state="Running")
        else:
            raise HTTPException(400, "Unsupported action")
        instance["updated_at"] = datetime.now(UTC).isoformat()
        return self._copy(instance)

    def delete_instance(self, instance_id: str) -> None:
        before = len(self.instances)
        self.instances = [item for item in self.instances if item["id"] != instance_id]
        if len(self.instances) == before:
            raise HTTPException(404, "Instance not found")

    def list_volumes(self) -> list[dict[str, Any]]:
        return self._copy(self.volumes)

    def get_volume(self, volume_id: str) -> dict[str, Any]:
        volume = next((item for item in self.volumes if item["id"] == volume_id), None)
        if not volume:
            raise HTTPException(404, "Volume not found")
        return self._copy(volume)

    def create_volume(self, request: CreateVolumeRequest) -> dict[str, Any]:
        volume = {
            "id": f"vol-{uuid4().hex[:8]}",
            "name": request.name,
            "description": request.description,
            "status": "available",
            "size": request.size,
            "volume_type": request.volume_type or "__DEFAULT__",
            "bootable": request.source_type == "image",
            "encrypted": False,
            "created_at": datetime.now(UTC).isoformat(),
            "availability_zone": request.availability_zone or "nova",
            "attachments": [],
            "snapshot_id": None,
            "source_volume_id": None,
        }
        self.volumes.insert(0, volume)
        return self._copy(volume)

    def delete_volume(self, volume_id: str) -> None:
        volume = self.get_volume(volume_id)
        if volume["attachments"]:
            raise HTTPException(409, "Detach the volume before deleting it")
        self.volumes = [item for item in self.volumes if item["id"] != volume_id]

    def attach_volume(self, volume_id: str, instance_id: str, device: str | None) -> dict[str, Any]:
        volume = next((item for item in self.volumes if item["id"] == volume_id), None)
        instance = next((item for item in self.instances if item["id"] == instance_id), None)
        if not volume or not instance:
            raise HTTPException(404, "Volume or instance not found")
        if volume["attachments"]:
            raise HTTPException(409, "Volume is already attached")
        volume["attachments"] = [
            {
                "server_id": instance_id,
                "server_name": instance["name"],
                "device": device or "/dev/vdb",
            }
        ]
        volume["status"] = "in-use"
        instance["volumes"].append(volume_id)
        return self._copy(volume)

    def detach_volume(self, volume_id: str) -> dict[str, Any]:
        volume = next((item for item in self.volumes if item["id"] == volume_id), None)
        if not volume:
            raise HTTPException(404, "Volume not found")
        for attachment in volume["attachments"]:
            instance = next(
                (item for item in self.instances if item["id"] == attachment["server_id"]), None
            )
            if instance and volume_id in instance["volumes"]:
                instance["volumes"].remove(volume_id)
        volume["attachments"] = []
        volume["status"] = "available"
        return self._copy(volume)

    def list_networks(self) -> list[dict[str, Any]]:
        return self._copy(self.networks)

    def list_images(self) -> list[dict[str, Any]]:
        return self._copy(self.images)
