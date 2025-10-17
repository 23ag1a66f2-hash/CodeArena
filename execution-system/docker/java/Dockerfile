# Use OpenJDK base image
FROM openjdk:11-jdk-slim

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
COPY execute.sh /app/execute.sh
RUN chmod +x /app/execute.sh

# Set ownership
RUN chown -R coderunner:coderunner /app

# Switch to non-root user
USER coderunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD java -version || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["sleep", "infinity"] 