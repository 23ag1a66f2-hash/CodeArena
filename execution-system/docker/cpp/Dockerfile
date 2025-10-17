# Use GCC base image
FROM gcc:latest

# Install system dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    bash \
    time \
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

# Use dumb-init as entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["sleep", "infinity"]