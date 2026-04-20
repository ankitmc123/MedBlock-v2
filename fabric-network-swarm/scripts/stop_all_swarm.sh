#!/bin/bash
set -euxo pipefail

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PC1_IP="100.124.176.94"
PC2_IP="100.83.121.98"
PC3_IP="100.117.138.55"
PC2_USER="rajput_mt"
PC3_USER="ronit"

echo "--- 1. Stopping Distributed App Processes ---"
# Kill Backend/Frontend on PC1
sudo fuser -k 4100/tcp || true
sudo fuser -k 5174/tcp || true

# Kill IPFS on PC1
pkill -f ipfs || true
rm -f /home/ankit/.ipfs/repo.lock || true

echo "--- 2. Removing Docker Stacks ---"
docker stack rm ehrswarm-ca ehrswarm-orderer ehrswarm-peer0 ehrswarm-peer1 ehrswarm-peer2 || true
echo "Waiting for stack removal (15s)..."
sleep 15

echo "--- 3. Wiping Persistent Data Across Cluster ---"

# Wipe PC1
echo "Wiping PC1 data..."
sudo rm -rf "$ROOT_DIR/data/"*
rm -f "$ROOT_DIR/mychannel.block" "$ROOT_DIR/ehr.tar.gz"

# Wipe PC2
echo "Wiping PC2 data..."
ssh -o BatchMode=yes "$PC2_USER@$PC2_IP" "sudo rm -rf /home/$PC2_USER/fabric-network/fabric-network-swarm/data/*; rm -f /home/$PC2_USER/fabric-network/fabric-network-swarm/*.block /home/$PC2_USER/fabric-network/fabric-network-swarm/*.tar.gz" || echo "Failed to reach PC2"

# Wipe PC3
echo "Wiping PC3 data..."
ssh -o BatchMode=yes "$PC3_USER@$PC3_IP" "sudo rm -rf /home/$PC3_USER/fabric-network/fabric-network-swarm/data/*; rm -f /home/$PC3_USER/fabric-network/fabric-network-swarm/*.block /home/$PC3_USER/fabric-network/fabric-network-swarm/*.tar.gz" || echo "Failed to reach PC3"

echo "--- 4. Final Cleanup of Orphan Containers ---"
docker container prune -f || true
docker volume prune -f || true

echo "--- SYSTEM FULLY STOPPED AND CLEANED ---"
echo "You can now run ./scripts/start_all_swarm.sh for a fresh start."
