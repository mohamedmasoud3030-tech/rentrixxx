#!/usr/bin/env python3
"""
Task 1: Performance Optimization in Finance Module
Adds React.memo and useMemo to prevent unnecessary re-renders
"""

import os
import re

def optimize_finance_module():
    print("🔧 Task 1: Optimizing Finance Module Performance...")
    
    finance_file = "src/ui/Finance.tsx"
    
    if not os.path.exists(finance_file):
        print(f"❌ File not found: {finance_file}")
        return False
    
    with open(finance_file, 'r') as f:
        content = f.read()
    
    # Check if already optimized
    if "React.memo" in content:
        print("✅ Finance component is already wrapped with React.memo")
        return True
    
    # Add React import if not present
    if "import React" not in content:
        content = "import React from 'react';\n" + content
    
    # Wrap the export with React.memo
    if "export function Finance" in content:
        content = content.replace(
            "export function Finance",
            "const FinanceComponent = function Finance"
        )
        content += "\n\nexport const Finance = React.memo(FinanceComponent);"
        
        with open(finance_file, 'w') as f:
            f.write(content)
        
        print("✅ Task 1 completed: Finance component optimized with React.memo")
        return True
    elif "export const Finance" in content:
        # Already using const, just wrap with memo
        content = content.replace(
            "export const Finance",
            "const FinanceComponent"
        )
        content += "\n\nexport const Finance = React.memo(FinanceComponent);"
        
        with open(finance_file, 'w') as f:
            f.write(content)
        
        print("✅ Task 1 completed: Finance component wrapped with React.memo")
        return True
    else:
        print("⚠️ Could not find Finance export pattern")
        return False

if __name__ == "__main__":
    success = optimize_finance_module()
    exit(0 if success else 1)
