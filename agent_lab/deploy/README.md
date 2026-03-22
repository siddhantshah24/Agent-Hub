# Deploy Agent Lab API to EC2

## 1. Fix SSH (required)

If you see `Permission denied (publickey)`:

- The `.pem` must be the **exact** file downloaded when the EC2 key pair **`agentlab`** was created.
- In **AWS Console → EC2 → Key pairs**, confirm the fingerprint matches your file:
  ```bash
  openssl pkey -in /path/to/agentlab.pem -pubout -outform DER 2>/dev/null | openssl md5 -c
  ```
- If you lost the key: create a **new** key pair, **stop** the instance, **Actions → Security → Modify instance attributes** is not for keys — you must create an AMI or attach volume to fix. Easiest path: launch a new instance with a new key and re-run deploy.

**Security group** (profile `keysha`, group `sg-07266c734f756b97d`):

- **TCP 22** — your laptop’s public IP `/32` (not the whole internet).
- **TCP 8000** — `0.0.0.0/0` if the Next.js app (e.g. Vercel) calls `http://YOUR_IP:8000`.

```bash
export AWS_PROFILE=keysha
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
aws ec2 authorize-security-group-ingress --region us-east-1 \
  --group-id sg-07266c734f756b97d --protocol tcp --port 22 --cidr "$MY_IP"
aws ec2 authorize-security-group-ingress --region us-east-1 \
  --group-id sg-07266c734f756b97d --protocol tcp --port 8000 --cidr 0.0.0.0/0
```

## 2a. Deploy with AWS CLI (resolve IP automatically)

If `aws` is configured (`aws sts get-caller-identity` works), you can avoid hard-coding the public IP:

```bash
cd /path/to/workspace   # contains agent_lab/ and target_projects/

export AWS_PROFILE=keysha   # optional
export AWS_REGION=us-east-1
export SSH_KEY="$HOME/path/to/agl.pem"
export AGENTLAB_EC2_INSTANCE_ID="i-xxxxxxxx"   # EC2 console → Instances → ID

# Sync code + DBs + snapshots + .env (same as sync-to-ec2.sh)
chmod +x agent_lab/deploy/deploy-via-aws.sh
./agent_lab/deploy/deploy-via-aws.sh

# First time on a fresh instance (Python venv, systemd unit):
./agent_lab/deploy/deploy-via-aws.sh --bootstrap

# Routine code push: sync + restart API
./agent_lab/deploy/deploy-via-aws.sh --restart
```

**Or** match by **Name** tag or **public IP** (no instance id needed):

```bash
export AGENTLAB_EC2_NAME_TAG="agentlab-api"   # must equal the instance Name tag
unset AGENTLAB_EC2_INSTANCE_ID
./agent_lab/deploy/deploy-via-aws.sh --restart
```

```bash
export AGENTLAB_EC2_PUBLIC_IP="54.196.166.55"
./agent_lab/deploy/deploy-via-aws.sh --restart
```

## 2. Sync code + env from your Mac

From the **workspace root** (folder that contains `agent_lab/` and `target_projects/`):

- **Amazon Linux:** `EC2_HOST="ec2-user@YOUR_IP"`
- **Ubuntu AMI:** `EC2_HOST="ubuntu@YOUR_IP"`

```bash
export SSH_KEY="/path/to/your.pem"
export EC2_HOST="ubuntu@54.196.166.55"   # example — use your instance IP
chmod 400 "$SSH_KEY"

./agent_lab/deploy/sync-to-ec2.sh
```

This rsyncs `agent_lab_core` + `pyproject.toml` + `target_projects` and uploads **`.env`** from the workspace root to the server (`~/agentlab/.env`).

## 3. Install & start API on the server (once SSH works)

```bash
ssh -i "$SSH_KEY" "$EC2_HOST" 'bash -s' < agent_lab/deploy/remote-bootstrap.sh
```

Or SSH in and run:

```bash
bash ~/agentlab/deploy/remote-bootstrap.sh
```

## 4. Vercel (frontend)

See **`agent_lab/agent_lab_ui/VERCEL.md`**.

- **Root directory:** `agent_lab/agent_lab_ui`
- **Env:** `AGENTLAB_BACKEND_URL=http://YOUR_EC2_IP:8000` — the UI calls same-origin `/api/*`; Next rewrites to this backend (avoids HTTPS→HTTP mixed content).

## 5. Operations

```bash
# logs
ssh -i "$SSH_KEY" "$EC2_HOST" 'sudo journalctl -u agentlab-api -f'

# restart
ssh -i "$SSH_KEY" "$EC2_HOST" 'sudo systemctl restart agentlab-api'
```

After changing code locally, re-run `./agent_lab/deploy/sync-to-ec2.sh` then `sudo systemctl restart agentlab-api`.
