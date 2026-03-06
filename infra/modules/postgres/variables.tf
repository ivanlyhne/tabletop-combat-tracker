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
