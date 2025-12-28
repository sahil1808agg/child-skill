# Quick Setup Guide

## Step 1: Install Dependencies

### Option A: Automatic (Linux/Mac)
```bash
chmod +x setup.sh
./setup.sh
```

### Option B: Manual
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

## Step 2: Configure MongoDB

### Option A: Local MongoDB
Install and start MongoDB on your machine:
- **macOS**: `brew install mongodb-community && brew services start mongodb-community`
- **Windows**: Download from mongodb.com and start the service
- **Linux**: `sudo apt install mongodb && sudo systemctl start mongodb`

### Option B: MongoDB Atlas (Cloud)
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string
4. Update `backend/.env` with your connection string

## Step 3: Configure Environment

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/enhance-your-child
OPENAI_API_KEY=sk-your-api-key-here  # Optional
NODE_ENV=development
```

### OpenAI API Key (Optional)
- Get an API key from https://platform.openai.com/api-keys
- This enables AI-powered report parsing
- If not provided, the app uses a basic fallback parser

## Step 4: Start the Application

Open two terminal windows:

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
Server starts at http://localhost:5000

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
App opens at http://localhost:3000

## Step 5: Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Upload Report"
3. Enter student details and upload a report card (PDF or image)
4. View the processed data and analytics

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGODB_URI in .env
- For Atlas, check network access settings

### Port Already in Use
- Change PORT in backend/.env
- Update proxy in frontend/vite.config.ts

### OCR Not Working
- Large images may take time to process
- Try with a smaller image or PDF
- Check console for detailed errors

### OpenAI Parsing Failed
- Verify API key in .env
- Check OpenAI account has credits
- Fallback parser will be used automatically

## Development Tips

- Frontend hot-reloads on file changes
- Backend restarts on file changes (nodemon)
- Check browser console for frontend errors
- Check terminal for backend errors
- MongoDB Compass is useful for viewing database

## Need Help?

Check the main README.md for detailed documentation.
