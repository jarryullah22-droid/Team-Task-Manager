import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTaskRules, updateTaskRules, taskIdRule } from '../validators/taskValidator.js';
import {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';

const router = Router();

router.use(ensureAuthenticated);

router.get('/', listTasks);
router.post('/', createTaskRules, validate, createTask);
router.get('/:id', taskIdRule, validate, getTask);
router.patch('/:id', updateTaskRules, validate, updateTask);
router.delete('/:id', taskIdRule, validate, deleteTask);

export default router;
