import { Router } from 'express'
import * as studentController from '../controllers/student.controller'
import { getStudentReports, getStudentAnalysis } from '../controllers/report.controller'

const router = Router()

router.get('/', studentController.getAllStudents)
router.get('/:id', studentController.getStudentById)
router.post('/', studentController.createStudent)
router.put('/:id', studentController.updateStudent)
router.delete('/:id', studentController.deleteStudent)
router.get('/:studentId/reports', getStudentReports)
router.get('/:studentId/analysis', getStudentAnalysis)

export default router
