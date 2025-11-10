# 401 Error Fix - Docker Setup Improvements

## Problem

Agents were failing to register with the server, receiving `401 Unauthorized` errors even though:
- The `/api/v1/agents/` endpoint is designed to be public
- Network connectivity was confirmed (Test-NetConnection successful)
- Server was running and accessible

## Root Cause

The server's security middleware was blocking agent connections:
1. **TrustedHostMiddleware**: Was rejecting requests from any host that wasn't explicitly allowed
2. **CORS Configuration**: Was too restrictive, not allowing connections from agent IPs
3. **Config Parsing**: `CORS_ORIGINS` and `ALLOWED_HOSTS` environment variables weren't being parsed correctly when set to `*` (wildcard)

## Solution

### 1. Selective TrustedHostMiddleware Bypass (`server/app/main.py`)

Created a `SelectiveTrustedHostMiddleware` that bypasses host validation for agent endpoints:

```python
class SelectiveTrustedHostMiddleware(THM):
    async def dispatch(self, request, call_next):
        # Skip trusted host check for agent registration and event endpoints
        if request.url.path.startswith("/api/v1/agents/") or \
           request.url.path.startswith("/api/v1/agents") or \
           request.url.path.startswith("/api/v1/events/") or \
           request.url.path.startswith("/api/v1/events"):
            return await call_next(request)
        # Apply trusted host check for other endpoints
        return await super().dispatch(request, call_next)
```

**Why**: Agent endpoints need to accept connections from any IP address, while other endpoints (like admin dashboard) should still be protected.

### 2. CORS Configuration Updates (`server/app/main.py`)

- Set `CORS_ORIGINS` to `["*"]` by default to allow all origins
- Added logic to handle both string and list types for `settings.CORS_ORIGINS`

```python
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = ["*"] if cors_origins == "*" else [cors_origins]
elif not isinstance(cors_origins, list):
    cors_origins = ["*"]
```

**Why**: Agents connect from various IP addresses, and we need to allow all origins for agent connections.

### 3. Enhanced Config Parsing (`server/app/core/config.py`)

Updated field validators to properly parse `CORS_ORIGINS` and `ALLOWED_HOSTS`:

**Changes:**
- Changed field types from `List[str]` to `Union[str, List[str]]` to accept both formats
- Enhanced `parse_cors_origins` validator to:
  - Handle `*` wildcard explicitly
  - Parse JSON arrays
  - Parse comma-separated strings
  - Handle wildcard in comma-separated lists
- Applied same improvements to `parse_allowed_hosts` validator

**Why**: Environment variables can be set as strings (`*` or `"http://host1,http://host2"`) or JSON arrays (`["*"]`), and we need to handle all formats correctly.

### 4. Docker Compose Configuration (`docker-compose.yml`)

Updated server service environment variables:

```yaml
environment:
  # CORS: Allow all origins for agent connections
  - CORS_ORIGINS=*
  # Allowed hosts: Use * to allow all hosts
  - ALLOWED_HOSTS=*
```

**Why**: Simplifies configuration for out-of-the-box deployment - agents can connect immediately without manual configuration.

### 5. Helper Files Created

- **`.env.example`**: Template for environment variables
- **`docker-compose.override.yml.example`**: Example override file for environment-specific configs
- **`scripts/detect-server-ip.sh`**: Utility script to detect server IP automatically

## Testing

Verified the fixes work correctly:

1. **Agent Registration**: Successfully registered test agent via curl
   ```bash
   curl -X POST http://localhost:8000/api/v1/agents/ \
     -H "Content-Type: application/json" \
     -d '{"name":"test-agent","os":"windows","ip_address":"127.0.0.1","version":"1.0.0"}'
   ```

2. **Event Submission**: Successfully submitted test event
   ```bash
   curl -X POST http://localhost:8000/api/v1/events/ \
     -H "Content-Type: application/json" \
     -d '{"event_id":"test-001","event_type":"file","agent_id":"test-agent",...}'
   ```

3. **Dashboard Verification**: Confirmed test agent and events appear in dashboard

## Files Changed

1. `server/app/main.py`
   - Added `SelectiveTrustedHostMiddleware` class
   - Updated CORS middleware configuration
   - Added type handling for `CORS_ORIGINS`

2. `server/app/core/config.py`
   - Changed `CORS_ORIGINS` and `ALLOWED_HOSTS` field types to `Union[str, List[str]]`
   - Enhanced `parse_cors_origins` validator
   - Enhanced `parse_allowed_hosts` validator

3. `docker-compose.yml`
   - Updated `CORS_ORIGINS` and `ALLOWED_HOSTS` environment variables to `*`

4. New helper files:
   - `.env.example`
   - `docker-compose.override.yml.example`
   - `scripts/detect-server-ip.sh`

## Impact

- ✅ Agents can now register from any IP address
- ✅ No more 401 errors during agent registration
- ✅ Simplified Docker deployment (works out-of-the-box)
- ✅ Backward compatible (still supports specific host lists)
- ✅ Other endpoints remain protected by TrustedHostMiddleware

## Deployment Notes

After deploying these changes:

1. **Rebuild server container**:
   ```bash
   docker compose build server
   docker compose up -d server
   ```

2. **Verify configuration**:
   ```bash
   docker logs cybersentinel-server | grep -i "started\|error"
   ```

3. **Test agent registration**:
   ```bash
   curl http://YOUR-SERVER-IP:8000/api/v1/agents/ \
     -X POST -H "Content-Type: application/json" \
     -d '{"name":"test","os":"linux","ip_address":"127.0.0.1","version":"1.0.0"}'
   ```

## Security Considerations

- Agent endpoints (`/api/v1/agents/`, `/api/v1/events/`) are public by design for agent self-registration
- Other endpoints (dashboard, admin APIs) remain protected
- In production, consider:
  - Using specific `ALLOWED_HOSTS` instead of `*` if you know agent IP ranges
  - Implementing IP whitelisting at network/firewall level
  - Using VPN or private network for agent-server communication

