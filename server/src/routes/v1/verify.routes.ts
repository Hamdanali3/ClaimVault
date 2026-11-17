import { Router } from 'express';
import { verifyPublicCertificate } from '../../controllers/verifyController.js';

const router = Router();

router.get('/:token', verifyPublicCertificate);

export default router;
