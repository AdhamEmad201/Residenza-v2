FROM php:8.3-cli-bookworm

# Install system dependencies and required PHP extensions (PostgreSQL, GD with WebP/JPEG/PNG, BCMath, Zip)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libjpeg62-turbo-dev \
    libwebp-dev \
    libfreetype6-dev \
    libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        gd \
        bcmath \
        zip \
        mbstring \
        fileinfo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies first (layer caching)
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

# Copy application source
COPY . .

# Run post-autoload scripts and ensure storage directories exist with proper permissions
RUN composer dump-autoload --optimize --no-dev \
    && mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Create container entrypoint script (LF line endings guaranteed)
RUN printf '#!/bin/sh\nset -e\n\nphp artisan storage:link --force || true\nphp artisan migrate --force\nphp artisan db:seed --force\nphp artisan config:cache\nphp artisan route:cache\n\nexec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"\n' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
