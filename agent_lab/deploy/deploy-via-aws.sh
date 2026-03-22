#!/usr/bin/env bash
# Deploy Agent Lab backend to EC2 using AWS CLI to resolve instance IP, then rsync (same as sync-to-ec2.sh).
#
# Prerequisites: aws CLI configured (e.g. aws configure or AWS_PROFILE), SSH_KEY to your .pem
#
# Usage (from workspace root — folder containing agent_lab/ and target_projects/):
#
#   export SSH_KEY="$HOME/path/to/agl.pem"
#   export AGENTLAB_EC2_INSTANCE_ID="i-0abc123..."   # OR use name tag below
#   ./agent_lab/deploy/deploy-via-aws.sh
#
#   # First-time server setup (venv + systemd):
#   ./agent_lab/deploy/deploy-via-aws.sh --bootstrap
#
#   # After code-only changes:
#   ./agent_lab/deploy/deploy-via-aws.sh --restart
#
# Env:
#   AGENTLAB_EC2_INSTANCE_ID   EC2 instance id (preferred)
#   AGENTLAB_EC2_NAME_TAG      Alternative: value of EC2 "Name" tag (running instance)
#   AGENTLAB_EC2_PUBLIC_IP     Alternative: public IPv4 of a running instance
#   AWS_REGION / AWS_DEFAULT_REGION   default: us-east-1
#   EC2_USER                   default: ubuntu (use ec2-user for Amazon Linux)
#   SSH_KEY                    required — path to .pem
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
INSTANCE_ID="${AGENTLAB_EC2_INSTANCE_ID:-}"
NAME_TAG="${AGENTLAB_EC2_NAME_TAG:-}"
PUBLIC_IP_FILTER="${AGENTLAB_EC2_PUBLIC_IP:-}"
EC2_USER="${EC2_USER:-ubuntu}"

DO_BOOTSTRAP=false
DO_RESTART=false
for arg in "$@"; do
  case "$arg" in
    --bootstrap) DO_BOOTSTRAP=true ;;
    --restart)   DO_RESTART=true ;;
    -h|--help)
      cat <<'EOF'
Usage: deploy-via-aws.sh [--bootstrap] [--restart]

  Resolves EC2 public IP via AWS CLI, then runs sync-to-ec2.sh (rsync code + target_projects + .env).

  Required env:
    SSH_KEY                    path to .pem
    AGENTLAB_EC2_INSTANCE_ID   e.g. i-0abc123...
    OR AGENTLAB_EC2_NAME_TAG   EC2 "Name" tag (running instance)
    OR AGENTLAB_EC2_PUBLIC_IP  public IPv4 (running instance)

  Optional:
    AWS_REGION / AWS_DEFAULT_REGION   default us-east-1
    EC2_USER                   default ubuntu (ec2-user for Amazon Linux)

  Flags:
    --bootstrap   run remote-bootstrap.sh (venv, pip install, systemd) on server
    --restart     sudo systemctl restart agentlab-api after sync
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (use --bootstrap, --restart, or --help)" >&2
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" >&2
  exit 1
fi

if [[ -z "$SSH_KEY" || ! -f "$SSH_KEY" ]]; then
  echo "Set SSH_KEY to your .pem path, e.g. export SSH_KEY=\"\$HOME/.ssh/agl.pem\"" >&2
  exit 1
fi

if [[ -z "$INSTANCE_ID" ]]; then
  if [[ -n "$NAME_TAG" ]]; then
    INSTANCE_ID=$(aws ec2 describe-instances --region "$AWS_REGION" \
      --filters "Name=tag:Name,Values=$NAME_TAG" "Name=instance-state-name,Values=running" \
      --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || true)
  fi
fi
if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  if [[ -n "$PUBLIC_IP_FILTER" ]]; then
    INSTANCE_ID=$(aws ec2 describe-instances --region "$AWS_REGION" \
      --filters "Name=ip-address,Values=$PUBLIC_IP_FILTER" "Name=instance-state-name,Values=running" \
      --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || true)
  fi
fi

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "Could not resolve instance. Set one of:" >&2
  echo "  export AGENTLAB_EC2_INSTANCE_ID=i-..." >&2
  echo "  export AGENTLAB_EC2_NAME_TAG=MyAgentLabServer   # must match EC2 Name tag" >&2
  echo "  export AGENTLAB_EC2_PUBLIC_IP=54.x.x.x         # running instance’s public IPv4" >&2
  exit 1
fi

STATE=$(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].State.Name' --output text)
if [[ "$STATE" != "running" ]]; then
  echo "Instance $INSTANCE_ID is not running (state: $STATE)" >&2
  exit 1
fi

PUBLIC_IP=$(aws ec2 describe-instances --region "$AWS_REGION" --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

if [[ -z "$PUBLIC_IP" || "$PUBLIC_IP" == "None" ]]; then
  echo "No PublicIpAddress for $INSTANCE_ID. Attach an Elastic IP or use a public subnet." >&2
  exit 1
fi

export EC2_HOST="${EC2_USER}@${PUBLIC_IP}"
export SSH_KEY

echo "→ AWS region: $AWS_REGION | instance: $INSTANCE_ID | connect: $EC2_HOST"
"$SCRIPT_DIR/sync-to-ec2.sh"

SSH=(ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY")

if [[ "$DO_BOOTSTRAP" == true ]]; then
  echo "→ Running remote-bootstrap on server..."
  "${SSH[@]}" "$EC2_HOST" 'bash -s' < "$SCRIPT_DIR/remote-bootstrap.sh"
fi

if [[ "$DO_RESTART" == true ]]; then
  echo "→ Restarting agentlab-api..."
  "${SSH[@]}" "$EC2_HOST" 'sudo systemctl restart agentlab-api && sudo systemctl is-active agentlab-api'
fi

echo "→ Done. Health check:"
curl -sS --connect-timeout 5 "http://${PUBLIC_IP}:8000/health" && echo || echo "(curl failed — check security group :8000 and service logs)"
