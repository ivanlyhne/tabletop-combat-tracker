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
