FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    ASL_MODE=local \
    ASL_DISABLE_CLOUD=1

COPY . .

CMD ["node", "./apps/mcp-server/agent-security-lens-mcp.mjs"]
