export type Image = { id: string; name: string; status: string; size: number; disk_format: string; min_disk: number; min_ram: number; visibility: string; created_at?: string }
export type Flavor = { id: string; name: string; vcpus: number; ram: number; disk: number; ephemeral: number; is_public: boolean }
export type Address = { network: string; address: string; type: 'fixed' | 'floating'; version: number }
export type Instance = { id: string; name: string; description: string; status: string; power_state: string; task_state?: string; created_at: string; updated_at: string; image: Image; flavor: Flavor; addresses: Address[]; key_name?: string; availability_zone?: string; host?: string; security_groups: string[]; volumes: string[]; metadata: Record<string, string>; fault?: { message: string; code: number } }
export type Attachment = { server_id: string; server_name: string; device: string }
export type Volume = { id: string; name: string; description: string; status: string; size: number; volume_type: string; bootable: boolean; encrypted: boolean; created_at: string; availability_zone: string; attachments: Attachment[]; snapshot_id?: string; source_volume_id?: string }
export type Subnet = { id: string; name: string; cidr?: string; gateway_ip?: string; ip_version: number }
export type Network = { id: string; name: string; status: string; admin_state_up: boolean; shared: boolean; external: boolean; subnets: Subnet[]; created_at?: string }
export type SecurityGroup = { id: string; name: string; description: string; rules: number }
export type Keypair = { name: string; fingerprint: string }
export type Catalog = { images: Image[]; flavors: Flavor[]; networks: Network[]; security_groups: SecurityGroup[]; keypairs: Keypair[]; availability_zones: string[]; volume_types: string[] }
export type Usage = { used: number; limit: number; unit?: string; active?: number }
export type Overview = { project: { id: string; name: string; domain: string; region: string }; stats: { instances: Usage; vcpus: Usage; ram: Usage; storage: Usage; floating_ips: Usage }; activity: { id: string; action: string; resource: string; at: string; status: string }[] }
export type LaunchPayload = { name: string; description: string; count: number; image_id: string; flavor_id: string; network_id: string; key_name: string | null; security_group_ids: string[]; availability_zone: string | null; boot_volume_size: number | null; delete_on_termination: boolean }

