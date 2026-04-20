# EHR Swarm Project

This is an isolated Docker Swarm workspace created from the working local EHR project.

Goals:
- keep the current local project under `/home/ankit/fabric-network` untouched
- build and test the multi-PC Docker Swarm deployment separately
- avoid collisions in ports, logs, scripts, runtime files, and Docker naming

Isolation rules:
- local project remains the source of truth for the existing single-PC setup
- this project uses its own config, compose files, runtime files, and docs
- Swarm host-published ports are shifted away from the current local stack
- backend and frontend default to `4100` and `5174`
- Fabric manager-published ports default to `17050`, `17051`, `17054`
- overlay network name is `fabric-swarm-net`
- common node-local mount path is `/srv/fabric-network-swarm`

Project layout:
- `app/`: copied app source for Swarm-specific configuration
- `chaincode/`: copied chaincode source
- `compose/`: Swarm stack files
- `config/`: env and connection profile templates
- `scripts/`: Swarm helper scripts
- `docs/`: rollout notes and execution plan
- `runtime/`: logs and pid files for this project only

Important:
- do not point this project at the current local `wallet` directory
- do not reuse the current root startup scripts
- do not deploy these stack files with the same ports as the local project
- on every machine, make the project available at `/srv/fabric-network-swarm`

Start here:
- read `docs/00-runbook-index.md`
- read `docs/isolation-plan.md`
- fill values in `config/swarm.env.example`
- update IPs and absolute paths before deployment
