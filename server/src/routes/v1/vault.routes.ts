import { Router } from 'express';
import {
  confirmVaultItem,
  deleteVaultItem,
  getAuditLogs,
  getDashboard,
  getVaultItemById,
  listVaultItems,
  resetDemoWorkspace,
  resolveVaultItem,
  restoreVaultItem,
} from '../../controllers/vaultController.js';
import { downloadClaimDossierPdf } from '../../controllers/claimDossierController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const router = Router();

router.use(jwtAuth);

router.get('/dashboard', getDashboard);
router.get('/audit-logs', getAuditLogs);
router.post('/reset-demo', requireHouseholdRole('EDITOR'), resetDemoWorkspace);
router.get('/', listVaultItems);
router.get('/:id', getVaultItemById);
router.patch('/:id/confirm', requireHouseholdRole('EDITOR'), confirmVaultItem);

// Support both endpoint names specified across Sections 5.3 & 7.2
router.post('/:id/resolve', requireHouseholdRole('EDITOR'), resolveVaultItem);
router.post('/:id/outcome', requireHouseholdRole('EDITOR'), resolveVaultItem);

router.post('/:id/restore', requireHouseholdRole('EDITOR'), restoreVaultItem);
router.delete('/:id', requireHouseholdRole('EDITOR'), deleteVaultItem);

router.get('/:id/claim-pdf', downloadClaimDossierPdf);
router.get('/:id/claim-dossier.pdf', downloadClaimDossierPdf);

export default router;
