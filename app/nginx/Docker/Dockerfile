# Unprivileged nginx: runs as a non-root user and listens on 8080,
# so it works with cap_drop: ALL and a read-only root filesystem.
# Config, error pages and static files are baked in, so there are no bind mounts
# from a repo checkout (an ASG instance has no repo).
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/errors /var/www/errors
COPY public /var/www/public

EXPOSE 8080