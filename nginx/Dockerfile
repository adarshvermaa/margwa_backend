FROM nginx:1.25-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory for certificates
RUN mkdir -p /etc/nginx/ssl

# Copy SSL certificates (for development, generate self-signed)
# For production, mount real certificates as secrets
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/margwa.key \
    -out /etc/nginx/ssl/margwa.crt \
    -subj "/C=US/ST=State/L=City/O=Margwa/CN=margwa.local"

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
