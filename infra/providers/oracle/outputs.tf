# infra/providers/oracle/outputs.tf

output "vm_public_ip" {
  description = "Public IP of the compute instance -- point your DNS A record here"
  value       = module.host.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh ubuntu@${module.host.public_ip}"
}

output "next_steps" {
  description = "What to do after terraform apply"
  value       = <<-EOT
    1. Point DNS: create an A record for ${var.domain} -> ${module.host.public_ip}
    2. SSH:       ssh ubuntu@${module.host.public_ip}
    3. Clone:     git clone https://github.com/ivanlyhne/tabletop-combat-tracker
    4. Secrets:   cd tabletop-combat-tracker/infra/docker && cp .env.example .env && nano .env
    5. Start:     docker compose -f docker-compose.prod.yml up -d
    6. TLS cert:  sudo certbot --nginx -d ${var.domain} --email <your-email> --agree-tos --non-interactive
  EOT
}
