# infra/modules/container-host/outputs.tf

output "public_ip" {
  description = "Public IP address of the compute instance"
  value       = oci_core_instance.this.public_ip
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.this.id
}
