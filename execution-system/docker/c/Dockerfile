# 🔵 C Code Execution Container
# Minimal Docker image for C code compilation and execution

# Use Alpine Linux for minimal size
FROM alpine:3.18

# Install GCC and essential build tools
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libc-dev \
    dumb-init \
    curl \
    bash \
    coreutils

# Create non-root user for security
RUN addgroup -g 1001 -S coderunner && \
    adduser -S coderunner -u 1001 -G coderunner

# Set working directory
WORKDIR /app

# Copy execution script
COPY execute.sh /app/execute.sh
RUN chmod +x /app/execute.sh

# Set ownership
RUN chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD gcc --version || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["sleep", "infinity"] 