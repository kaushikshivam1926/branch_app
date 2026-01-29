#!/bin/bash
# Build standalone single-file version for offline use

echo "Building standalone version..."

# Run vite build with singlefile plugin
pnpm run build

# Copy standalone index.html to root
cp dist/public/index.html .

# Convert absolute image paths to relative
sed -i 's|/images/|images/|g' index.html

# Copy images folder to root
cp -r dist/public/images .

echo "✅ Standalone build complete!"
echo "📦 Files ready:"
echo "   - index.html (single file with all code inlined)"
echo "   - images/ (folder with all images)"
echo ""
echo "To deploy: Copy index.html and images/ folder together"
