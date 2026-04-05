#!/bin/bash
# Build standalone single-file version for offline file:// access

echo "Building standalone deployment version..."
echo "This creates a single index.html file that users can double-click to open."
echo ""

# Run vite build with viteSingleFile plugin enabled
BUILD_MODE=deployment pnpm run build

# Copy standalone index.html to root deployment folder
mkdir -p deployment
cp dist/public/index.html deployment/

# Copy images folder for offline use
cp -r dist/public/images deployment/

# Also maintain compatibility: copy to root level as well
cp dist/public/index.html .

echo "✅ Standalone build complete!"
echo "📦 Deployment files created:"
echo "   - deployment/index.html (single file, ~2-3MB with all code inlined)"
echo "   - deployment/images/ (all image assets)"
echo ""
echo "And also copied to root level for backward compatibility:"
echo "   - ./index.html"
echo ""
echo "📤 To deploy for end users:"
echo "   1. Copy deployment/index.html and deployment/images/ folder together"
echo "   2. Users simply double-click index.html to open in their browser"
echo "   3. Works 100% offline - no server or installation needed"
