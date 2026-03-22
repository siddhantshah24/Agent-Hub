#!/usr/bin/env bash
# Run from workspace root (directory containing agent_lab/ and target_projects/).
set -euo pipefail

SSH_KEY="${SSH_KEY:-}"
EC2_HOST="${EC2_HOST:-ubuntu@YOUR_EC2_PUBLIC_IP}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -z "${SSH_KEY}" || ! -f "$SSH_KEY" ]]; then
  echo "Set SSH_KEY to your .pem (e.g. agl.pem). Amazon Linux: ec2-user@IP. Ubuntu: ubuntu@IP" >&2
  echo "Example: export SSH_KEY=\"/path/to/agentlab.pem\"" >&2
  exit 1
fi
chmod 400 "$SSH_KEY" 2>/dev/null || true

# Quote identity file path for rsync -e (handles spaces in workspace path).
RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -i \"$SSH_KEY\""
SSH=(ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY")

echo "→ Ensure ~/agentlab tree on server..."
"${SSH[@]}" "$EC2_HOST" 'mkdir -p ~/agentlab/agent_lab ~/agentlab/target_projects ~/agentlab/deploy'

echo "→ Rsync backend package (keep agent_lab_core as a subfolder — required for imports)..."
rsync -avz -e "$RSYNC_RSH" \
  "$ROOT/agent_lab/pyproject.toml" \
  "$EC2_HOST:~/agentlab/agent_lab/"
rsync -avz --delete -e "$RSYNC_RSH" \
  --exclude '__pycache__' --exclude '*.pyc' --exclude '.pytest_cache' \
  "$ROOT/agent_lab/agent_lab_core/" \
  "$EC2_HOST:~/agentlab/agent_lab/agent_lab_core/"
# Remove mistaken flat copy from older syncs (modules at agent_lab/*.py).
"${SSH[@]}" "$EC2_HOST" "rm -f ~/agentlab/agent_lab/cli.py ~/agentlab/agent_lab/db.py ~/agentlab/agent_lab/server.py ~/agentlab/agent_lab/runner.py ~/agentlab/agent_lab/parser.py ~/agentlab/agent_lab/langfuse_util.py ~/agentlab/agent_lab/__init__.py 2>/dev/null; true"

echo "→ Rsync target_projects (DBs + snapshots)..."
rsync -avz --delete -e "$RSYNC_RSH" \
  --exclude '__pycache__' --exclude '.venv' --exclude 'venv' \
  --exclude 'node_modules' \
  "$ROOT/target_projects/" \
  "$EC2_HOST:~/agentlab/target_projects/"

echo "→ Copy deploy helpers..."
rsync -avz -e "$RSYNC_RSH" \
  "$ROOT/agent_lab/deploy/remote-bootstrap.sh" \
  "$ROOT/agent_lab/deploy/agentlab-api.service" \
  "$EC2_HOST:~/agentlab/deploy/"

if [[ -f "$ROOT/.env" ]]; then
  echo "→ Upload .env (workspace root)..."
  scp -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$ROOT/.env" "$EC2_HOST:~/agentlab/.env"
else
  echo "WARN: No $ROOT/.env — create ~/agentlab/.env on the server with OPENAI_API_KEY and Langfuse vars." >&2
fi

echo "Done. On the server run: bash ~/agentlab/deploy/remote-bootstrap.sh"
echo "Or: ssh -i \"$SSH_KEY\" \"$EC2_HOST\" 'bash -s' < \"$ROOT/agent_lab/deploy/remote-bootstrap.sh\""
