FROM nginxinc/nginx-unprivileged:1.31-alpine

# Pull patched Alpine packages (fixes the OpenSSL and brotli CVEs Trivy found in the base image).
USER root
RUN apk upgrade --no-cache
USER 101

COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/errors /var/www/errors
COPY public /var/www/public

EXPOSE 8080