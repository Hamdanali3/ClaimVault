import { Router } from 'express';
import {
  addHouseholdMember,
  getHouseholdDetails,
} from '../../controllers/householdController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const router = Router();

router.use(jwtAuth);
router.get('/', getHouseholdDetails);
router.post('/members', requireHouseholdRole('OWNER'), addHouseholdMember);

export default router;
