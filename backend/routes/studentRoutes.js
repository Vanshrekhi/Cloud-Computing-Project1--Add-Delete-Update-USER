const express = require('express');
const controller = require('../controllers/studentController');
const router = express.Router();

router.route('/').get(controller.getStudents).post(controller.createStudent);
router.route('/:id').get(controller.getStudent).put(controller.updateStudent).delete(controller.deleteStudent);
module.exports = router;
