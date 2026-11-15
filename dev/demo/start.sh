#!/bin/sh
# Entrypoint for the vaultz-demo container (docker compose --profile demo up).
set -e

# The container keeps its own node_modules volume; reinstall when the lockfile
# changes.
if ! cmp -s package-lock.json node_modules/.demo-package-lock.json 2>/dev/null; then
  npm ci
  cp package-lock.json node_modules/.demo-package-lock.json
fi

npx prisma generate
npx prisma migrate deploy
npx tsx dev/demo/seed.ts

echo
echo "VaultZ demo: open http://vaultz.sga.localhost:3001 and pick a role."
echo
exec npx next dev --turbopack -H 0.0.0.0 -p 3001
