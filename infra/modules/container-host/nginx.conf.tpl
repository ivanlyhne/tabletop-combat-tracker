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
