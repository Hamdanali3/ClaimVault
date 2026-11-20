import { Router } from 'express';
import {
  deleteMerchantProfile,
  listMerchantProfiles,
  updateMerchantProfile,
} from '../../controllers/merchantController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const router = Router();

router.use(jwtAuth);
router.get('/', listMerchantProfiles);
router.patch('/:id', requireHouseholdRole('EDITOR'), updateMerchantProfile);
router.delete('/:id', requireHouseholdRole('EDITOR'), deleteMerchantProfile);

export default router;
