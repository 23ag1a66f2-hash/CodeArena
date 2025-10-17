# 🐍 Python Code Execution Container
# Minimal Docker image for Python code execution

# Use Python Alpine base for minimal size
FROM python:3.11-alpine

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    bash

# Create non-root user for security
RUN addgroup -g 1001 -S coderunner && \
    adduser -S coderunner -u 1001 -G coderunner

# Set working directory
WORKDIR /app

# Copy execution script
COPY execute.py /app/execute.py
RUN chmod +x /app/execute.py

# Set ownership
RUN chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "print('healthy')" || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Change this line - make it wait instead of running execute.py
CMD ["sleep", "infinity"]
