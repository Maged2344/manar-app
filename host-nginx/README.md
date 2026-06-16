# Host-Level Nginx Reverse Proxy Configuration
# Install on the VM: sudo apt install nginx
# Place these files in /etc/nginx/sites-available/ and symlink to sites-enabled/

# This nginx runs on the HOST (not in Docker) and routes traffic
# to the correct app container based on domain name.

# DevopsAcademy: 127.0.0.1:8080 (internal container port)
# Manar App:     127.0.0.1:8090 (internal container port)
