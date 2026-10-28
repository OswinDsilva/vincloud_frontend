# VinCloud

VinCloud is a focused OpenStack dashboard for day-to-day project operations. It keeps the useful
resource information from Horizon while giving instance launch and volume management a smaller,
guided interface.

## Included

- Project overview with instance, vCPU, memory, and volume quota usage
- Instance list, detailed configuration, addresses, metadata, and fault information
- Five-step launch wizard for image, flavor, network, key pair, security groups, availability zone,
  instance count, and optional boot-from-volume
- Start, stop, soft reboot, and delete instance actions
- Volume list, details, create, attach, detach, and delete operations
- Image and network inventories
- FastAPI OpenAPI explorer at `/api/docs`
- Responsive desktop and mobile layouts
- In-memory demo mode for evaluating the complete UI without cloud credentials

## Architecture

```text
React / Vite UI  ->  FastAPI  ->  openstacksdk  ->  Keystone service catalog
                                                   | Nova
                                                   | Cinder
                                                   | Neutron
                                                   ` Glance
```

The browser never receives OpenStack credentials. The backend authenticates through a named cloud
in `clouds.yaml`, and the SDK discovers the individual service endpoints from Keystone.

## Run in demo mode

Requirements: `uv`, Node.js, and npm.

```bash
uv sync
cd frontend && npm install && cd ..
uv run uvicorn backend.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. Demo mode is the default and all mutations reset when the backend
restarts.

## Connect to DevStack

Create a restricted application credential or project user. Do not use the DevStack admin account
for the dashboard. Add the credential to a `clouds.yaml` file:

```yaml
clouds:
  devstack:
    auth:
      auth_url: http://CONTROLLER_IP/identity/v3
      application_credential_id: YOUR_APPLICATION_CREDENTIAL_ID
      application_credential_secret: YOUR_APPLICATION_CREDENTIAL_SECRET
    auth_type: v3applicationcredential
    region_name: RegionOne
    identity_api_version: "3"
    volume_api_version: "3"
```

Copy `.env.example` to `.env` and update it:

```dotenv
VINCLOUD_MODE=openstack
VINCLOUD_CLOUD=devstack
VINCLOUD_CONFIG_FILE=/absolute/path/to/clouds.yaml
VINCLOUD_CORS_ORIGINS=http://localhost:5173
```

Restart the backend. The machine running VinCloud must be able to reach the public/internal service
endpoints advertised by Keystone on the controller VM. Verify those URLs with:

```bash
openstack endpoint list
```

If VinCloud is exposed beyond a private lab network, use HTTPS for the UI and OpenStack API traffic.

## Development checks

```bash
uv run pytest -q
uv run ruff check backend
uv run ruff format --check backend
cd frontend && npm run build
```

The backend defaults to port `8000`; the Vite development server proxies `/api` to it.

