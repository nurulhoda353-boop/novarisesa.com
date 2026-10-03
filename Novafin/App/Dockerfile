FROM debian:bookworm-slim AS builder
# Pinned to the exact Flutter version this app was built/verified against
# (see pubspec.yaml's `sdk: ^3.13.4` constraint) rather than a third-party
# mirror image's "stable" tag, which lagged behind (resolved to Dart 3.12.0
# and failed `flutter pub get` the first time this was deployed).
ARG FLUTTER_VERSION=3.47.5
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates xz-utils git \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" \
       -o /tmp/flutter.tar.xz \
    && tar -xf /tmp/flutter.tar.xz -C /usr/local \
    && rm /tmp/flutter.tar.xz
ENV PATH="/usr/local/flutter/bin:${PATH}"
RUN git config --global --add safe.directory /usr/local/flutter \
    && flutter config --no-analytics --enable-web \
    && flutter precache --web

WORKDIR /app
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get
COPY . .
ARG API_BASE_URL=https://api.novarisesa.com/api/v1
RUN flutter build web --release --dart-define=API_BASE_URL=$API_BASE_URL

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
