import { Router } from 'express'
import * as activityController from '../controllers/current-activity.controller'

const router = Router()

// Get all current activities for a student
router.get('/student/:studentId', activityController.getStudentActivities)

// Add a new current activity
router.post('/student/:studentId', activityController.addCurrentActivity)

// Update a current activity
router.put('/:activityId', activityController.updateCurrentActivity)

// Delete a current activity
router.delete('/:activityId', activityController.deleteCurrentActivity)

// Toggle activity active status
router.patch('/:activityId/toggle', activityController.toggleActivityStatus)

export default router
