#!/usr/bin/env bash
# Удаление всех контейнеров, образов и томов для uz-superapp и backend

set -e

echo "=== Останавливаем и удаляем контейнеры (backend, uz-superapp) ==="
for name in backend uz-superapp mongodb redis minio nginx mongo-init; do
  ids=$(docker ps -a -q --filter "name=$name" 2>/dev/null) || true
  [ -n "$ids" ] && echo "$ids" | xargs docker rm -f
done

echo "=== Удаляем образы uz-superapp и backend ==="
docker rmi -f uz-superapp-backend:latest 2>/dev/null || true
docker rmi -f uz-superapp-admin-super:latest 2>/dev/null || true
docker rmi -f uz-superapp-admin-partner:latest 2>/dev/null || true
for img in $(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E '^uz-superapp-|^backend' || true); do
  docker rmi -f "$img" 2>/dev/null || true
done

echo "=== Удаляем тома uz-superapp и backend ==="
for vol in uz-superapp_miniodata uz-superapp_mongo1data uz-superapp_mongo2data uz-superapp_mongo3data uz-superapp_redisdata backend_postgres_data backend_redis_data; do
  docker volume rm -f "$vol" 2>/dev/null || true
done
for vol in $(docker volume ls -q 2>/dev/null | grep -E '^uz-superapp_|^backend_' || true); do
  docker volume rm -f "$vol" 2>/dev/null || true
done

echo "=== Готово ==="
