import { Router } from 'express';
import multer from 'multer';
import { ingestAndExtract } from '../../controllers/ingestionController.js';
import { jwtAuth } from '../../middlewares/jwtAuth.js';
import { requireHouseholdRole } from '../../middlewares/householdRbac.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain';
    if (!ok) {
      cb(new Error('Unsupported proof file type. Upload an image, PDF, or text file.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  '/extract',
  jwtAuth,
  requireHouseholdRole('EDITOR'),
  upload.single('file'),
  ingestAndExtract,
);

export default router;
