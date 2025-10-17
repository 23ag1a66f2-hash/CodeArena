#!/bin/bash

# Set strict error handling
set -euo pipefail

# Constants
MEMORY_LIMIT="128m"
TIMEOUT="5"
CLASS_NAME="Solution"
DEFAULT_FILE="/tmp/Solution.java"

# Get source file from arguments or use default
SOURCE_FILE="${1:-$DEFAULT_FILE}"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file not found at $SOURCE_FILE" >&2
    exit 1
fi

START_TIME=$(date +%s%N)
START_MEMORY=$(ps -o rss= -p $$)

# Compile the Java code
echo "Compiling Java code..." >&2
if ! javac -J-Xmx${MEMORY_LIMIT} "${SOURCE_FILE}" 2>&1; then
    echo "Compilation failed" >&2
    exit 1
fi

# Execute the compiled code with resource limits and security manager
echo "Executing Java code..." >&2
timeout "${TIMEOUT}s" java \
    -Xmx${MEMORY_LIMIT} \
    -XX:+ExitOnOutOfMemoryError \
    -XX:+HeapDumpOnOutOfMemoryError \
    -Djava.security.manager \
    -Djava.security.policy==/dev/null \
    "${CLASS_NAME}" 2>&1

EXIT_CODE=$?

# Calculate execution stats
END_TIME=$(date +%s%N)
END_MEMORY=$(ps -o rss= -p $$)
RUNTIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
MEMORY_BYTES=$(( (END_MEMORY - START_MEMORY) * 1024 ))

# Handle different exit codes
case $EXIT_CODE in
    0)
        # Successful execution
        echo -e "\n__EXECUTION_STATS__:{\"runtime_ms\":$RUNTIME_MS,\"memory_bytes\":$MEMORY_BYTES,\"success\":true}" >&2
        ;;
    124)
        # Timeout
        echo "Error: Code execution timed out" >&2
        exit 1
        ;;
    137)
        # Memory limit exceeded
        echo "Error: Memory limit exceeded" >&2
        exit 1
        ;;
    *)
        # Other error
        echo "Error: Execution failed with code $EXIT_CODE" >&2
        exit 1
        ;;
esac 