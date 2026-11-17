import { Router } from 'express';
import authRoutes from './auth.routes.js';
import ingestRoutes from './ingest.routes.js';
import vaultRoutes from './vault.routes.js';
import householdRoutes from './household.routes.js';
import merchantRoutes from './merchant.routes.js';
import verifyRoutes from './verify.routes.js';

const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/ingest', ingestRoutes);
v1Router.use('/vault', vaultRoutes);
v1Router.use('/household', householdRoutes);
v1Router.use('/merchants', merchantRoutes);
v1Router.use('/verify', verifyRoutes);

export default v1Router;
