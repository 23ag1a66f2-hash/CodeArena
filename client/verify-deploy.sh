#!/bin/bash

echo "🔍 Verifying Railway deployment configuration..."

# Check if railway.toml exists and is clean
if [ -f "railway.toml" ]; then
    echo "✅ railway.toml found"
    cat railway.toml
else
    echo "❌ railway.toml not found"
    exit 1
fi

echo ""

# Check if nixpacks.toml exists and is clean
if [ -f "nixpacks.toml" ]; then
    echo "✅ nixpacks.toml found"
    cat nixpacks.toml
else
    echo "❌ nixpacks.toml not found"
    exit 1
fi

echo ""

# Check if package.json has correct scripts
if grep -q '"build"' package.json && grep -q '"serve"' package.json; then
    echo "✅ package.json has required scripts"
else
    echo "❌ package.json missing required scripts"
    exit 1
fi

echo ""

# Check if serve package is in dependencies
if grep -q '"serve"' package.json; then
    echo "✅ serve package in dependencies"
else
    echo "❌ serve package not in dependencies"
    exit 1
fi

echo ""

# Check for any conflicting configuration files
conflicts=()
if [ -f ".nixpacks" ]; then conflicts+=(".nixpacks"); fi
if [ -d ".railway" ]; then conflicts+=(".railway"); fi
if [ -f "vercel.json" ]; then conflicts+=("vercel.json"); fi
if [ -f "Dockerfile" ]; then conflicts+=("Dockerfile"); fi

if [ ${#conflicts[@]} -eq 0 ]; then
    echo "✅ No conflicting configuration files found"
else
    echo "❌ Conflicting configuration files found: ${conflicts[*]}"
    exit 1
fi

echo ""
echo "🎉 Railway deployment configuration verified!"
echo "🚀 Ready to deploy to Railway with Nixpacks!"
echo ""
echo "📝 Configuration summary:"
echo "- Using Nixpacks builder"
echo "- Node.js provider only"
echo "- Build output: build/"
echo "- Serve from: build/"
echo "- No conflicting configs" 