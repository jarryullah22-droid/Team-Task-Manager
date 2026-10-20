import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createTeamRules,
  teamIdRule,
  addMemberRules,
  removeMemberRules,
} from '../validators/teamValidator.js';
import {
  listTeams,
  createTeam,
  getTeam,
  addMember,
  removeMember,
  deleteTeam,
} from '../controllers/teamController.js';

const router = Router();

// Every /teams route requires a valid session.
router.use(ensureAuthenticated);

router.get('/', listTeams);
router.post('/', createTeamRules, validate, createTeam);
router.get('/:id', teamIdRule, validate, getTeam);
router.post('/:id/members', addMemberRules, validate, addMember);
router.delete('/:id/members/:userId', removeMemberRules, validate, removeMember);
router.delete('/:id', teamIdRule, validate, deleteTeam);

export default router;
