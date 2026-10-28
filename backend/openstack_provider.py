from __future__ import annotations

from functools import cached_property
from typing import Any

import openstack
from fastapi import HTTPException
from openstack.config import OpenStackConfig
from openstack.exceptions import HttpException, ResourceNotFound

from backend.config import Settings
from backend.models import CreateVolumeRequest, LaunchInstanceRequest
from backend.provider import CloudProvider


def _value(resource: Any, name: str, default: Any = None) -> Any:
    value = getattr(resource, name, default)
    return default if value is None else value


def _raise_cloud_error(error: Exception) -> None:
    if isinstance(error, ResourceNotFound):
        raise HTTPException(404, "OpenStack resource not found") from error
    if isinstance(error, HttpException):
        raise HTTPException(getattr(error, "status_code", 502) or 502, str(error)) from error
    raise HTTPException(502, f"Unable to communicate with OpenStack: {error}") from error


class OpenStackProvider(CloudProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @cached_property
    def conn(self):
        if self.settings.config_file:
            config = OpenStackConfig(config_files=[self.settings.config_file]).get_one_cloud(
                cloud=self.settings.cloud
            )
            return openstack.connection.Connection(
                config=config, app_name="vincloud", app_version="0.1"
            )
        return openstack.connect(cloud=self.settings.cloud, app_name="vincloud", app_version="0.1")

    def _image(self, image: Any) -> dict[str, Any]:
        return {
            "id": image.id,
            "name": _value(image, "name", image.id),
            "status": _value(image, "status", "unknown"),
            "size": _value(image, "size", 0),
            "disk_format": _value(image, "disk_format", "—"),
            "min_disk": _value(image, "min_disk", 0),
            "min_ram": _value(image, "min_ram", 0),
            "visibility": _value(image, "visibility", "private"),
            "created_at": _value(image, "created_at"),
        }

    def _flavor(self, flavor: Any) -> dict[str, Any]:
        return {
            "id": flavor.id,
            "name": _value(flavor, "name", flavor.id),
            "vcpus": _value(flavor, "vcpus", 0),
            "ram": _value(flavor, "ram", 0),
            "disk": _value(flavor, "disk", 0),
            "ephemeral": _value(flavor, "ephemeral", 0),
            "is_public": _value(flavor, "is_public", True),
        }

    def _network(self, network: Any) -> dict[str, Any]:
        subnets = []
        for subnet_id in _value(network, "subnet_ids", []):
            try:
                subnet = self.conn.network.get_subnet(subnet_id)
                subnets.append(
                    {
                        "id": subnet.id,
                        "name": _value(subnet, "name", subnet.id),
                        "cidr": _value(subnet, "cidr"),
                        "gateway_ip": _value(subnet, "gateway_ip"),
                        "ip_version": _value(subnet, "ip_version", 4),
                    }
                )
            except HttpException:
                subnets.append(
                    {
                        "id": subnet_id,
                        "name": subnet_id,
                        "cidr": None,
                        "gateway_ip": None,
                        "ip_version": 4,
                    }
                )
        return {
            "id": network.id,
            "name": _value(network, "name", network.id),
            "status": _value(network, "status", "unknown"),
            "admin_state_up": _value(network, "is_admin_state_up", True),
            "shared": _value(network, "is_shared", False),
            "external": _value(network, "is_router_external", False),
            "subnets": subnets,
            "created_at": _value(network, "created_at"),
        }

    def _server(self, server: Any) -> dict[str, Any]:
        image_ref = _value(server, "image", {}) or {}
        flavor_ref = _value(server, "flavor", {}) or {}
        image_id = (
            image_ref.get("id") if isinstance(image_ref, dict) else getattr(image_ref, "id", None)
        )
        flavor_id = (
            flavor_ref.get("id")
            if isinstance(flavor_ref, dict)
            else getattr(flavor_ref, "id", None)
        )
        try:
            image = (
                self._image(self.conn.image.get_image(image_id))
                if image_id
                else {"id": None, "name": "Booted from volume"}
            )
        except HttpException:
            image = {"id": image_id, "name": image_id or "Booted from volume"}
        try:
            flavor = (
                self._flavor(self.conn.compute.get_flavor(flavor_id))
                if flavor_id
                else {"id": None, "name": "Unknown", "vcpus": 0, "ram": 0, "disk": 0}
            )
        except HttpException:
            flavor = {
                "id": flavor_id,
                "name": flavor_id or "Unknown",
                "vcpus": 0,
                "ram": 0,
                "disk": 0,
            }
        addresses = []
        for network_name, entries in (_value(server, "addresses", {}) or {}).items():
            for entry in entries:
                addresses.append(
                    {
                        "network": network_name,
                        "address": entry.get("addr"),
                        "type": entry.get("OS-EXT-IPS:type", "fixed"),
                        "version": entry.get("version", 4),
                    }
                )
        power_states = {
            0: "No state",
            1: "Running",
            3: "Paused",
            4: "Shutdown",
            6: "Crashed",
            7: "Suspended",
        }
        power = _value(server, "power_state", 0)
        return {
            "id": server.id,
            "name": _value(server, "name", server.id),
            "description": _value(server, "description", ""),
            "status": _value(server, "status", "UNKNOWN"),
            "power_state": power_states.get(power, str(power)),
            "task_state": _value(server, "task_state"),
            "created_at": _value(server, "created_at", _value(server, "created")),
            "updated_at": _value(server, "updated_at", _value(server, "updated")),
            "image": image,
            "flavor": flavor,
            "addresses": addresses,
            "key_name": _value(server, "key_name"),
            "availability_zone": _value(server, "availability_zone"),
            "host": _value(server, "compute_host"),
            "security_groups": [
                group.get("name", "") for group in _value(server, "security_groups", [])
            ],
            "volumes": [volume.get("id") for volume in _value(server, "attached_volumes", [])],
            "metadata": _value(server, "metadata", {}),
            "fault": _value(server, "fault"),
        }

    def _volume(self, volume: Any) -> dict[str, Any]:
        attachments = []
        for attachment in _value(volume, "attachments", []):
            server_id = attachment.get("server_id") or attachment.get("serverId")
            try:
                server_name = self.conn.compute.get_server(server_id).name
            except HttpException:
                server_name = server_id
            attachments.append(
                {
                    "server_id": server_id,
                    "server_name": server_name,
                    "device": attachment.get("device"),
                }
            )
        return {
            "id": volume.id,
            "name": _value(volume, "name", volume.id),
            "description": _value(volume, "description", ""),
            "status": _value(volume, "status", "unknown"),
            "size": _value(volume, "size", 0),
            "volume_type": _value(volume, "volume_type", "__DEFAULT__"),
            "bootable": str(_value(volume, "is_bootable", False)).lower() == "true",
            "encrypted": _value(volume, "is_encrypted", False),
            "created_at": _value(volume, "created_at"),
            "availability_zone": _value(volume, "availability_zone"),
            "attachments": attachments,
            "snapshot_id": _value(volume, "snapshot_id"),
            "source_volume_id": _value(volume, "source_volume_id"),
        }

    def overview(self) -> dict[str, Any]:
        try:
            servers = list(self.conn.compute.servers(all_projects=False))
            volumes = list(self.conn.block_storage.volumes())
            limits = self.conn.compute.get_limits().absolute
            volume_gb = sum(_value(volume, "size", 0) for volume in volumes)
            project_id = self.conn.current_project_id
            return {
                "project": {
                    "id": project_id,
                    "name": self.conn.config.get_auth_args().get("project_name", project_id),
                    "domain": self.conn.config.get_auth_args().get(
                        "project_domain_name", "Default"
                    ),
                    "region": self.conn.config.region_name or "RegionOne",
                },
                "stats": {
                    "instances": {
                        "used": len(servers),
                        "limit": _value(limits, "max_total_instances", 0),
                        "active": sum(_value(server, "status") == "ACTIVE" for server in servers),
                    },
                    "vcpus": {
                        "used": _value(limits, "total_cores_used", 0),
                        "limit": _value(limits, "max_total_cores", 0),
                    },
                    "ram": {
                        "used": _value(limits, "total_ram_used", 0),
                        "limit": _value(limits, "max_total_ram_size", 0),
                        "unit": "MB",
                    },
                    "storage": {"used": volume_gb, "limit": 0, "unit": "GB"},
                    "floating_ips": {"used": len(list(self.conn.network.ips())), "limit": 0},
                },
                "activity": [],
            }
        except Exception as error:
            _raise_cloud_error(error)

    def catalog(self) -> dict[str, Any]:
        try:
            return {
                "images": [self._image(item) for item in self.conn.image.images(status="active")],
                "flavors": [self._flavor(item) for item in self.conn.compute.flavors()],
                "networks": [self._network(item) for item in self.conn.network.networks()],
                "security_groups": [
                    {
                        "id": item.id,
                        "name": item.name,
                        "description": _value(item, "description", ""),
                        "rules": len(_value(item, "security_group_rules", [])),
                    }
                    for item in self.conn.network.security_groups()
                ],
                "keypairs": [
                    {"name": item.name, "fingerprint": _value(item, "fingerprint", "")}
                    for item in self.conn.compute.keypairs()
                ],
                "availability_zones": [
                    item.name
                    for item in self.conn.compute.availability_zones()
                    if _value(item, "state", {}).get("available", True)
                ],
                "volume_types": [item.name for item in self.conn.block_storage.types()],
            }
        except Exception as error:
            _raise_cloud_error(error)

    def list_instances(self) -> list[dict[str, Any]]:
        try:
            return [self._server(item) for item in self.conn.compute.servers(details=True)]
        except Exception as error:
            _raise_cloud_error(error)

    def get_instance(self, instance_id: str) -> dict[str, Any]:
        try:
            return self._server(self.conn.compute.get_server(instance_id))
        except Exception as error:
            _raise_cloud_error(error)

    def create_instance(self, request: LaunchInstanceRequest) -> list[dict[str, Any]]:
        try:
            created = []
            for index in range(request.count):
                name = f"{request.name}-{index + 1}" if request.count > 1 else request.name
                attrs: dict[str, Any] = {
                    "name": name,
                    "description": request.description,
                    "flavor_id": request.flavor_id,
                    "networks": [{"uuid": request.network_id}],
                    "security_groups": [
                        {"name": self.conn.network.get_security_group(group_id).name}
                        for group_id in request.security_group_ids
                    ],
                }
                if request.key_name:
                    attrs["key_name"] = request.key_name
                if request.availability_zone:
                    attrs["availability_zone"] = request.availability_zone
                if request.boot_volume_size:
                    attrs["block_device_mapping_v2"] = [
                        {
                            "boot_index": "0",
                            "uuid": request.image_id,
                            "source_type": "image",
                            "destination_type": "volume",
                            "volume_size": request.boot_volume_size,
                            "delete_on_termination": request.delete_on_termination,
                        }
                    ]
                else:
                    attrs["image_id"] = request.image_id
                created.append(self._server(self.conn.compute.create_server(**attrs)))
            return created
        except Exception as error:
            _raise_cloud_error(error)

    def instance_action(self, instance_id: str, action: str) -> dict[str, Any]:
        try:
            server = self.conn.compute.get_server(instance_id)
            if action == "start":
                self.conn.compute.start_server(server)
            elif action == "stop":
                self.conn.compute.stop_server(server)
            elif action == "soft_reboot":
                self.conn.compute.reboot_server(server, reboot_type="SOFT")
            elif action == "hard_reboot":
                self.conn.compute.reboot_server(server, reboot_type="HARD")
            else:
                raise HTTPException(400, "Unsupported action")
            return self._server(self.conn.compute.get_server(instance_id))
        except HTTPException:
            raise
        except Exception as error:
            _raise_cloud_error(error)

    def delete_instance(self, instance_id: str) -> None:
        try:
            self.conn.compute.delete_server(instance_id, ignore_missing=False)
        except Exception as error:
            _raise_cloud_error(error)

    def list_volumes(self) -> list[dict[str, Any]]:
        try:
            return [self._volume(item) for item in self.conn.block_storage.volumes(details=True)]
        except Exception as error:
            _raise_cloud_error(error)

    def get_volume(self, volume_id: str) -> dict[str, Any]:
        try:
            return self._volume(self.conn.block_storage.get_volume(volume_id))
        except Exception as error:
            _raise_cloud_error(error)

    def create_volume(self, request: CreateVolumeRequest) -> dict[str, Any]:
        try:
            attrs = request.model_dump(exclude={"source_type", "image_id"}, exclude_none=True)
            if request.source_type == "image" and request.image_id:
                attrs["image_id"] = request.image_id
            return self._volume(self.conn.block_storage.create_volume(**attrs))
        except Exception as error:
            _raise_cloud_error(error)

    def delete_volume(self, volume_id: str) -> None:
        try:
            self.conn.block_storage.delete_volume(volume_id, ignore_missing=False)
        except Exception as error:
            _raise_cloud_error(error)

    def attach_volume(self, volume_id: str, instance_id: str, device: str | None) -> dict[str, Any]:
        try:
            self.conn.compute.create_volume_attachment(
                instance_id, volumeId=volume_id, device=device
            )
            return self.get_volume(volume_id)
        except Exception as error:
            _raise_cloud_error(error)

    def detach_volume(self, volume_id: str) -> dict[str, Any]:
        try:
            volume = self.conn.block_storage.get_volume(volume_id)
            attachments = _value(volume, "attachments", [])
            if not attachments:
                raise HTTPException(409, "Volume is not attached")
            server_id = attachments[0].get("server_id") or attachments[0].get("serverId")
            attachment_id = attachments[0].get("attachment_id") or volume_id
            self.conn.compute.delete_volume_attachment(attachment_id, server_id)
            return self.get_volume(volume_id)
        except HTTPException:
            raise
        except Exception as error:
            _raise_cloud_error(error)

    def list_networks(self) -> list[dict[str, Any]]:
        try:
            return [self._network(item) for item in self.conn.network.networks()]
        except Exception as error:
            _raise_cloud_error(error)

    def list_images(self) -> list[dict[str, Any]]:
        try:
            return [self._image(item) for item in self.conn.image.images()]
        except Exception as error:
            _raise_cloud_error(error)
