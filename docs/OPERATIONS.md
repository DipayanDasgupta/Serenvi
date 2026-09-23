# SERENVI — Operations Handbook

How to access and manage the full project and live site from a fresh
OpenCode instance. Secrets are NEVER in this repo — see "Secrets" below.

## 1. Project map

| What | Where |
|---|---|
| Code (this repo) | `github.com/DipayanDasgupta/Serenvi`, branch `main` |
| Local workspace | `~/aryamandal/Serenvi` (frontend root; backend in `backend/`) |
| Live site | `https://serenvi.app` (EC2) and `https://serenvi-seven.vercel.app` (Vercel, auto-deploys on push to `main`) |
| Server app dir | `/opt/serenvi/Serenvi` on the EC2 host |

## 2. AWS / EC2 access

- Instance: `i-07234d59f339c5b67`, zone `ap-south-1a`, host `3.110.30.17`, user `ubuntu`.
- No permanent SSH key. Mint a 60-second key per session with EC2 Instance Connect:

```bash
mkdir -p /tmp/opencode && rm -f /tmp/opencode/eic_key*
ssh-keygen -t ed25519 -f /tmp/opencode/eic_key -N "" -q
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-07234d59f339c5b67 --availability-zone ap-south-1a \
  --instance-os-user ubuntu --ssh-public-key file:///tmp/opencode/eic_key.pub
ssh -i /tmp/opencode/eic_key -o StrictHostKeyChecking=no ubuntu@3.110.30.17
```

- The key authorizes ONE connection burst and expires fast: re-run
  `send-ssh-public-key` before every new `ssh` invocation. Already-open
  connections stay alive.
- Requires AWS CLI credentials for an IAM principal allowed to call
  `ec2-instance-connect:SendSSHPublicKey` on this instance.

## 3. Docker services (on EC2)

```bash
cd /opt/serenvi/Serenvi
sudo docker ps --format '{{.Names}} {{.Status}}' | grep serenvi
# serenvi-db-1 (postgres), serenvi-backend-1 (NestJS :3001), serenvi-frontend-1 (Next.js :3000)
sudo docker logs --tail 50 serenvi-backend-1
sudo docker logs --tail 50 serenvi-frontend-1
```

Postgres (no password prompt needed from inside the db container):

```bash
sudo docker exec serenvi-db-1 psql -U serenvi -d serenvi -t -c 'SELECT count(*) FROM "Product";'
```

## 4. Deploy workflow

```bash
# local: commit, then push (see §6 quirk)
git push origin main
# on EC2:
cd /opt/serenvi/Serenvi && sudo git pull --ff-only
# long builds (>5 min): run detached, then poll
sudo nohup docker compose up -d --build > /tmp/deploy.log 2>&1 &
tail -n 5 /tmp/deploy.log
sudo docker ps --format '{{.Names}} {{.Status}}' | grep serenvi
```

Verify after deploy:

```bash
for p in / /products /wallet/deposit /admin/deposits /cart/checkout; do
  printf "%s: " "$p"
  curl -s -o /tmp/pg.html -w "%{http_code}\n" "https://serenvi.app$p"
done
curl -s "https://serenvi.app/api/products?take=1" | python3 -c "import json,sys; print(json.load(sys.stdin).get('total'))"
```

## 5. Database operations

Backups live in `/opt/serenvi/` (`backup-*.sql`). Always back up first:

```bash
sudo docker exec serenvi-db-1 pg_dump -U serenvi -d serenvi | sudo tee /opt/serenvi/backup-$(date +%F-%H%M).sql > /dev/null
```

Useful checks:

```bash
# product count + local-image coverage
sudo docker exec serenvi-db-1 psql -U serenvi -d serenvi -t -c \
'SELECT count(*), count(*) FILTER (WHERE "imageUrl" LIKE '"'"'/products/%'"'"') FROM "Product";'
# who is admin (exactly one row expected)
sudo docker exec serenvi-db-1 psql -U serenvi -d serenvi -t -c \
'SELECT email FROM "User" WHERE "isAdmin" = true;'
```

Admin account: `aryamanmandal0201@gmail.com`. Grant with:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'aryamanmandal0201@gmail.com';
```

After any admin-flag change the person must sign out and sign back in
once (their cached login token predates the flag).

## 6. Git push quirk (this environment)

A stale `GITHUB_TOKEN` env var belongs to a different GitHub identity and
causes `403` pushes. Always push with it unset:

```bash
env -u GITHUB_TOKEN -u GH_TOKEN git push origin main
```

## 7. Key API contracts (don't break)

- `POST /api/sales` is WALLET-ONLY (`paymentMethod: "WALLET"`); anything else → 400.
- Wallet deposits are PENDING until approved at `/admin/deposits`
  (`POST /api/wallet/admin/deposits/:id/approve|reject`, admin-only).
- `/api/admin/stats` returns `{ totalUsers, totalSales, totalOrders,
  totalCommissions, recentOrders, depositsSummary, recentDeposits }`.
- Frontend backend-token cache and SWR keys are scoped per Clerk user —
  never revert to a single global cache slot (causes cross-account data leaks).

## 8. Product catalog imports

- Source file: `ajio_90pct_sale_with_gender.xlsx` (repo root). Column A is
  junk JSON fragments; the catalog is columns B–J, names rebuilt from the
  buy-link slug. Fragment-only extras live in `backend/ajio_extra_products.json`.
- `backend/import-ajio.py` → parses, downloads/compresses images to
  `public/products/`, writes `/tmp/opencode/ajio-seed.sql`.
- `backend/import-ajio-extra.py` (+ `backend/import_ajio_lib.py`) → same for extras.
- Apply SQL: `sudo docker exec -i serenvi-db-1 psql -U serenvi -d serenvi -v ON_ERROR_STOP=1 < seed.sql`
- Commit any new `public/products/*` images (they serve both EC2 and Vercel).

## 9. Secrets (read this)

Actual credentials (AWS keys, DB password, JWT/Clerk/SMTP secrets, server
`.env` at `/opt/serenvi/Serenvi/.env`) are intentionally absent from this
repo. Hand them to a new operator through a password manager or encrypted
channel — never commit them, never paste them into chat logs that get saved.
If a secret ever touches git history, rotate it immediately (it is compromised).
