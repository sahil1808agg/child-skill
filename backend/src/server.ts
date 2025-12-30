import dotenv from 'dotenv'

// Load environment variables FIRST before any other imports
dotenv.config()

import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import studentRoutes from './routes/student.routes'
import reportRoutes from './routes/report.routes'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/students', studentRoutes)
app.use('/api/reports', reportRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enhance-your-child'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  })

export default app



