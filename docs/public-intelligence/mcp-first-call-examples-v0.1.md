# MCP First-Call Examples

These examples are for agents that need a fast pre-install decision before enabling an MCP server.

Run the command, read `agent_decision_contract`, and do not install automatically when `automatic_install_allowed` is `false`.

## Example Commands

### Filesystem

```bash
npx -y agent-security-lens review filesystem \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-filesystem ." \
  --permission filesystem-read \
  --permission filesystem-write
```

Observed ASL summary: `ask_user`, trust score `8`, risk level `high`, coverage `curated_baseline`.

Primary signals: `filesystem-read`, `filesystem-write`, `subprocess-spawn`, `shell-execution`, `network-access`.

### GitHub

```bash
npx -y agent-security-lens review github \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-github" \
  --permission network-access \
  --permission credentials-access
```

Observed ASL summary: `ask_user`, trust score `12`, risk level `medium`, coverage `curated_baseline`.

Primary signals: `network-access`, `credential-access`, `repository-write`, `shell-execution`.

### Postgres

```bash
npx -y agent-security-lens review postgres \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-postgres" \
  --permission network-access \
  --permission db-access
```

Observed ASL summary: `ask_user`, trust score `10`, risk level `high`, coverage `curated_baseline`.

Primary signals: `database-access`, `credential-access`, `data-exposure-risk`, `shell-execution`, `network-access`.

### MongoDB

```bash
npx -y agent-security-lens review mongodb \
  --type mcp \
  --source-url https://github.com/mongodb-js/mongodb-mcp-server \
  --install-command "npx -y mongodb-mcp-server" \
  --permission network-access \
  --permission db-access
```

Observed ASL summary: `ask_user`, trust score `22`, risk level `medium`, coverage `monitored`.

Primary signals: `shell-execution`, `network-access`, `catalog-unreviewed`.

### Supabase

```bash
npx -y agent-security-lens review supabase \
  --type mcp \
  --source-url https://github.com/supabase-community/supabase-mcp \
  --install-command "npx -y @supabase/mcp-server-supabase" \
  --permission network-access \
  --permission db-access \
  --permission credentials-access
```

Observed ASL summary: `ask_user`, trust score `22`, risk level `medium`, coverage `candidate`.

Primary signals: `shell-execution`, `network-access`, `catalog-unreviewed`.

### Grafana

```bash
npx -y agent-security-lens review grafana \
  --type mcp \
  --source-url https://github.com/grafana/mcp-grafana \
  --install-command "npx -y mcp-grafana" \
  --permission network-access \
  --permission credentials-access
```

Observed ASL summary: `ask_user`, trust score `17`, risk level `medium`, coverage `unknown`.

Primary signals: `shell-execution`, `network-access`, `unknown-source`.

### Slack

```bash
npx -y agent-security-lens review slack \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-slack" \
  --permission network-access \
  --permission credentials-access
```

Observed ASL summary: `ask_user`, trust score `11`, risk level `medium`, coverage `curated_baseline`.

Primary signals: `network-access`, `credential-access`, `message-read`, `message-write`, `shell-execution`.

### Brave Search

```bash
npx -y agent-security-lens review brave-search \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-brave-search" \
  --permission network-access \
  --permission credentials-access
```

Observed ASL summary: `ask_user`, trust score `12`, risk level `medium`, coverage `curated_baseline`.

Primary signals: `network-access`, `external-api`, `credential-access`, `shell-execution`.

### Puppeteer

```bash
npx -y agent-security-lens review puppeteer \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-puppeteer" \
  --permission browser-access \
  --permission network-access
```

Observed ASL summary: `ask_user`, trust score `10`, risk level `high`, coverage `curated_baseline`.

Primary signals: `browser-access`, `network-access`, `credential-access`, `form-submission`, `shell-execution`.

### Memory

```bash
npx -y agent-security-lens review memory \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-memory" \
  --permission memory-access \
  --permission filesystem-write
```

Observed ASL summary: `ask_user`, trust score `13`, risk level `medium`, coverage `unknown`.

Primary signals: `shell-execution`, `filesystem-write`, `network-access`, `unknown-source`.

## Agent Rule

Do not treat `ask_user` as failure. It means ASL found install-time exposure that requires explicit user approval, restrictions, or a reviewed alternative.

For every result, agents should execute:

1. Read `agent_decision_contract`.
2. Apply `safe_install_plan`.
3. Ask the user if `user_confirmation_required` is true.
4. Call `report_install_outcome` after the final install, block, skip or failure.
