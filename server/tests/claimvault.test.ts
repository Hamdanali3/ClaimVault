import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { ensureProofStorageReady } from '../src/config/storage.js';
import { ensureDemoWorkspaceSeeded } from '../src/seed/demoSeeder.js';
import { createApp } from '../src/app.js';
import { addMonthsUTC } from '../src/services/ai/policyResolver.js';
import { runDeterministicExtraction } from '../src/services/ai/structuredExtractor.js';

const app = createApp();

describe('ClaimVault MERN + AI Backend Integration Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await ensureProofStorageReady();
    await connectDatabase('memory');
    await ensureDemoWorkspaceSeeded(true);
  }, 60000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('handles leap-year safe month arithmetic accurately', () => {
    const leap = new Date('2024-02-29T12:00:00.000Z');
    const plus12 = addMonthsUTC(leap, 12);
    expect(plus12.toISOString().slice(0, 10)).toBe('2025-02-28');

    const jan31 = new Date('2026-01-31T12:00:00.000Z');
    const feb = addMonthsUTC(jan31, 1);
    expect(feb.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('serves the $facet dashboard with seeded Pakistani & global records', async () => {
    const res = await request(app).get('/api/v1/vault/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.urgentItems.length).toBeGreaterThanOrEqual(2);
    expect(res.body.allActiveItems.length).toBe(3);
    expect(res.body.resolvedItems.length).toBe(1);
    expect(res.body.metrics.totalMoneySavedOrRecovered).toBe(82000);

    const anker = res.body.urgentItems.find((i: { title: string }) =>
      i.title.includes('Anker Prime 67W'),
    );
    expect(anker).toBeDefined();
    expect(anker.hoursRemaining).toBeLessThan(30);
    expect(anker.urgencyLevel).toBe('CRITICAL');
  });

  it('executes Visit 1 -> MerchantProfile Learning -> Visit 2 Optimistic Auto-Commit & Duplicate Guard', async () => {
    // Visit 1: Brand new unseen merchant with faded/low-confidence thermal purchase date
    const visit1Text = [
      'Merchant: Islamabad Audio Lab',
      'Item: Shure SM7B Studio Microphone',
      'Date: ??/11/2026 faded thermal slip',
      'Order #: IAL-7701',
      'Serial: SHURE-SM7B-9021',
      'Total Paid: PKR 118,000',
    ].join('\n');

    const extract1 = await request(app)
      .post('/api/v1/ingest/extract')
      .send({ rawText: visit1Text });

    expect(extract1.status).toBe(201);
    expect(extract1.body.autoCommitted).toBe(false);
    expect(extract1.body.merchantMemoryMatched).toBe(false);
    expect(extract1.body.lowConfidenceFields).toContain('purchaseDateISO');

    const itemId = extract1.body.item._id;

    // Duplicate SHA-256 guard check
    const dupCheck = await request(app)
      .post('/api/v1/ingest/extract')
      .send({ rawText: visit1Text });
    expect(dupCheck.status).toBe(200);
    expect(dupCheck.body.duplicateDetected).toBe(true);
    expect(dupCheck.body.duplicateItemId).toBe(itemId);

    // Confirm Visit 1 edits + save MerchantProfile memory
    const confirm1 = await request(app)
      .patch(`/api/v1/vault/${itemId}/confirm`)
      .send({
        purchaseDateISO: '2026-11-15',
        returnWindowDays: 14,
        warrantyMonths: 24,
        rememberMerchantDefaults: true,
        captureDurationSeconds: 57,
      });

    expect(confirm1.status).toBe(200);
    expect(confirm1.body.merchantProfile).toBeTruthy();
    expect(confirm1.body.merchantProfile.defaultReturnWindowDays).toBe(14);
    expect(confirm1.body.merchantProfile.defaultWarrantyMonths).toBe(24);

    // Visit 2: Another receipt from Islamabad Audio Lab -> auto-commits with Merchant Memory!
    const visit2Text = [
      'Merchant: Islamabad Audio Lab',
      'Item: Focusrite Scarlett 2i2 4th Gen',
      'Date: 2026-11-16',
      'Order #: IAL-7749',
      'Serial: FOC-2I2-4412',
      'Total Paid: PKR 58,500',
    ].join('\n');

    const extract2 = await request(app)
      .post('/api/v1/ingest/extract')
      .send({ rawText: visit2Text });

    expect(extract2.status).toBe(201);
    expect(extract2.body.merchantMemoryMatched).toBe(true);
    expect(extract2.body.autoCommitted).toBe(true);
    expect(extract2.body.policyResolution.source).toBe('MERCHANT_MEMORY');
    expect(extract2.body.item.returnWindowDays).toBe(14);
    expect(extract2.body.item.warrantyMonths).toBe(24);
  });

  it('streams a valid Claim Dossier PDF and resolves + restores (Undo) items', async () => {
    const dash = await request(app).get('/api/v1/vault/dashboard');
    const laptop = dash.body.allActiveItems.find((i: { title: string }) =>
      i.title.includes('Lenovo Legion Slim 5'),
    );
    expect(laptop).toBeDefined();

    // Download 1-Click PDF Claim Dossier
    const pdfRes = await request(app)
      .get(`/api/v1/vault/${laptop._id}/claim-dossier.pdf`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect((pdfRes.body as Buffer).subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // Public Resale Trust Certificate verification
    const verifyRes = await request(app).get(
      `/api/v1/verify/${laptop.publicVerificationToken}`,
    );
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.certificate.verified).toBe(true);
    expect(verifyRes.body.certificate.identifiers.serialLast4).toBe('••••982L');
    expect(verifyRes.body.certificate.email).toBeUndefined();

    // Resolve and Undo restore
    const resolveRes = await request(app)
      .post(`/api/v1/vault/${laptop._id}/resolve`)
      .send({ status: 'WARRANTY_CLAIMED', moneySavedOrRecovered: 345000 });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.item.status).toBe('WARRANTY_CLAIMED');

    const restoreRes = await request(app).post(`/api/v1/vault/${laptop._id}/restore`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.item.status).toBe('ACTIVE');
  });

  it('registers, logs in, and rotates refresh tokens with Argon2id isolation', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Ayesha Khan',
      email: 'ayesha@example.com',
      password: 'StrongPassword#2026',
      defaultCurrency: 'PKR',
    });

    expect(reg.status).toBe(201);
    expect(reg.body.accessToken).toBeTruthy();
    expect(reg.body.refreshToken).toBeTruthy();

    // Newly registered household starts empty (isolated from demo household)
    const userDash = await request(app)
      .get('/api/v1/vault/dashboard')
      .set('Authorization', `Bearer ${reg.body.accessToken}`);
    expect(userDash.status).toBe(200);
    expect(userDash.body.allActiveItems.length).toBe(0);

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'ayesha@example.com',
      password: 'StrongPassword#2026',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();

    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).not.toBe(loginRes.body.refreshToken);
  });

  it('extracts Daraz Order # without false-positive ORDER CONFIRMATION match and aligns SVG bounding boxes', () => {
    const darazReceipt = [
      'DARAZ MALL OFFICIAL ORDER CONFIRMATION',
      'Order #: DZ-778899',
      'Date: 2026-11-20',
      'Item: Samsung 27" Odyssey G5 QHD Monitor',
      'Serial: SAM-G527-4491',
      'Total Paid: PKR 64,500',
    ].join('\n');

    const parsed = runDeterministicExtraction(darazReceipt, '2026-11-20');
    expect(parsed.identifiers.orderNumber).toBe('DZ-778899');
    expect(parsed.identifiers.serialNumber).toBe('SAM-G527-4491');

    // Line 2 (Date) in a 6-line card (height=460, topPad=104, lineHeight=28 -> baselineY=160, yStart=(160-19)/460≈0.307)
    const dateBox = parsed.boundingBoxes.purchaseDateISO;
    expect(dateBox).toBeDefined();
    expect(dateBox[1]).toBeGreaterThanOrEqual(0.29);
    expect(dateBox[1]).toBeLessThanOrEqual(0.33);
  });

  it('returns structured health diagnostics, maps invalid ObjectId to 400, and supports merchant & member CRUD', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);
    expect(health.body.databaseConnected).toBe(true);

    const badId = await request(app).get('/api/v1/vault/not-a-valid-objectid');
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('INVALID_ID');

    // Merchant profile update & delete
    const listMerchants = await request(app).get('/api/v1/merchants');
    expect(listMerchants.status).toBe(200);
    const targetMerchant = listMerchants.body.merchantProfiles[0];
    expect(targetMerchant).toBeDefined();

    const patchMerchant = await request(app)
      .patch(`/api/v1/merchants/${targetMerchant._id}`)
      .send({ defaultReturnWindowDays: 21, defaultWarrantyMonths: 18 });
    expect(patchMerchant.status).toBe(200);
    expect(patchMerchant.body.merchantProfile.defaultReturnWindowDays).toBe(21);
    expect(patchMerchant.body.merchantProfile.defaultWarrantyMonths).toBe(18);

    const delMerchant = await request(app).delete(`/api/v1/merchants/${targetMerchant._id}`);
    expect(delMerchant.status).toBe(200);
    expect(delMerchant.body.ok).toBe(true);

    // Household member invite (VIEWER) & removal
    const invite = await request(app)
      .post('/api/v1/household/members')
      .send({ email: 'ayesha@example.com', role: 'VIEWER' });
    expect(invite.status).toBe(201);
    expect(invite.body.member.role).toBe('VIEWER');

    const removeMember = await request(app).delete(
      `/api/v1/household/members/${invite.body.member.userId}`,
    );
    expect(removeMember.status).toBe(200);
    expect(removeMember.body.ok).toBe(true);
  });
});
