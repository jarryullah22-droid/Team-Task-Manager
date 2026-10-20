import { body, param } from 'express-validator';

export const createTeamRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Team name is required')
    .isLength({ max: 120 }).withMessage('Team name must be 120 characters or fewer'),
  body('description')
    .optional({ nullable: true })
    .isLength({ max: 500 }).withMessage('Description must be 500 characters or fewer'),
];

export const teamIdRule = [param('id').isUUID().withMessage('Invalid team id')];

export const addMemberRules = [
  param('id').isUUID().withMessage('Invalid team id'),
  body('email').trim().isEmail().withMessage('A valid member email is required').normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
];

export const removeMemberRules = [
  param('id').isUUID().withMessage('Invalid team id'),
  param('userId').isUUID().withMessage('Invalid user id'),
];
