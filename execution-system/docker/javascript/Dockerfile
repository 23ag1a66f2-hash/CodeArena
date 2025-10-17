# Use Node.js base image
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 coderunner && \
    useradd -u 1001 -g coderunner -m -s /bin/bash coderunner

# Set working directory
WORKDIR /app

# Copy execution script
COPY execute.js /app/execute.js
RUN chmod +x /app/execute.js

# Set ownership
RUN chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["sleep", "infinity"] 