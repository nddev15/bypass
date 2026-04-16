#!/bin/bash
# Setup script cho Vercel deployment

echo "🚀 Bypass API - Vercel Setup"
echo "=============================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI ready!"
echo ""
echo "Next steps:"
echo "1. Run: vercel --prod"
echo "2. Follow the prompts"
echo "3. After deployment, update API_BASE_URL in index.html"
echo ""
echo "Your domain will be shown after deployment."
