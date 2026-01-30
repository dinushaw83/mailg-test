#!/usr/bin/env python3
"""Remove participant_count field from threads.json fixture."""

import json
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows compatibility
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())


def main():
    fixtures_dir = Path(__file__).parent.parent / "fixtures"
    threads_path = fixtures_dir / "threads.json"
    
    print(f"Loading threads from {threads_path}")
    with open(threads_path, "r", encoding="utf-8") as f:
        threads = json.load(f)
    
    print(f"Loaded {len(threads)} threads")
    
    # Remove participant_count from each thread
    removed_count = 0
    for thread in threads:
        if "participant_count" in thread:
            del thread["participant_count"]
            removed_count += 1
    
    print(f"Removed participant_count from {removed_count} threads")
    
    # Save updated threads
    print(f"Saving updated threads to {threads_path}")
    with open(threads_path, "w", encoding="utf-8") as f:
        json.dump(threads, f, indent=2, ensure_ascii=False)
    
    print("Done!")


if __name__ == "__main__":
    main()
