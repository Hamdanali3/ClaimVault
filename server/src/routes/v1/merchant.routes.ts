import { Router } from 'express';
import {
  listMerchantProfiles,
  updateMerchantProfile,
} from '../../controllers/merchantController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const router = Router();

router.use(jwtAuth);
router.get('/', listMerchantProfiles);
router.patch('/:id', requireHouseholdRole('EDITOR'), updateMerchantProfile);

export default router;
