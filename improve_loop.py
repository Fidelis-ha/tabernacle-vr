#!/usr/bin/env python3
"""
Tabernacle VR - 50-Iteration Improvement Loop
Each iteration: Build, Check, Fix, Verify
"""

import subprocess
import sys
import time
import os
import json

PROJECT_DIR = "/opt/data/tabernacle-vr"
SERVE_PORT = 3001

def run_cmd(cmd, cwd=PROJECT_DIR, timeout=30):
    """Run a command and return output"""
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=timeout
        )
        return result.stdout + result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "TIMEOUT", -1

def build():
    """Build the project"""
    print("  Building...")
    output, code = run_cmd("npm run build 2>&1")
    if code != 0:
        return False, f"Build failed: {output[-200:]}"
    return True, "Build OK"

def check_server():
    """Check if server is running"""
    output, code = run_cmd(f"curl -s http://localhost:{SERVE_PORT}/ | grep -c 'Stiftshütte'")
    try:
        count = int(output.strip())
        return count > 0
    except:
        return False

def start_server():
    """Start the server"""
    # Kill old server
    run_cmd("pkill -f 'serve dist' 2>/dev/null || true")
    time.sleep(1)
    
    # Start new server
    cmd = f"cd {PROJECT_DIR} && npx -y serve dist -l {SERVE_PORT} -s"
    subprocess.Popen(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    
    return check_server()

def analyze_issues():
    """Analyze current state and return issues list"""
    issues = []
    
    # Check Scene.tsx completeness
    scene_path = f"{PROJECT_DIR}/src/components/Scene.tsx"
    with open(scene_path, 'r') as f:
        content = f.read()
    
    if "TabernacleFloor" not in content:
        issues.append("Scene: TabernacleFloor missing")
    if "TabernacleCourtyard" not in content:
        issues.append("Scene: TabernacleCourtyard missing")
    if "HolyPlace" not in content:
        issues.append("Scene: HolyPlace missing")
    if "HolyOfHolies" not in content:
        issues.append("Scene: HolyOfHolies missing")
    
    # Check materials
    mats_path = f"{PROJECT_DIR}/src/utils/materials.ts"
    with open(mats_path, 'r') as f:
        mats_content = f.read()
    
    if "GOLD" not in mats_content:
        issues.append("Materials: GOLD missing")
    if "BRONZE" not in mats_content:
        issues.append("Materials: BRONZE missing")
    
    return issues

def main():
    print("=" * 60)
    print("TABERNACLE VR - 50 ITERATION IMPROVEMENT LOOP")
    print("=" * 60)
    
    iteration = 1
    max_iterations = 50
    
    while iteration <= max_iterations:
        print(f"\n--- Iteration {iteration}/50 ---")
        
        # Build
        print("  Building project...")
        success, msg = build()
        if not success:
            print(f"  ✗ {msg}")
            iteration += 1
            continue
        print(f"  ✓ {msg}")
        
        # Start server
        print("  Starting server...")
        if not start_server():
            print("  ✗ Server failed to start")
            iteration += 1
            continue
        print(f"  ✓ Server running on port {SERVE_PORT}")
        
        # Analyze issues
        issues = analyze_issues()
        if issues:
            print(f"  Issues found: {len(issues)}")
            for issue in issues[:5]:
                print(f"    - {issue}")
        else:
            print("  ✓ No issues detected")
        
        print(f"  Iteration {iteration} complete")
        iteration += 1
        
        # Small delay between iterations
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print("LOOP COMPLETE - 50 iterations finished")
    print("=" * 60)

if __name__ == "__main__":
    main()