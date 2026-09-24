# =============================================================
# TDA Pekanbaru 9.0 — Frontend proxy (Nginx 1.27)
# Base directory di Coolify: /frontend  |  Build pack: Dockerfile  |  Port: 80
# Satu-satunya komponen dengan domain publik (tdapekanbaru.id). Semua path diproksi
# ke aplikasi Next.js (SSR + API) lewat alias jaringan internal Coolify.
# Env runtime: BACKEND_URL (contoh: http://backend-tdapku:3000), NGINX_PORT, CLIENT_MAX_BODY_SIZE,
#              APP_HOST + PUBLIC_HOST (opsional; mode ketat: backoffice di app.tdapekanbaru.id, publik di tdapekanbaru.id)
# =============================================================
FROM nginx:1.27-alpine
ENV BACKEND_URL=http://backend-tdapku:3000 \
    NGINX_PORT=80 \
    CLIENT_MAX_BODY_SIZE=20m \
    APP_HOST="" \
    PUBLIC_HOST=""
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/05-normalize-backend-url.envsh /docker-entrypoint.d/05-normalize-backend-url.envsh
COPY nginx/10-backoffice-host.envsh /docker-entrypoint.d/10-backoffice-host.envsh
COPY nginx/16-resolver-fallback.envsh /docker-entrypoint.d/16-resolver-fallback.envsh
RUN chmod +x /docker-entrypoint.d/05-normalize-backend-url.envsh /docker-entrypoint.d/10-backoffice-host.envsh /docker-entrypoint.d/16-resolver-fallback.envsh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${NGINX_PORT}/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
