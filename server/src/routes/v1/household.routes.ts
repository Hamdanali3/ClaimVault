import { Router } from 'express';
import {
  addHouseholdMember,
  getHouseholdDetails,
  removeHouseholdMember,
} from '../../controllers/householdController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const router = Router();

router.use(jwtAuth);
router.get('/', getHouseholdDetails);
router.post('/members', requireHouseholdRole('OWNER'), addHouseholdMember);
router.delete('/members/:userId', requireHouseholdRole('OWNER'), removeHouseholdMember);

export default router;
