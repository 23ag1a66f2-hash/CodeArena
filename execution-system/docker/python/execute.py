#!/usr/bin/env python3
import os
import sys
import resource
import signal
import traceback
from contextlib import contextmanager
import time

def get_memory_usage():
    """Get the memory usage of the current process in bytes"""
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024

@contextmanager
def timeout(seconds):
    """Timeout context manager"""
    def signal_handler(signum, frame):
        raise TimeoutError("Code execution timed out")
    
    # Set the signal handler and alarm
    signal.signal(signal.SIGALRM, signal_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)

def main():
    try:
        # Get the code file path from arguments or default to /tmp/code.py
        code_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/code.py'
        
        if not os.path.exists(code_file):
            print(f"Error: Code file not found at {code_file}", file=sys.stderr)
            sys.exit(1)
        
        # Set resource limits
        # 128MB memory limit
        resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
        # 5 second CPU time limit
        resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
        # 64MB file size limit
        resource.setrlimit(resource.RLIMIT_FSIZE, (64 * 1024 * 1024, 64 * 1024 * 1024))
        
        # Record start time and memory
        start_time = time.time()
        start_memory = get_memory_usage()
        
        # Execute the code with timeout
        with timeout(5):  # 5 second timeout
            # Create a new namespace for the code
            namespace = {}
            with open(code_file, 'r') as f:
                code = f.read()
                
            # Execute the code
            exec(code, namespace)
            
            # If there's a Solution class, try to run it
            if 'Solution' in namespace:
                solution = namespace['Solution']()
                # Look for a main method
                if hasattr(solution, 'main'):
                    solution.main()
        
        # Calculate resource usage
        end_time = time.time()
        end_memory = get_memory_usage()
        
        # Print execution stats as JSON
        execution_stats = {
            'runtime_ms': int((end_time - start_time) * 1000),
            'memory_bytes': end_memory - start_memory,
            'success': True
        }
        print(f"\n__EXECUTION_STATS__:{execution_stats}", file=sys.stderr)
        
    except TimeoutError:
        print("Error: Code execution timed out", file=sys.stderr)
        sys.exit(1)
    except MemoryError:
        print("Error: Memory limit exceeded", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print("Traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 