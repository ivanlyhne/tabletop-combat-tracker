# infra/modules/postgres/outputs.tf

output "jdbc_url" {
  description = "JDBC connection URL for Spring Boot (DB_URL env var)"
  value       = "jdbc:postgresql://${var.host}:${var.port}/${var.db_name}"
}

output "db_username" {
  description = "Database username (DB_USERNAME env var)"
  value       = var.db_username
}
