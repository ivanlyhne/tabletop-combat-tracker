# infra/providers/oracle/variables.tf

variable "tenancy_ocid" {
  description = "OCI tenancy OCID (find in OCI Console -> Profile -> Tenancy)"
  type        = string
}

variable "user_ocid" {
  description = "OCI user OCID (find in OCI Console -> Profile -> User Settings)"
  type        = string
}

variable "fingerprint" {
  description = "API key fingerprint (find in OCI Console -> User Settings -> API Keys)"
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
