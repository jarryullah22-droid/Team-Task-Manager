import { body, param } from 'express-validator';

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

export const taskIdRule = [param('id').isUUID().withMessage('Invalid task id')];

export const createTaskRules = [
  body('team_id').isUUID().withMessage('A valid team is required'),
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer'),
  body('description')
    .optional({ nullable: true })
    .isLength({ max: 2000 }).withMessage('Description must be 2000 characters or fewer'),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('assignee_id').optional({ nullable: true }).isUUID().withMessage('Invalid assignee'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date'),
];

export const updateTaskRules = [
  param('id').isUUID().withMessage('Invalid task id'),
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 200 }),
  body('description').optional({ nullable: true }).isLength({ max: 2000 }),
  body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
  body('assignee_id').optional({ nullable: true }).isUUID().withMessage('Invalid assignee'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date'),
];
