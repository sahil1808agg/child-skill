# Enhance Your Child

A web application to track student progress over time by analyzing report cards, identifying strengths and areas for improvement, and visualizing academic performance.

## Features

- **Report Upload**: Upload PDF or image-based report cards
- **OCR Processing**: Automatically extract text from PDFs and images using Tesseract.js
- **AI-Powered Parsing**: Use OpenAI GPT-4 to extract structured data from report cards
- **Progress Tracking**: Visualize student performance over multiple years
- **Trend Analysis**: Identify improving, declining, and stable subjects
- **Strength & Weakness Analysis**: Automatically identify areas of strength and improvement
- **Interactive Dashboard**: View student profiles with charts and historical data

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- React Router for navigation
- Recharts for data visualization
- Axios for API communication

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- Tesseract.js for OCR
- pdf-parse for PDF processing
- OpenAI API for intelligent report parsing
- Multer for file uploads

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key (optional, for enhanced parsing)

## Installation

### 1. Clone the repository

```bash
cd child_skill
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../backend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/enhance-your-child
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

If you don't have an OpenAI API key, the system will use a fallback parser with basic pattern matching.

### 5. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS/Linux with Homebrew
brew services start mongodb-community

# Windows
net start MongoDB

# Or use MongoDB Atlas (cloud) by updating MONGODB_URI in .env
```

## Running the Application

### Development Mode

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
The backend will run on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:3000

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Build and Run Backend:**
```bash
cd backend
npm run build
npm start
```

## Usage

1. **Upload a Report**: Click "Upload Report" and select a PDF or image of a report card
2. **Enter Student Details**: Provide student name and date of birth
3. **Automatic Processing**: The system will:
   - Extract text using OCR
   - Parse the report card data
   - Create or update student profile
   - Analyze trends and patterns

4. **View Dashboard**: See all students and their progress
5. **Student Profile**: Click on a student to view:
   - Performance trends over time
   - Strengths and areas for improvement
   - Subject-wise progress charts
   - Complete report history

## API Endpoints

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `GET /api/students/:studentId/reports` - Get student's reports
- `GET /api/students/:studentId/analysis` - Get student analysis

### Reports
- `POST /api/reports/upload` - Upload and process report
- `GET /api/reports/:id` - Get report by ID

## Project Structure

```
child_skill/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── server.ts       # Server entry point
│   ├── uploads/            # Uploaded files
│   └── package.json
│
└── README.md
```

## Future Enhancements

- User authentication and authorization
- Multi-child support per parent account
- Email notifications for progress updates
- Export reports as PDF
- Mobile app version
- Integration with school management systems
- More detailed analytics and recommendations
- Comparison with peer performance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

For issues or questions, please create an issue in the repository.
