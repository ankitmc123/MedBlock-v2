#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/app/backend"
MANAGER_DIR="$ROOT_DIR/app/manager"
BILLING_DIR="$ROOT_DIR/app/billing"
INVENTORY_DIR="$ROOT_DIR/app/inventory"
PATIENT_DIR="$ROOT_DIR/app/patient"
FRONTEND_DIR="$ROOT_DIR/app/frontend"   # legacy
RUNTIME_DIR="$ROOT_DIR/runtime"

# ── Fixed IPs (Tailscale / LAN) ───────────────────────────────────────────────
PC1_IP="100.124.176.94"    # Manager / swarm master (this machine)

# ── Ports ─────────────────────────────────────────────────────────────────────
BACKEND_PORT="${SWARM_BACKEND_PORT:-3000}"
MANAGER_PORT="${SWARM_MANAGER_PORT:-3001}"
BILLING_PORT="${SWARM_BILLING_PORT:-3002}"
INVENTORY_PORT="${SWARM_INVENTORY_PORT:-3003}"
PATIENT_PORT="${SWARM_PATIENT_PORT:-3004}"
LEGACY_FRONTEND_PORT="${SWARM_FRONTEND_PORT:-5174}"

# IPFS API runs locally on PC1 (daemon defaults to 127.0.0.1)
IPFS_API="${SWARM_IPFS_API:-http://127.0.0.1:5001/api/v0}"
IPFS_GATEWAY_URL="${SWARM_IPFS_GATEWAY_URL:-http://${PC1_IP}:8080/ipfs}"

mkdir -p "$RUNTIME_DIR"

# ── Helpers ───────────────────────────────────────────────────────────────────
kill_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

# Kill old ports if occupied
for PORT in $BACKEND_PORT $MANAGER_PORT $BILLING_PORT $INVENTORY_PORT $PATIENT_PORT $LEGACY_FRONTEND_PORT 4100; do
  sudo fuser -k "${PORT}/tcp" 2>/dev/null || true
done

# ── Backend ───────────────────────────────────────────────────────────────────
echo "▶ Starting Backend on ${PC1_IP}:${BACKEND_PORT} …"
cd "$BACKEND_DIR"
kill_pid_file "$RUNTIME_DIR/backend.pid"
PORT="$BACKEND_PORT" \
HOST="0.0.0.0" \
IPFS_API="$IPFS_API" \
FABRIC_CONNECTION_PROFILE="connection.swarm.template.json" \
FABRIC_DISCOVERY_AS_LOCALHOST="false" \
FABRIC_DISCOVERY_ENABLED="true" \
setsid npm start </dev/null > "$RUNTIME_DIR/backend.log" 2>&1 &
echo $! > "$RUNTIME_DIR/backend.pid"

# ── Manager Dashboard (port 3001) ─────────────────────────────────────────────
echo "▶ Starting Manager UI  on ${PC1_IP}:${MANAGER_PORT} …"
cd "$MANAGER_DIR"
kill_pid_file "$RUNTIME_DIR/manager.pid"
setsid npm run dev -- --host 0.0.0.0 --port "$MANAGER_PORT" </dev/null > "$RUNTIME_DIR/manager.log" 2>&1 &
echo $! > "$RUNTIME_DIR/manager.pid"

# ── Billing Dashboard (port 3002) ─────────────────────────────────────────────
echo "▶ Starting Billing UI  on ${PC1_IP}:${BILLING_PORT} …"
cd "$BILLING_DIR"
kill_pid_file "$RUNTIME_DIR/billing.pid"
setsid npm run dev -- --host 0.0.0.0 --port "$BILLING_PORT" </dev/null > "$RUNTIME_DIR/billing.log" 2>&1 &
echo $! > "$RUNTIME_DIR/billing.pid"

# ── Inventory Dashboard (port 3003) ──────────────────────────────────────────
echo "▶ Starting Inventory UI on ${PC1_IP}:${INVENTORY_PORT} …"
cd "$INVENTORY_DIR"
kill_pid_file "$RUNTIME_DIR/inventory.pid"
setsid npm run dev -- --host 0.0.0.0 --port "$INVENTORY_PORT" </dev/null > "$RUNTIME_DIR/inventory.log" 2>&1 &
echo $! > "$RUNTIME_DIR/inventory.pid"

# ── Patient Dashboard (port 3004) ──────────────────────────────────────────
echo "▶ Starting Patient UI on ${PC1_IP}:${PATIENT_PORT} …"
cd "$PATIENT_DIR"
kill_pid_file "$RUNTIME_DIR/patient.pid"
setsid npm run dev -- --host 0.0.0.0 --port "$PATIENT_PORT" </dev/null > "$RUNTIME_DIR/patient.log" 2>&1 &
echo $! > "$RUNTIME_DIR/patient.pid"

# ── Legacy Frontend (backward compat) ────────────────────────────────────────
if [[ -f "$FRONTEND_DIR/package.json" ]]; then
  echo "▶ Starting Legacy UI   on ${PC1_IP}:${LEGACY_FRONTEND_PORT} …"
  cd "$FRONTEND_DIR"
  kill_pid_file "$RUNTIME_DIR/frontend.pid"
  VITE_API_BASE_URL="http://${PC1_IP}:${BACKEND_PORT}" \
  VITE_IPFS_GATEWAY_URL="$IPFS_GATEWAY_URL" \
  setsid npm run dev -- --host 0.0.0.0 --port "$LEGACY_FRONTEND_PORT" </dev/null > "$RUNTIME_DIR/frontend.log" 2>&1 &
  echo $! > "$RUNTIME_DIR/frontend.pid"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Pharmacy MedBlock v2.0 — All Services Up            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Backend API    → http://%-36s║\n" "${PC1_IP}:${BACKEND_PORT}"
printf "║  Manager  UI    → http://%-36s║\n" "${PC1_IP}:${MANAGER_PORT}"
printf "║  Billing  UI    → http://%-36s║\n" "${PC1_IP}:${BILLING_PORT}"
printf "║  Inventory UI   → http://%-36s║\n" "${PC1_IP}:${INVENTORY_PORT}"
printf "║  Patient   UI   → http://%-36s║\n" "${PC1_IP}:${PATIENT_PORT}"
printf "║  Legacy   UI    → http://%-36s║\n" "${PC1_IP}:${LEGACY_FRONTEND_PORT}"
printf "║  IPFS Gateway   → http://%-36s║\n" "${PC1_IP}:8080/ipfs"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Logs: $RUNTIME_DIR/{backend,manager,billing,inventory}.log"
