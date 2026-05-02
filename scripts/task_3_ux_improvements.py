#!/usr/bin/env python3
"""
Task 3: UX Improvements - Loading Skeletons and Error Boundaries
Adds better loading states and error handling UI
"""

import os

def add_ux_improvements():
    print("✨ Task 3: Improving User Experience with Loading States and Error Boundaries...")
    
    # Create a new error boundary component
    error_boundary_path = "src/components/ErrorBoundary.tsx"
    
    error_boundary_code = '''import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-bold">Something went wrong</h2>
          <p className="text-red-600 text-sm">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
'''
    
    # Create loading skeleton component
    skeleton_path = "src/components/LoadingSkeleton.tsx"
    
    skeleton_code = '''import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
};
'''
    
    # Write error boundary
    os.makedirs(os.path.dirname(error_boundary_path), exist_ok=True)
    with open(error_boundary_path, 'w') as f:
        f.write(error_boundary_code)
    print(f"✅ Created Error Boundary component: {error_boundary_path}")
    
    # Write loading skeleton
    os.makedirs(os.path.dirname(skeleton_path), exist_ok=True)
    with open(skeleton_path, 'w') as f:
        f.write(skeleton_code)
    print(f"✅ Created Loading Skeleton component: {skeleton_path}")
    
    print("✅ Task 3 completed: UX improvements added")
    return True

if __name__ == "__main__":
    success = add_ux_improvements()
    exit(0 if success else 1)
