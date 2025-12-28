#!/bin/bash

echo "🚀 Setting up Enhance Your Child Application..."
echo ""

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure MongoDB is running"
echo "2. Update backend/.env with your configuration"
echo "3. Run 'npm run dev' in the backend directory"
echo "4. Run 'npm run dev' in the frontend directory"
echo ""
echo "🎉 Happy coding!"
