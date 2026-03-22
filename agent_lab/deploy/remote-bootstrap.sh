#!/usr/bin/env bash
# Run ON the EC2 instance (Amazon Linux 2023 or Ubuntu). Installs Python venv, deps, systemd service.
set -euo pipefail

APP_ROOT="${APP_ROOT:-$HOME/agentlab}"
AGENT_LAB_DIR="$APP_ROOT/agent_lab"
VENV="$AGENT_LAB_DIR/.venv"

if [[ ! -f "$AGENT_LAB_DIR/pyproject.toml" ]]; then
  echo "Missing $AGENT_LAB_DIR/pyproject.toml — run sync-to-ec2.sh from your laptop first." >&2
  exit 1
fi

echo "→ Install Python build deps..."
if command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y python3 python3-pip python3-devel gcc 2>/dev/null || true
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip python3-dev build-essential
fi

PY=python3
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "python3 not found" >&2
  exit 1
fi

echo "→ Create venv + install agent-lab..."
"$PY" -m venv "$VENV"
# shellcheck source=/dev/null
source "$VENV/bin/activate"
pip install --upgrade pip wheel
pip install "$AGENT_LAB_DIR"

echo "→ Install systemd unit..."
sudo tee /etc/systemd/system/agentlab-api.service > /dev/null <<EOF
[Unit]
Description=Agent Lab FastAPI API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$AGENT_LAB_DIR
EnvironmentFile=-$APP_ROOT/.env
Environment=AGENTLAB_PROJECTS_ROOT=$APP_ROOT/target_projects
ExecStart=$VENV/bin/python -m uvicorn agent_lab_core.server:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable agentlab-api
sudo systemctl restart agentlab-api

sleep 2
if sudo systemctl is-active --quiet agentlab-api; then
  echo "→ agentlab-api is active."
  curl -sS "http://127.0.0.1:8000/health" || true
  echo
  echo "Public: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo YOUR_IP):8000/health"
else
  echo "Service failed — check: sudo journalctl -u agentlab-api -n 50 --no-pager" >&2
  exit 1
fi
