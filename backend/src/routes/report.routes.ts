import { Router } from 'express'
import { upload } from '../middleware/upload'
import * as reportController from '../controllers/report.controller'

const router = Router()

router.post('/upload', upload.single('report'), reportController.uploadReport)
router.get('/location/autocomplete', reportController.getLocationAutocomplete)
router.get('/:id', reportController.getReportById)
router.get('/:id/recommendations', reportController.getActivityRecommendations)
router.post('/:reportId/download-pdf', reportController.downloadReportPDF)
router.delete('/:id', reportController.deleteReport)

export default router
