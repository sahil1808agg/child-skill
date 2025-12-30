import { Request, Response } from 'express'
import CurrentActivity from '../models/CurrentActivity'

export const getStudentActivities = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    const { includeInactive } = req.query

    const query: any = { studentId }
    if (!includeInactive) {
      query.isActive = true
    }

    const activities = await CurrentActivity.find(query).sort({ createdAt: -1 })
    res.json(activities)
  } catch (error) {
    console.error('Error fetching current activities:', error)
    res.status(500).json({ error: 'Failed to fetch current activities' })
  }
}

export const addCurrentActivity = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params
    const { activityName, startDate, frequency, notes } = req.body

    if (!activityName) {
      return res.status(400).json({ error: 'Activity name is required' })
    }

    const activity = new CurrentActivity({
      studentId,
      activityName,
      startDate,
      frequency,
      notes,
      isActive: true
    })

    await activity.save()
    res.status(201).json(activity)
  } catch (error) {
    console.error('Error adding current activity:', error)
    res.status(500).json({ error: 'Failed to add current activity' })
  }
}

export const updateCurrentActivity = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params
    const { activityName, startDate, frequency, notes, isActive } = req.body

    const activity = await CurrentActivity.findByIdAndUpdate(
      activityId,
      {
        activityName,
        startDate,
        frequency,
        notes,
        isActive
      },
      { new: true, runValidators: true }
    )

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    res.json(activity)
  } catch (error) {
    console.error('Error updating current activity:', error)
    res.status(500).json({ error: 'Failed to update current activity' })
  }
}

export const deleteCurrentActivity = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params

    const activity = await CurrentActivity.findByIdAndDelete(activityId)

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    res.json({ message: 'Activity deleted successfully', activityId })
  } catch (error) {
    console.error('Error deleting current activity:', error)
    res.status(500).json({ error: 'Failed to delete current activity' })
  }
}

export const toggleActivityStatus = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params

    const activity = await CurrentActivity.findById(activityId)

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    activity.isActive = !activity.isActive
    await activity.save()

    res.json(activity)
  } catch (error) {
    console.error('Error toggling activity status:', error)
    res.status(500).json({ error: 'Failed to toggle activity status' })
  }
}
