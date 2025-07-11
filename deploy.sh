#!/bin/bash

# Khronos API Deployment Script for Render

echo "🚀 Khronos API Deployment Helper"
echo "================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: This is not a git repository. Please initialize git first."
    echo "   Run: git init && git add . && git commit -m 'Initial commit'"
    exit 1
fi

# Check if changes are committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "   Please commit your changes before deploying:"
    echo "   git add . && git commit -m 'Prepare for deployment'"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Pre-deployment checks passed!"
echo ""

echo "📋 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Go to Render Dashboard: https://dashboard.render.com"
echo "3. Click 'New' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Render will detect the render.yaml file automatically"
echo ""
echo "🔧 Don't forget to set your environment variables:"
echo "   - OPENAI_API_KEY"
echo "   - GEMINI_API_KEY"
echo "   - JWT_SECRET"
echo "   - FRONTEND_URL"
echo "   - And other API keys from env.template"
echo ""
echo "📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Your API will be available at: https://your-app-name.onrender.com"

# Optional: Open Render dashboard
read -p "Open Render dashboard in browser? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://dashboard.render.com"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://dashboard.render.com"
    else
        echo "Please open https://dashboard.render.com manually"
    fi
fi 