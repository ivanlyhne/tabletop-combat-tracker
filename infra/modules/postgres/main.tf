# infra/modules/postgres/main.tf
#
# PostgreSQL is self-hosted in a Docker container on the same VM.
# No cloud resources are provisioned here.
# This module exists to document the convention and provide a
# connection string output -- swap for oci_database_autonomous_database
# or azurerm_postgresql_flexible_server in the future without changing callers.

terraform {
  required_version = ">= 1.6"
}
