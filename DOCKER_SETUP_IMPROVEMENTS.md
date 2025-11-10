# Docker Setup Improvements

## Changes Made

### 1. **Improved CORS Configuration**
- Changed CORS to allow all origins (`*`) by default
- This allows agents to connect from any IP address
- Previously only specific dashboard URLs were allowed

### 2. **Fixed Environment Variable Parsing**
- Updated config parser to handle both JSON arrays and comma-separated strings
- Now supports: `CORS_ORIGINS=*` or `CORS_ORIGINS=http://localhost:3000,http://other:3000`
- More flexible configuration

### 3. **Relaxed Trusted Host Middleware**
- Agent endpoints (`/api/v1/agents/`, `/api/v1/events/`) now bypass trusted host checks
- Allows agents to connect from any host/IP
- Other endpoints still protected

### 4. **Added .env.example**
- Template file for environment variables
- Copy to `.env` and customize
- Includes all necessary configuration options

### 5. **Added Auto-Detection Script**
- `scripts/detect-server-ip.sh` automatically detects server IP
- Updates docker-compose.yml with correct IP addresses
- Makes setup easier for new deployments

### 6. **Added docker-compose.override.yml.example**
- Template for environment-specific overrides
- Allows customization without modifying main docker-compose.yml
- Useful for different deployment environments

## Quick Start (Improved)

### Option 1: Auto-Detect IP (Recommended)

```bash
# Run the auto-detection script
./scripts/detect-server-ip.sh

# Start services
docker compose up -d
```

### Option 2: Manual Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Update docker-compose.yml:**
   - Replace `172.23.19.78` with your server IP
   - Or use the override file

3. **Start services:**
   ```bash
   docker compose up -d
   ```

## Configuration for Agents

With these improvements, agents can connect using:

```
http://YOUR-SERVER-IP:8000/api/v1
```

No authentication required for:
- `/api/v1/agents/` (registration)
- `/api/v1/events/` (event submission)
- `/api/v1/agents/{agent_id}/heartbeat` (heartbeat)

## Troubleshooting

### If agents still get 401 errors:

1. **Check CORS configuration:**
   ```bash
   docker logs cybersentinel-server | grep CORS
   ```

2. **Verify environment variables:**
   ```bash
   docker exec cybersentinel-server env | grep CORS
   ```

3. **Test endpoint directly:**
   ```bash
   curl -X POST http://YOUR-SERVER-IP:8000/api/v1/agents/ \
     -H "Content-Type: application/json" \
     -d '{"name":"test","os":"windows","ip_address":"127.0.0.1"}'
   ```

4. **Check server logs:**
   ```bash
   docker logs cybersentinel-server --tail 50
   ```

## Security Notes

- CORS is set to `*` to allow agent connections from anywhere
- In production, you may want to restrict CORS to specific IP ranges
- Agent endpoints are public by design (no authentication)
- Other endpoints still require authentication

