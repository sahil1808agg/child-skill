# Enhance Your Child

A comprehensive child development platform that analyzes school report cards and provides personalized activity recommendations, venue suggestions, and actionable guidance for parents to support their child's growth.

## What This Application Does

**Enhance Your Child** transforms school report cards into actionable insights for parents. It:

1. **Processes Report Cards** - Upload PDF or image-based report cards; the system extracts and structures the data automatically
2. **Analyzes Performance** - Identifies strengths, areas for growth, and tracks progress over time using AI-powered analysis
3. **Recommends Activities** - Suggests personalized extracurricular activities based on your child's specific needs and development areas
4. **Finds Nearby Venues** - Locates classes, programs, and facilities near you where your child can pursue recommended activities
5. **Suggests Products** - Recommends age-appropriate educational products from multiple e-commerce platforms
6. **Guides Parents** - Provides specific home-based activities parents can do with their child, including frequency, duration, and expected outcomes
7. **Generates Reports** - Creates comprehensive PDF reports summarizing everything for easy reference

## Features

### Report Processing
- **Multi-Format Support**: Upload PDF or image-based report cards
- **OCR Processing**: Automatically extract text from PDFs and images using Tesseract.js
- **AI-Powered Parsing**: Use OpenAI GPT-4 to extract structured data from report cards
- **IB Curriculum Support**: Full support for IB PYP (Primary Years Programme) standards-based reports with learning continuum indicators (Beginning/Developing/Achieving/Excelling)
- **Traditional Reports**: Also supports traditional grade-based report cards (A-F, percentages)

### Analysis & Insights
- **AI-Powered Summarization**: Uses Google Gemini to generate comprehensive report summaries
- **IB Learner Profile Comparison**: Compares student performance against grade-level IB Learner Profile standards (Inquirer, Thinker, Communicator, etc.)
- **Progress Tracking**: Visualize student performance over multiple years
- **Trend Analysis**: Identify improving, declining, and stable subjects
- **Strength & Growth Areas**: Automatically identify areas of strength and areas needing attention

### Activity Recommendations
- **Personalized Suggestions**: 3-5 targeted activity recommendations based on report analysis
- **Budget-Aware**: Considers family budget with flexible cost ranges and currency conversion
- **Climate-Appropriate**: Filters activities based on your climate zone (tropical, temperate, cold, etc.)
- **Age-Appropriate**: Activities matched to child's developmental stage
- **Diverse Categories**: Physical activities, STEM programs, creative arts, cultural activities, mindfulness, and at-home activities
- **Current Activity Evaluation**: Analyzes existing activities and recommends whether to continue, reconsider, or stop

### Venue Discovery
- **Google Places Integration**: Find nearby venues for recommended activities
- **Location Autocomplete**: Easy location search with address suggestions
- **Venue Details**: Ratings, reviews, distance, phone numbers, and websites
- **Multi-Activity Support**: Searches for gymnastics, swimming, music classes, STEM centers, and more

### Product Recommendations
- **Multi-Platform Search**: Products from Amazon, Flipkart, Meesho, FirstCry, Snapdeal, and more
- **Age-Appropriate**: Products matched to child's age group
- **Category Coverage**: Puzzles, books, art supplies, STEM kits, robotics, educational toys, and more
- **Quality Scoring**: Products ranked by ratings and reviews

### Parent Action Plans
- **Home-Based Activities**: Specific activities parents can do at home
- **Structured Guidance**: Frequency, duration, and step-by-step tips
- **Expected Outcomes**: What improvement to expect and timeline
- **Product Links**: Related products to support each activity

### PDF Report Generation
- **Comprehensive Reports**: Professional PDF with all analysis and recommendations
- **Report Summary**: Overall performance, strengths, and growth areas
- **Activity Recommendations**: Full details with venues and costs
- **Parent Actions**: Complete home activity guide
- **Easy Sharing**: Download and share with family or tutors

### Interactive Dashboard
- View all students and their progress
- Student profiles with charts and historical data
- Track multiple children

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
- PDFKit for PDF generation
- Multer for file uploads

### AI & APIs
- OpenAI GPT-4 for intelligent report parsing
- Google Gemini for report summarization and analysis
- Google Places API for venue search and location services

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- OpenAI API key (for report parsing)
- Google API key (for Gemini AI summarization)
- Google Places API key (for venue search - optional)

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

Edit `.env` and add your API keys (see `.env.example` for the required variables).

**Required Environment Variables:**
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `OPENAI_API_KEY` - For intelligent report parsing (falls back to pattern-matching if not provided)
- `GOOGLE_API_KEY` - For AI-powered summarization via Gemini (falls back to rule-based if not provided)
- `GOOGLE_PLACES_API_KEY` - For venue search (optional - venue suggestions disabled if not provided)
- `NODE_ENV` - Environment (development/production)

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

### Step 1: Upload a Report
- Click "Upload Report" and select a PDF or image of a report card
- The system automatically detects if it's an IB or traditional report

### Step 2: Enter Details
- Provide student name and date of birth
- Select or create a student profile
- Enter your location for venue recommendations
- Optionally specify budget preferences

### Step 3: Add Current Activities (Optional)
- List any activities your child is currently enrolled in
- The system will evaluate if they align with your child's development needs

### Step 4: Automatic Processing
The system will:
- Extract text using OCR
- Parse the report card data (IB or traditional format)
- Generate an AI-powered summary with strengths and growth areas
- Create personalized activity recommendations
- Find nearby venues for each recommended activity
- Suggest relevant educational products
- Create parent action plans with home activities

### Step 5: Review Recommendations
- View the comprehensive analysis
- See activity recommendations with priority levels
- Browse nearby venues with ratings and contact info
- Review suggested products from multiple platforms
- Get specific guidance on home-based activities

### Step 6: Download PDF Report
- Generate a professional PDF with all recommendations
- Share with family members, tutors, or educators

### Step 7: Track Progress
- View the dashboard to see all students
- Click on a student to view:
  - Performance trends over time
  - Strengths and areas for improvement
  - Subject-wise progress charts
  - Complete report history
  - Historical recommendations

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
│   │   ├── components/
│   │   │   ├── wizard/              # Report upload wizard steps
│   │   │   └── student-profile/     # Student profile tabs
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Main dashboard
│   │   │   ├── StudentProfile.tsx   # Student detail view
│   │   │   ├── ReportWizard.tsx     # Multi-step report upload
│   │   │   └── UploadReport.tsx     # Simple upload page
│   │   ├── services/                # API services
│   │   ├── types/                   # TypeScript types
│   │   ├── App.tsx                  # Main app component
│   │   └── main.tsx                 # Entry point
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/             # Request handlers
│   │   ├── models/
│   │   │   ├── Student.ts           # Student schema
│   │   │   ├── Report.ts            # Report schema (IB + traditional)
│   │   │   └── CurrentActivity.ts   # Current activities schema
│   │   ├── routes/                  # API routes
│   │   ├── services/
│   │   │   ├── ocr.service.ts                    # OCR text extraction
│   │   │   ├── parser.service.ts                 # Traditional report parsing
│   │   │   ├── ib-parser.service.ts              # IB report parsing
│   │   │   ├── unified-analysis.service.ts      # Progress analysis
│   │   │   ├── summarization.service.ts         # AI summarization (Gemini)
│   │   │   ├── activity-recommendation.service.ts # Activity recommendations
│   │   │   ├── venue-search.service.ts          # Google Places integration
│   │   │   ├── product-search.service.ts        # E-commerce products
│   │   │   ├── climate-detection.service.ts     # Climate zone detection
│   │   │   └── pdf-generator.service.ts         # PDF report generation
│   │   ├── middleware/              # Express middleware
│   │   └── server.ts                # Server entry point
│   ├── uploads/                     # Uploaded files
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
