import { Router } from 'express'
import { upload } from '../middleware/upload'
import * as reportController from '../controllers/report.controller'

const router = Router()

router.post('/upload', upload.single('report'), reportController.uploadReport)
router.get('/:id', reportController.getReportById)
router.get('/:id/recommendations', reportController.getActivityRecommendations)
router.delete('/:id', reportController.deleteReport)

export default router
