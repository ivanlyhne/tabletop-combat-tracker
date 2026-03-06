# Deployment (Phase 12) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the GM Combat Tracker deployable to Oracle Cloud Always Free tier (and future providers) via Terraform IaC + Docker, with zero hardcoded secrets and persistent storage on a block volume.

**Architecture:** One A1 ARM VM (4 OCPU/24 GB) runs all containers. Host nginx handles TLS via Let's Encrypt and proxies to Docker services on localhost ports. A 150 GB block volume at `/data` holds both the PostgreSQL data dir and uploaded map images — surviving container restarts and redeploys.

**Tech Stack:** Terraform ≥ 1.6, OCI Terraform provider ~6.0, Docker + Docker Compose v2, nginx (host), Certbot, eclipse-temurin:21-jre-alpine, nginx:alpine, maven:3.9-eclipse-temurin-21-alpine, node:20-alpine.

**Design doc:** `docs/plans/2026-03-06-deployment-design.md`

---

## Part A — App Changes (backend)

### Task 1: Add UPLOAD_DIR env var support to MapService

**Files:**
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/gm/combat/service/MapService.java`

**Context:** Currently `MapService.java` line 106 hardcodes `Path.of("uploads")`. On the production VM this needs to be `/data/uploads` (block volume). The Spring way is to bind an env var through `application.yml` and inject with `@Value`.

**Step 1: Add the property to application.yml**

Open `backend/src/main/resources/application.yml`. Under the `app:` block (after `allowed-origins`), add:

```yaml
app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
  allowed-origins: ${ALLOWED_ORIGINS:http://localhost:4200}
  upload-dir: ${UPLOAD_DIR:uploads}
```

**Step 2: Inject the property into MapService**

Open `backend/src/main/java/com/gm/combat/service/MapService.java`.

Add the import at the top with the other Spring imports:
```java
import org.springframework.beans.factory.annotation.Value;
```

Add a field just below the class-level constants (before the repository fields):
```java
@Value("${app.upload-dir}")
private String uploadDirPath;
```

Find (around line 106):
```java
            Path uploadDir = Path.of("uploads");
            Files.createDirectories(uploadDir);
            // Use only the sanitised extension — never trust the original filename
            String filename = mapId + "_bg." + ext.toLowerCase();
            Files.write(uploadDir.resolve(filename), file.getBytes());
```

Replace with:
```java
            Path uploadDir = Path.of(uploadDirPath);
            Files.createDirectories(uploadDir);
            // Use only the sanitised extension — never trust the original filename
            String filename = mapId + "_bg." + ext.toLowerCase();
            Files.write(uploadDir.resolve(filename), file.getBytes());
```

**Step 3: Verify the backend still starts locally**

```bash
cd backend && ./mvnw spring-boot:run
```
Expected: Starts without error. `app.upload-dir` defaults to `uploads` (same as before).

**Step 4: Commit**

```bash
git add backend/src/main/resources/application.yml \
        backend/src/main/java/com/gm/combat/service/MapService.java
git commit -m "feat: make upload directory configurable via UPLOAD_DIR env var"
```

---

### Task 2: Permit /actuator/health in SecurityConfig

**Files:**
- Modify: `backend/src/main/java/com/gm/combat/config/SecurityConfig.java`

**Context:** Spring Actuator's `/actuator/health` endpoint returns 403 because SecurityConfig requires auth on all paths except the explicit allowlist. We need it public so we can verify the container is up after deploy without needing a JWT.

**Step 1: Find the permitAll line**

In `SecurityConfig.java` find (around line 69):
```java
.requestMatchers("/api/auth/**", "/ws/**", "/api/player/**", "/uploads/**", "/error").permitAll()
```

**Step 2: Add /actuator/health to the allowlist**

Replace that line with:
```java
.requestMatchers("/api/auth/**", "/ws/**", "/api/player/**", "/uploads/**", "/error", "/actuator/health").permitAll()
```

**Step 3: Verify locally**

Start the backend, then:
```bash
curl http://localhost:8080/actuator/health
```
Expected: `{"status":"UP"}` with HTTP 200 (no auth header needed).

**Step 4: Commit**

```bash
git add backend/src/main/java/com/gm/combat/config/SecurityConfig.java
git commit -m "feat: expose /actuator/health publicly for container health checks"
```

---

### Task 3: Create .env.example

**Files:**
- Create: `.env.example` (repo root)

**Context:** There is no `.env.example` in the repo. Operators need a single reference for all required environment variables for both dev and production.

**Step 1: Create the file**

Create `.env.example` at the repo root with this content:

```bash
# ── Required (no defaults — app refuses to start without these) ────────────
JWT_SECRET=change-me-use-openssl-rand-base64-48
JASYPT_PASSWORD=change-me-use-openssl-rand-base64-32

# ── Database ──────────────────────────────────────────────────────────────
DB_URL=jdbc:postgresql://localhost:5432/combat_db
DB_USERNAME=combat
DB_PASSWORD=change-me

# ── CORS / WebSocket origin ───────────────────────────────────────────────
# Dev: http://localhost:4200
# Prod: https://your-domain.com
ALLOWED_ORIGINS=http://localhost:4200

# ── File uploads ──────────────────────────────────────────────────────────
# Dev: leave unset (defaults to ./uploads/ relative to working dir)
# Prod: /data/uploads  (block volume mount)
UPLOAD_DIR=uploads

# ── Production only ───────────────────────────────────────────────────────
# Your registered domain pointing to the OCI VM public IP
DOMAIN=combat.yourdomain.com
# Email used by Certbot for Let's Encrypt certificate renewal alerts
CERTBOT_EMAIL=you@yourdomain.com
```

**Step 2: Ensure .env is git-ignored**

Check `.gitignore` contains `.env`. If not, add it:
```bash
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
```

**Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example with all required environment variables"
```

---

## Part B — Docker

### Task 4: Dockerfile.backend (multi-stage)

**Files:**
- Create: `infra/docker/Dockerfile.backend`

**Context:** No Dockerfile exists for the backend despite `docker-compose.yml` referencing `build: ./backend`. The multi-stage build keeps the runtime image small: Maven compiles in stage 1, only the JRE + fat JAR ship in stage 2. Build context is the **repo root** (so the compose file can also build the frontend from the same context).

**Step 1: Create the infra/docker directory**

```bash
mkdir -p infra/docker
```

**Step 2: Create Dockerfile.backend**

```dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build

# Copy only pom.xml first — Docker layer cache means deps are only
# re-downloaded when pom.xml changes, not on every source change.
COPY backend/pom.xml .
COPY backend/src ./src

RUN mvn package -DskipTests --no-transfer-progress

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /build/target/*.jar app.jar

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Step 3: Test the build (from repo root)**

```bash
docker build -f infra/docker/Dockerfile.backend -t combat-backend:test .
```
Expected: Build completes, image tagged `combat-backend:test`. No errors.

**Step 4: Smoke-test the image**

```bash
docker run --rm -e JWT_SECRET=test-secret-min-32-chars-long-here \
               -e JASYPT_PASSWORD=test-jasypt-password \
               -e ALLOWED_ORIGINS=http://localhost:4200 \
               -e DB_URL=jdbc:postgresql://localhost:5432/x \
               -e DB_USERNAME=x -e DB_PASSWORD=x \
               combat-backend:test
```
Expected: Spring Boot starts, then fails with a DB connection error (no DB running). That's correct — we just need to confirm the JAR loads.

**Step 5: Commit**

```bash
git add infra/docker/Dockerfile.backend
git commit -m "feat: add multi-stage Dockerfile for backend (maven build → JRE runtime)"
```

---

### Task 5: nginx.conf (Docker frontend SPA config) + Dockerfile.frontend

**Files:**
- Create: `infra/docker/nginx.conf`
- Create: `infra/docker/Dockerfile.frontend`

**Context:** The frontend Docker container serves pre-built Angular static files. It only needs an SPA fallback — all API/WebSocket routing is handled by the **host** nginx. Angular 21's `@angular/build:application` builder outputs to `dist/frontend/browser/`.

**Step 1: Create infra/docker/nginx.conf**

This config is embedded in the Docker image — it serves the SPA only:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Angular SPA: serve index.html for any path that is not a real file.
    # This lets the Angular router handle /campaigns, /combat/:id, etc.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Disable access logging for favicon/robots to reduce noise
    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }
}
```

**Step 2: Create infra/docker/Dockerfile.frontend**

```dockerfile
# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /build

# Install deps before copying source — better layer caching.
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

# Copy the rest of the frontend source and build for production.
COPY frontend/ .
RUN npm run build -- --configuration production

# ── Stage 2: Serve ────────────────────────────────────────────────────────
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Angular 21 (@angular/build:application) outputs to dist/<project>/browser/
COPY --from=build /build/dist/frontend/browser/ .

# Replace default nginx config with our SPA config
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**Step 3: Test the build (from repo root)**

```bash
docker build -f infra/docker/Dockerfile.frontend -t combat-frontend:test .
```
Expected: Build completes. The Angular `npm run build` step may take 30–60 seconds.

**Step 4: Smoke-test**

```bash
docker run --rm -p 8888:80 combat-frontend:test
```
Open `http://localhost:8888` in a browser — Angular app should load (API calls will fail with no backend, that's expected).

**Step 5: Commit**

```bash
git add infra/docker/nginx.conf infra/docker/Dockerfile.frontend
git commit -m "feat: add nginx SPA config and multi-stage Dockerfile for frontend"
```

---

### Task 6: docker-compose.prod.yml

**Files:**
- Create: `infra/docker/docker-compose.prod.yml`

**Context:** The existing `docker-compose.yml` (dev) has no frontend container and hardcoded secrets. The prod compose adds the frontend service, sources all secrets from env vars, mounts the block volume paths, and sets `restart: unless-stopped`. Services communicate over an internal Docker network. Only backend (8080) and frontend (3000) bind to localhost — the host nginx proxies to them; nothing is exposed to the internet directly from Docker.

**Step 1: Create docker-compose.prod.yml**

```yaml
# Production Docker Compose
# Run from repo root:
#   docker compose -f infra/docker/docker-compose.prod.yml up -d
#
# All secrets come from environment variables. Copy .env.example → .env
# and fill in values before starting.
#
# Block volume must be mounted at /data before starting:
#   /data/postgres  — PostgreSQL data directory
#   /data/uploads   — Map background image uploads

name: combat-tracker

services:

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: combat_db
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - /data/postgres:/var/lib/postgresql/data
    networks:
      - internal
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME} -d combat_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile.backend
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/combat_db
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JASYPT_PASSWORD: ${JASYPT_PASSWORD}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      UPLOAD_DIR: /data/uploads
    volumes:
      - /data/uploads:/data/uploads
    ports:
      - "127.0.0.1:8080:8080"   # localhost only — host nginx proxies inbound
    networks:
      - internal
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ../..
      dockerfile: infra/docker/Dockerfile.frontend
    ports:
      - "127.0.0.1:3000:80"     # localhost only — host nginx proxies inbound
    networks:
      - internal
    restart: unless-stopped

networks:
  internal:
    driver: bridge
```

**Step 2: Test locally (requires Docker + local PostgreSQL env vars)**

```bash
# From repo root
docker compose -f infra/docker/docker-compose.prod.yml build
```
Expected: All three images build without error.

```bash
docker compose -f infra/docker/docker-compose.prod.yml config
```
Expected: Prints the resolved config (no variable substitution errors for vars you've set).

**Step 3: Commit**

```bash
git add infra/docker/docker-compose.prod.yml
git commit -m "feat: add production Docker Compose with frontend service and env-var secrets"
```

---

## Part C — Terraform IaC

### Task 7: infra/modules/container-host

**Files:**
- Create: `infra/modules/container-host/variables.tf`
- Create: `infra/modules/container-host/main.tf`
- Create: `infra/modules/container-host/outputs.tf`
- Create: `infra/modules/container-host/nginx.conf.tpl`

**Context:** This module provisions a single VM, attaches a block volume, and runs a remote-exec provisioner that installs Docker, nginx, and Certbot on the host. It also uploads the nginx site config (rendered from a template with the domain name). This module is provider-specific to OCI but the interface (variables/outputs) is designed to be reusable. Future Azure module would have the same interface.

**Step 1: Create variables.tf**

```hcl
# infra/modules/container-host/variables.tf

variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "subnet_id" {
  description = "OCI subnet OCID for the VM's primary VNIC"
  type        = string
}

variable "block_volume_id" {
  description = "OCI block volume OCID to attach at /data"
  type        = string
}

variable "instance_shape" {
  description = "OCI compute shape"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  description = "Number of OCPUs (Always Free max: 4)"
  type        = number
  default     = 4
}

variable "memory_gb" {
  description = "Memory in GB (Always Free max: 24)"
  type        = number
  default     = 24
}

variable "image_id" {
  description = "OCI image OCID for Ubuntu 22.04 ARM (region-specific)"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key content (the full ssh-rsa ... string)"
  type        = string
}

variable "private_key_path" {
  description = "Path to private key file for provisioner SSH connection"
  type        = string
}

variable "display_name" {
  description = "Display name for the compute instance"
  type        = string
  default     = "combat-tracker"
}

variable "domain" {
  description = "Fully-qualified domain name pointing to this VM"
  type        = string
}
```

**Step 2: Create nginx.conf.tpl**

This template is uploaded to the host (not the Docker container) and handled by Certbot to add TLS:

```nginx
# /etc/nginx/sites-available/combat-tracker
# Managed by Terraform. Certbot will add TLS blocks below.

server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    # Certbot ACME challenge (used for initial cert + renewals)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Backend API
    location /api/ {
        proxy_pass         http://localhost:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # STOMP WebSocket upgrade
    location /ws {
        proxy_pass             http://localhost:8080;
        proxy_http_version     1.1;
        proxy_set_header       Upgrade    $http_upgrade;
        proxy_set_header       Connection "upgrade";
        proxy_set_header       Host       $host;
        proxy_read_timeout     3600s;
    }

    # Map image uploads
    location /uploads/ {
        proxy_pass         http://localhost:8080;
        proxy_set_header   Host $host;
    }

    # Angular SPA (served by the frontend Docker container)
    location / {
        proxy_pass         http://localhost:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

**Step 3: Create main.tf**

```hcl
# infra/modules/container-host/main.tf

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# ── Compute Instance ──────────────────────────────────────────────────────
resource "oci_core_instance" "this" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = var.display_name
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.ocpus
    memory_in_gbs = var.memory_gb
  }

  source_details {
    source_type = "image"
    source_id   = var.image_id
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}

# ── Block Volume Attachment ───────────────────────────────────────────────
resource "oci_core_volume_attachment" "data" {
  attachment_type = "paravirtualized"
  instance_id     = oci_core_instance.this.id
  volume_id       = var.block_volume_id
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

# ── Provisioner: Docker + nginx + Certbot + block volume mount ────────────
resource "null_resource" "provision" {
  depends_on = [oci_core_instance.this, oci_core_volume_attachment.data]

  # Re-run if instance or domain changes
  triggers = {
    instance_id = oci_core_instance.this.id
    domain      = var.domain
  }

  connection {
    type        = "ssh"
    host        = oci_core_instance.this.public_ip
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    timeout     = "10m"
  }

  # Upload rendered nginx site config
  provisioner "file" {
    content     = templatefile("${path.module}/nginx.conf.tpl", { domain = var.domain })
    destination = "/tmp/combat-tracker-nginx.conf"
  }

  provisioner "remote-exec" {
    inline = [
      # ── System packages ─────────────────────────────────────────────────
      "sudo apt-get update -q",
      "sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx",
      "sudo usermod -aG docker ubuntu",
      "sudo systemctl enable --now docker nginx",

      # ── OS firewall (OCI Ubuntu images have iptables rules) ─────────────
      "sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT",
      "sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT",
      "sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT",
      "sudo apt-get install -y iptables-persistent",
      "sudo netfilter-persistent save",

      # ── Block volume: format (first run only) and mount at /data ─────────
      # /dev/sdb is the paravirtualized block device name on OCI ARM.
      # mkfs will error if already formatted; || true ignores that on re-runs.
      "sudo mkfs.ext4 /dev/sdb || true",
      "sudo mkdir -p /data",
      "grep -q '/dev/sdb' /etc/fstab || echo '/dev/sdb /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab",
      "sudo mount -a",
      "sudo mkdir -p /data/postgres /data/uploads",
      "sudo chown -R ubuntu:ubuntu /data",

      # ── nginx site config ────────────────────────────────────────────────
      "sudo cp /tmp/combat-tracker-nginx.conf /etc/nginx/sites-available/combat-tracker",
      "sudo ln -sf /etc/nginx/sites-available/combat-tracker /etc/nginx/sites-enabled/combat-tracker",
      "sudo rm -f /etc/nginx/sites-enabled/default",
      "sudo nginx -t && sudo systemctl reload nginx",
    ]
  }
}
```

**Step 4: Create outputs.tf**

```hcl
# infra/modules/container-host/outputs.tf

output "public_ip" {
  description = "Public IP address of the compute instance"
  value       = oci_core_instance.this.public_ip
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.this.id
}
```

**Step 5: Validate module syntax**

```bash
cd infra/modules/container-host
terraform init
terraform validate
```
Expected: `Success! The configuration is valid.`

**Step 6: Commit**

```bash
git add infra/modules/container-host/
git commit -m "feat: add container-host Terraform module (OCI VM + block volume + Docker + nginx)"
```

---

### Task 8: infra/modules/postgres (convention doc module)

**Files:**
- Create: `infra/modules/postgres/variables.tf`
- Create: `infra/modules/postgres/main.tf`
- Create: `infra/modules/postgres/outputs.tf`

**Context:** PostgreSQL runs as a Docker container (not a managed cloud service — the free Autonomous DB has a 20-session limit and is over-engineered for this scale). This Terraform module is intentionally a no-op resource module — it documents the convention and outputs a connection string template so other modules can reference it. Future phases could swap this for a real managed DB resource without changing callers.

**Step 1: Create variables.tf**

```hcl
# infra/modules/postgres/variables.tf

variable "db_username" {
  description = "PostgreSQL username"
  type        = string
}

variable "db_password" {
  description = "PostgreSQL password (sensitive)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "combat_db"
}

variable "host" {
  description = "Hostname where PostgreSQL runs (Docker service name or IP)"
  type        = string
  default     = "postgres"
}

variable "port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}
```

**Step 2: Create main.tf**

```hcl
# infra/modules/postgres/main.tf
#
# PostgreSQL is self-hosted in a Docker container on the same VM.
# No cloud resources are provisioned here.
# This module exists to document the convention and provide a
# connection string output — swap for oci_database_autonomous_database
# or azurerm_postgresql_flexible_server in the future without changing callers.

terraform {
  required_version = ">= 1.6"
}
```

**Step 3: Create outputs.tf**

```hcl
# infra/modules/postgres/outputs.tf

output "jdbc_url" {
  description = "JDBC connection URL for Spring Boot (DB_URL env var)"
  value       = "jdbc:postgresql://${var.host}:${var.port}/${var.db_name}"
}

output "db_username" {
  description = "Database username (DB_USERNAME env var)"
  value       = var.db_username
}
```

**Step 4: Validate**

```bash
cd infra/modules/postgres
terraform init && terraform validate
```
Expected: `Success! The configuration is valid.`

**Step 5: Commit**

```bash
git add infra/modules/postgres/
git commit -m "feat: add postgres Terraform module (self-hosted Docker, documents convention)"
```

---

### Task 9: infra/providers/oracle

**Files:**
- Create: `infra/providers/oracle/versions.tf`
- Create: `infra/providers/oracle/variables.tf`
- Create: `infra/providers/oracle/main.tf`
- Create: `infra/providers/oracle/outputs.tf`
- Create: `infra/providers/oracle/terraform.tfvars.example`
- Create: `infra/.gitignore`

**Context:** This wires up the OCI-specific resources: VCN, subnet, internet gateway, route table, security list, block volume, and the compute instance (via the container-host module). All sensitive values come from `terraform.tfvars` (git-ignored). The Ubuntu ARM image OCID is looked up dynamically via a data source so it doesn't need to be updated when Oracle releases new images.

**Step 1: Create infra/.gitignore**

```gitignore
# Terraform state and secrets — never commit these
**/.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
.terraform.lock.hcl
```

Note: `terraform.tfvars.example` is NOT ignored (it's a template, not secrets).

**Step 2: Create versions.tf**

```hcl
# infra/providers/oracle/versions.tf

terraform {
  required_version = ">= 1.6"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
```

**Step 3: Create variables.tf**

```hcl
# infra/providers/oracle/variables.tf

variable "tenancy_ocid" {
  description = "OCI tenancy OCID (find in OCI Console → Profile → Tenancy)"
  type        = string
}

variable "user_ocid" {
  description = "OCI user OCID (find in OCI Console → Profile → User Settings)"
  type        = string
}

variable "fingerprint" {
  description = "API key fingerprint (find in OCI Console → User Settings → API Keys)"
  type        = string
}

variable "private_key_path" {
  description = "Local path to the OCI API private key PEM file"
  type        = string
  default     = "~/.oci/oci_api_key.pem"
}

variable "region" {
  description = "OCI region (e.g. eu-frankfurt-1, us-ashburn-1)"
  type        = string
}

variable "compartment_id" {
  description = "OCI compartment OCID (use tenancy OCID for root compartment)"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key content for VM access"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key for Terraform provisioner"
  type        = string
  default     = "~/.ssh/id_rsa"
}

variable "domain" {
  description = "Fully-qualified domain name that will point to the VM"
  type        = string
}

variable "db_username" {
  description = "PostgreSQL username"
  type        = string
  default     = "combat"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}
```

**Step 4: Create main.tf**

```hcl
# infra/providers/oracle/main.tf

# ── Find latest Ubuntu 22.04 ARM image in this region ────────────────────
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ── Networking ────────────────────────────────────────────────────────────
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  cidr_block     = "10.0.0.0/16"
  display_name   = "combat-tracker-vcn"
  dns_label      = "combatvcn"
}

resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  enabled        = true
  display_name   = "combat-tracker-igw"
}

resource "oci_core_default_route_table" "main" {
  manage_default_resource_id = oci_core_vcn.main.default_route_table_id

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

resource "oci_core_security_list" "main" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "combat-tracker-sl"

  # Allow all outbound
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 22; max = 22 }
  }

  # HTTP (needed for Certbot ACME challenge + redirect to HTTPS)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80; max = 80 }
  }

  # HTTPS
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 443; max = 443 }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.0.0/24"
  display_name      = "combat-tracker-subnet"
  dns_label         = "public"
  security_list_ids = [oci_core_security_list.main.id]
  route_table_id    = oci_core_vcn.main.default_route_table_id
}

# ── Block Volume (150 GB — boot vol is ~47 GB; total stays under 200 GB) ─
resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "combat-tracker-data"
  size_in_gbs         = 150
}

# ── Compute instance (via container-host module) ──────────────────────────
module "host" {
  source = "../../modules/container-host"

  compartment_id   = var.compartment_id
  subnet_id        = oci_core_subnet.public.id
  block_volume_id  = oci_core_volume.data.id
  image_id         = data.oci_core_images.ubuntu_arm.images[0].id
  ssh_public_key   = var.ssh_public_key
  private_key_path = var.ssh_private_key_path
  domain           = var.domain
  display_name     = "combat-tracker"

  instance_shape = "VM.Standard.A1.Flex"
  ocpus          = 4
  memory_gb      = 24
}

# ── Postgres module (self-hosted, documents convention) ───────────────────
module "postgres" {
  source      = "../../modules/postgres"
  db_username = var.db_username
  db_password = var.db_password
}
```

**Step 5: Create outputs.tf**

```hcl
# infra/providers/oracle/outputs.tf

output "vm_public_ip" {
  description = "Public IP of the compute instance — point your DNS A record here"
  value       = module.host.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh ubuntu@${module.host.public_ip}"
}

output "next_steps" {
  description = "What to do after terraform apply"
  value       = <<-EOT
    1. Point DNS: create an A record for ${var.domain} → ${module.host.public_ip}
    2. SSH:       ssh ubuntu@${module.host.public_ip}
    3. Clone:     git clone https://github.com/ivanlyhne/tabletop-combat-tracker
    4. Secrets:   cd tabletop-combat-tracker/infra/docker && cp .env.example .env && nano .env
    5. Start:     docker compose -f docker-compose.prod.yml up -d
    6. TLS cert:  sudo certbot --nginx -d ${var.domain} --email <your-email> --agree-tos --non-interactive
  EOT
}
```

**Step 6: Create terraform.tfvars.example**

```hcl
# infra/providers/oracle/terraform.tfvars.example
# Copy to terraform.tfvars and fill in your values.
# Find OCI credentials in: OCI Console → Profile → User Settings → API Keys

tenancy_ocid         = "ocid1.tenancy.oc1..xxxx"
user_ocid            = "ocid1.user.oc1..xxxx"
fingerprint          = "aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99"
private_key_path     = "~/.oci/oci_api_key.pem"
region               = "eu-frankfurt-1"
compartment_id       = "ocid1.tenancy.oc1..xxxx"   # same as tenancy for root compartment

ssh_public_key       = "ssh-rsa AAAAB3NzaC1yc2EAAA... your-public-key"
ssh_private_key_path = "~/.ssh/id_rsa"

domain               = "combat.yourdomain.com"

db_username          = "combat"
db_password          = "change-me-strong-password"
```

**Step 7: Validate Terraform**

```bash
cd infra/providers/oracle
terraform init
terraform validate
```
Expected: `Success! The configuration is valid.`

**Step 8: Dry-run plan (optional — requires OCI credentials)**

```bash
cp terraform.tfvars.example terraform.tfvars
# Fill in terraform.tfvars with real values, then:
terraform plan
```
Expected: Plan shows resources to create (VCN, subnet, IGW, route table, security list, block volume, compute instance). No errors.

**Step 9: Commit**

```bash
git add infra/providers/oracle/ infra/.gitignore
git commit -m "feat: add Oracle Cloud Terraform provider (VCN, subnet, A1 ARM VM, block volume)"
```

---

## Part D — Documentation

### Task 10: Update README.md with Deployment section

**Files:**
- Modify: `README.md`

**Context:** Per project convention, architecture designs and deployment overviews are always added to the root README. This adds a Deployment section with the architecture diagram, verified Always Free resource list, quick-start instructions, and full environment variable reference.

**Step 1: Add the Deployment section to README.md**

Open `README.md`. After the `## REST API Overview` section (and before or replacing any existing deployment notes), add:

```markdown
---

## Deployment

### Architecture

```
Internet (HTTPS :443 / HTTP :80)
        │
        ▼
  OCI VM — VM.Standard.A1.Flex (4 OCPU / 24 GB RAM) — Always Free ✅
  ┌────────────────────────────────────────────────────────────┐
  │  Host nginx  :80/:443  (Let's Encrypt cert via Certbot)    │
  │    ├── /api/**   → Spring Boot container  :8080            │
  │    ├── /ws       → Spring Boot container  :8080  (STOMP)   │
  │    ├── /uploads/ → Spring Boot container  :8080            │
  │    └── /**       → Angular SPA container  :3000            │
  │                                                            │
  │  Docker containers (internal ports only):                  │
  │    backend   127.0.0.1:8080   Spring Boot 3 / Java 21      │
  │    frontend  127.0.0.1:3000   nginx serving Angular SPA     │
  │    postgres  internal only    PostgreSQL 16                 │
  └────────────────────────────────────────────────────────────┘
        │
        ▼
  OCI Block Volume — 150 GB — Always Free ✅ (total ≤ 200 GB)
    /data/postgres/    PostgreSQL data directory
    /data/uploads/     Map background image uploads
```

**No load balancer** — OCI's free flexible LB is bandwidth-capped at 10 Mbps. nginx handles TLS directly with full VM NIC bandwidth.

### Oracle Cloud Always Free Resources Used

| Resource | Limit | Used |
|----------|-------|------|
| VM.Standard.A1.Flex | 4 OCPU / 24 GB total | 1 instance (4 OCPU / 24 GB) |
| Block Volume | 200 GB total | ~197 GB (47 GB boot + 150 GB data) |
| Outbound transfer | 10 TB/month | Well under for hobby scale |
| VCN + subnet | 2 free VCNs | 1 VCN |

All resources are **permanently free** (not trial credits).

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Terraform | ≥ 1.6 | [terraform.io](https://developer.hashicorp.com/terraform/install) |
| OCI CLI (optional) | any | [docs.oracle.com](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm) |
| OCI API key pair | — | OCI Console → User Settings → API Keys → Add |
| Domain name | — | Any registrar; create A record → VM public IP |

### Quick Start (Oracle Cloud)

```bash
# 1. Configure OCI credentials
mkdir -p ~/.oci
# Upload your public key in OCI Console → User Settings → API Keys
# Download the config snippet and save to ~/.oci/config

# 2. Provision infrastructure
cd infra/providers/oracle
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars          # fill in OCIDs, SSH key, domain, DB password
terraform init
terraform apply                # creates VM + block volume + networking (~3 min)

# 3. Note the output
# vm_public_ip = "xxx.xxx.xxx.xxx"
# Point your domain's A record to this IP, then wait for DNS propagation

# 4. SSH into the VM
ssh ubuntu@<vm_public_ip>

# 5. Clone repo + configure secrets
git clone https://github.com/ivanlyhne/tabletop-combat-tracker
cd tabletop-combat-tracker/infra/docker
cp .env.example .env
nano .env    # fill in JWT_SECRET, JASYPT_PASSWORD, DB_PASSWORD, ALLOWED_ORIGINS, DOMAIN

# 6. Start the stack
docker compose -f docker-compose.prod.yml up -d

# 7. Issue TLS certificate (free, auto-renews every 90 days)
sudo certbot --nginx -d your-domain.com --email you@example.com --agree-tos --non-interactive

# 8. Verify
curl https://your-domain.com/actuator/health   # → {"status":"UP"}
```

### Environment Variables Reference

| Variable | Required | Dev default | Prod value |
|----------|----------|-------------|------------|
| `JWT_SECRET` | ✅ | none (must set) | `$(openssl rand -base64 48)` |
| `JASYPT_PASSWORD` | ✅ | none (must set) | `$(openssl rand -base64 32)` |
| `DB_URL` | ✅ | `jdbc:postgresql://localhost:5432/gm_combat` | `jdbc:postgresql://postgres:5432/combat_db` |
| `DB_USERNAME` | ✅ | `gm_user` | `combat` |
| `DB_PASSWORD` | ✅ | `gm_pass` | strong password |
| `ALLOWED_ORIGINS` | ✅ | `http://localhost:4200` | `https://your-domain.com` |
| `UPLOAD_DIR` | ❌ | `uploads` (local dir) | `/data/uploads` |
| `DOMAIN` | prod only | — | `combat.yourdomain.com` |
| `CERTBOT_EMAIL` | prod only | — | `you@example.com` |

### Update Deployment

```bash
# On the VM
cd tabletop-combat-tracker
git pull
docker compose -f infra/docker/docker-compose.prod.yml build backend frontend
docker compose -f infra/docker/docker-compose.prod.yml up -d --no-deps backend frontend
```

### Backup

OCI block volume snapshots cover both the PostgreSQL data dir and uploaded map images in a single operation.
OCI Console → Storage → Block Volumes → combat-tracker-data → Create Manual Backup
5 manual backups are included free.
```

**Step 2: Verify README renders correctly**

Open `README.md` in your editor and check the ASCII art diagram isn't broken by triple-backtick nesting (the inner code blocks need to use ` ``` ` inside a markdown code block, which may need adjustment depending on the renderer — check GitHub preview).

**Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: add Deployment section to README with architecture diagram and Oracle quick-start"
git push origin main
```

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] `cd backend && ./mvnw spring-boot:run` — starts, health returns 200
- [ ] `curl http://localhost:8080/actuator/health` — `{"status":"UP"}` with no auth
- [ ] `docker build -f infra/docker/Dockerfile.backend -t combat-backend:test .` — builds
- [ ] `docker build -f infra/docker/Dockerfile.frontend -t combat-frontend:test .` — builds
- [ ] `docker compose -f infra/docker/docker-compose.prod.yml build` — all three images build
- [ ] `cd infra/providers/oracle && terraform validate` — `Success!`
- [ ] README.md Deployment section renders correctly on GitHub
