#!/usr/bin/env python3
"""
Simple runner for the seed script with proper error handling.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Run the seed script with proper environment setup."""
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if we should clear data
    clear_flag = '--clear' if '--clear' in sys.argv else ''
    
    try:
        print(">> Running database seed script...")
        
        # Run with uv to ensure proper environment
        cmd = ['uv', 'run', 'python', 'seed.py']
        if clear_flag:
            cmd.append('--clear')
            
        result = subprocess.run(cmd, check=True, text=True, capture_output=True)
        
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
            
        print("\n>> Seeding completed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f">> Error running seed script: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except Exception as e:
        print(f">> Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()