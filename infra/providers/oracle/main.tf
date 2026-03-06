# infra/providers/oracle/main.tf

# -- Find latest Ubuntu 22.04 ARM image in this region --
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

# -- Networking --
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

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 22; max = 22 }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80; max = 80 }
  }

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

# -- Block Volume (150 GB -- boot vol ~47 GB; total stays under 200 GB Always Free limit) --
resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "combat-tracker-data"
  size_in_gbs         = 150
}

# -- Compute instance (via container-host module) --
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

# -- Postgres module (self-hosted, documents convention) --
module "postgres" {
  source      = "../../modules/postgres"
  db_username = var.db_username
  db_password = var.db_password
}
