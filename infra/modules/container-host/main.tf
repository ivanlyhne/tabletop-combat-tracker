# infra/modules/container-host/main.tf

terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# -- Compute Instance --
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

# -- Block Volume Attachment --
resource "oci_core_volume_attachment" "data" {
  attachment_type = "paravirtualized"
  instance_id     = oci_core_instance.this.id
  volume_id       = var.block_volume_id
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

# -- Provisioner: Docker + nginx + Certbot + block volume mount --
resource "null_resource" "provision" {
  depends_on = [oci_core_instance.this, oci_core_volume_attachment.data]

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

  provisioner "file" {
    content     = templatefile("${path.module}/nginx.conf.tpl", { domain = var.domain })
    destination = "/tmp/combat-tracker-nginx.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update -q",
      "sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx",
      "sudo usermod -aG docker ubuntu",
      "sudo systemctl enable --now docker nginx",
      "sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT",
      "sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT",
      "sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT",
      "sudo apt-get install -y iptables-persistent",
      "sudo netfilter-persistent save",
      "sudo mkfs.ext4 /dev/sdb || true",
      "sudo mkdir -p /data",
      "grep -q '/dev/sdb' /etc/fstab || echo '/dev/sdb /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab",
      "sudo mount -a",
      "sudo mkdir -p /data/postgres /data/uploads",
      "sudo chown -R ubuntu:ubuntu /data",
      "sudo cp /tmp/combat-tracker-nginx.conf /etc/nginx/sites-available/combat-tracker",
      "sudo ln -sf /etc/nginx/sites-available/combat-tracker /etc/nginx/sites-enabled/combat-tracker",
      "sudo rm -f /etc/nginx/sites-enabled/default",
      "sudo nginx -t && sudo systemctl reload nginx",
    ]
  }
}
