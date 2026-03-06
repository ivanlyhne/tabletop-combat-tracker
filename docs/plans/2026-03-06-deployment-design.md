# Deployment Design — Oracle Cloud Always Free

**Date:** 2026-03-06
**Status:** Approved
**Scope:** IaC folder structure + app changes for production deployment on Oracle Cloud Always Free tier (portable to Azure / other providers via module abstraction)

---

## 1. Target Architecture

```
Internet (HTTPS :443)
        │
        ▼
  OCI VM — A1 ARM (4 OCPU / 24 GB RAM)
  ┌────────────────────────────────────┐
  │  nginx :443  (Let's Encrypt cert)  │
  │    ├── /api/**  → backend:8080     │
  │    ├── /ws      → backend:8080     │
  │    │             (WebSocket STOMP) │
  │    └── /**      → Angular SPA      │
  │                                    │
  │  Spring Boot :8080                 │
  │  PostgreSQL  :5432 (internal only) │
  └────────────────────────────────────┘
        │
        ▼
  OCI Block Volume 200 GB — /data
    ├── /data/postgres/    DB data dir
    └── /data/uploads/     Map images

OCI Always Free resources used:
  ✅ 1× VM.Standard.A1.Flex  (4 OCPU / 24 GB)
  ✅ 200 GB block storage
  ✅ 1 VCN + subnet + internet gateway
  ✅ 10 TB/month outbound transfer
  ✅ No load balancer (nginx handles TLS directly — avoids 10 Mbps LB cap)
```

**Why no load balancer:** OCI's free flexible LB is bandwidth-capped at 10 Mbps. For this use case (GM + small player group) we skip the LB and terminate TLS directly on the VM's nginx with a Certbot/Let's Encrypt certificate. Full VM NIC bandwidth is available and no LB fees accrue if the account upgrades.

---

## 2. Repository Changes

### 2a. New IaC folder structure

```
infra/
├── modules/
│   ├── container-host/        # Generic: VM + Docker + block volume mount + firewall
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── postgres/              # Convention doc for PostgreSQL container config
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── providers/
│   └── oracle/                # OCI-specific Terraform (calls modules above)
│       ├── main.tf            # VCN, subnet, IGW, route table, security list,
│       │                      # compute instance, block volume + attachment
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars.example
└── docker/
    ├── Dockerfile.backend     # Multi-stage: Maven build → JRE 21 runtime
    ├── Dockerfile.frontend    # Multi-stage: Node build → nginx static serve
    ├── nginx.conf             # SPA fallback + /api + /ws proxy + WS upgrade headers
    └── docker-compose.prod.yml  # Production compose (env-var secrets, all services)
```

**Future provider:** Adding Azure = create `infra/providers/azure/` calling the same modules. Modules are cloud-agnostic.

### 2b. App code changes

| File | Change | Reason |
|------|--------|--------|
| `backend/src/main/java/…/service/MapService.java` | Read `UPLOAD_DIR` env var; fallback `"uploads"` for local dev | File uploads currently hardcoded to local `./uploads/` — won't persist across container restarts |
| `backend/src/main/java/…/config/SecurityConfig.java` | Permit `/actuator/health` (unauthenticated) | Health check needed to confirm container is up after deploy |
| `.env.example` | Add `UPLOAD_DIR`, `DOMAIN`, `CERTBOT_EMAIL` vars | Operators need to know all required vars |
| `docker-compose.yml` | No changes — keep as dev compose | Leave dev workflow unchanged |
| `README.md` | Add deployment architecture section | Architecture diagrams and deployment overview always documented in root README |

### 2c. Production compose (`infra/docker/docker-compose.prod.yml`)

- Adds `frontend` service (currently absent from dev compose)
- All secrets from environment variables — no hardcoded values
- `UPLOAD_DIR=/data/uploads` maps to block volume mount
- `DB_URL` points to `/data/postgres` volume
- `restart: unless-stopped` on all services
- Internal network: backend + postgres only; frontend + nginx on public-facing network

---

## 3. Terraform Module Interfaces

### `modules/container-host`

```hcl
# Inputs
variable "instance_shape"   {}   # e.g. "VM.Standard.A1.Flex"
variable "ocpus"            {}   # 4
variable "memory_gb"        {}   # 24
variable "ssh_public_key"   {}
variable "subnet_id"        {}
variable "block_volume_id"  {}
variable "allowed_ports"    {}   # [22, 80, 443]

# Outputs
output "public_ip"    {}
output "instance_id"  {}
```

Provisions via `remote-exec`:
1. Install Docker Engine + Docker Compose plugin
2. Mount block volume at `/data`
3. Create `/data/uploads` and `/data/postgres` directories

### `modules/postgres`

Thin documentation module — no cloud resource.
Outputs connection string template for use in `.env`.

### `providers/oracle` resources

```
oci_core_vcn
oci_core_internet_gateway
oci_core_route_table          (default route → IGW)
oci_core_subnet               (10.0.0.0/24 public)
oci_core_security_list        (ingress 22/80/443, egress all)
oci_core_instance             (calls container-host module)
oci_core_volume               (200 GB)
oci_core_volume_attachment    (paravirtualized)
```

`terraform.tfvars.example`:
```hcl
tenancy_ocid     = "ocid1.tenancy…"
user_ocid        = "ocid1.user…"
fingerprint      = "aa:bb:…"
private_key_path = "~/.oci/oci_api_key.pem"
region           = "eu-frankfurt-1"
ssh_public_key   = "ssh-rsa AAAA…"
domain           = "combat.yourdomain.com"
```

**Secret management:** App secrets (`JWT_SECRET`, `JASYPT_PASSWORD`, `DB_PASSWORD`, etc.) live in a `.env` file on the VM — outside Terraform state. Terraform only provisions infrastructure.

---

## 4. Deployment Workflow

### First-time deploy
```bash
# 1. Provision infra
cd infra/providers/oracle
cp terraform.tfvars.example terraform.tfvars   # fill in OCI credentials
terraform init && terraform apply

# 2. SSH into new VM (public_ip from terraform output)
ssh ubuntu@<public_ip>

# 3. Clone repo and configure secrets
git clone https://github.com/ivanlyhne/tabletop-combat-tracker
cd tabletop-combat-tracker/infra/docker
cp .env.example .env
nano .env    # fill in JWT_SECRET, JASYPT_PASSWORD, DB_PASSWORD, DOMAIN, etc.

# 4. Start stack
docker compose -f docker-compose.prod.yml up -d

# 5. Issue TLS certificate (free, auto-renews)
sudo certbot --nginx -d <domain>
```

### Update deploy
```bash
git pull
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### Rollback
```bash
git checkout <previous-tag>
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### Backup
OCI block volume snapshots via Console (5 free snapshots included).
One snapshot covers both PostgreSQL data and uploaded map images.

---

## 5. README Updates

Root `README.md` will gain a **Deployment** section containing:
- Architecture ASCII diagram (same as Section 1 above)
- Oracle Always Free resource list with verified limits
- Terraform quick-start instructions
- Environment variable reference table (all vars, dev + prod)
- Certbot setup note

---

## 6. Out of Scope

- CI/CD pipeline (GitHub Actions) — future phase
- Multi-region / HA — not needed at hobby scale
- Azure / other provider Terraform — structure ready, implementation deferred
- Managed database (OCI Autonomous DB) — self-hosted PostgreSQL on block volume is simpler and avoids 20-session limit of free Autonomous DB
