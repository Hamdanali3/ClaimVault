import os from 'node:os';
import {
  BUILTIN_MERCHANT_RULES,
  ExtractionResultSchema,
  type BoundingBox,
  type ExtractionResult,
} from '@claimvault/shared';
import { env } from '../../config/env.js';

export interface StructuredExtractionOutput {
  extraction: ExtractionResult;
  rawOcrText: string;
  engineUsed: string;
}

const GEMINI_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: ['PHYSICAL_ASSET', 'SUBSCRIPTION', 'UTILITY_BILL'] },
    merchantName: { type: 'STRING' },
    title: { type: 'STRING' },
    category: { type: 'STRING' },
    purchasePrice: { type: 'NUMBER' },
    currency: { type: 'STRING' },
    purchaseDateISO: { type: 'STRING' },
    identifiers: {
      type: 'OBJECT',
      properties: {
        orderNumber: { type: 'STRING', nullable: true },
        serialNumber: { type: 'STRING', nullable: true },
        imei: { type: 'STRING', nullable: true },
        modelCode: { type: 'STRING', nullable: true },
      },
    },
    explicitReturnDaysOnReceipt: { type: 'INTEGER', nullable: true },
    explicitWarrantyMonthsOnReceipt: { type: 'INTEGER', nullable: true },
    billingCycle: { type: 'STRING', enum: ['NONE', 'MONTHLY', 'YEARLY'] },
    fieldConfidence: {
      type: 'OBJECT',
      properties: {
        merchantName: { type: 'NUMBER' },
        title: { type: 'NUMBER' },
        purchasePrice: { type: 'NUMBER' },
        purchaseDateISO: { type: 'NUMBER' },
        serialNumber: { type: 'NUMBER' },
        orderNumber: { type: 'NUMBER' },
      },
    },
    boundingBoxes: {
      type: 'OBJECT',
      properties: {
        merchantName: { type: 'ARRAY', items: { type: 'NUMBER' } },
        title: { type: 'ARRAY', items: { type: 'NUMBER' } },
        purchasePrice: { type: 'ARRAY', items: { type: 'NUMBER' } },
        purchaseDateISO: { type: 'ARRAY', items: { type: 'NUMBER' } },
        serialNumber: { type: 'ARRAY', items: { type: 'NUMBER' } },
        orderNumber: { type: 'ARRAY', items: { type: 'NUMBER' } },
      },
    },
  },
  required: [
    'kind',
    'merchantName',
    'title',
    'purchasePrice',
    'currency',
    'purchaseDateISO',
    'billingCycle',
  ],
};

function sanitizeBoundingBox(box: unknown): BoundingBox | null {
  if (!Array.isArray(box) || box.length !== 4) return null;
  const nums = box.map((n) => Number(n));
  if (nums.some((n) => Number.isNaN(n))) return null;
  const clamped = nums.map((n) => Math.max(0, Math.min(1, n))) as BoundingBox;
  return clamped;
}

function sanitizeExtraction(
  raw: Record<string, unknown>,
  fallbackDateISO = new Date().toISOString().slice(0, 10),
): ExtractionResult {
  const rawBoxes = (raw.boundingBoxes as Record<string, unknown> | undefined) ?? {};
  const cleanBoxes: Record<string, BoundingBox> = {};
  for (const [k, v] of Object.entries(rawBoxes)) {
    const b = sanitizeBoundingBox(v);
    if (b) cleanBoxes[k] = b;
  }

  const rawConf = (raw.fieldConfidence as Record<string, unknown> | undefined) ?? {};
  const cleanConf: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawConf)) {
    const num = Number(v);
    if (!Number.isNaN(num)) {
      cleanConf[k] = Math.max(0, Math.min(1, Number(num.toFixed(2))));
    }
  }

  const rawIdentifiers = (raw.identifiers as Record<string, unknown> | undefined) ?? {};
  const dateStr =
    typeof raw.purchaseDateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.purchaseDateISO)
      ? raw.purchaseDateISO
      : fallbackDateISO;

  return ExtractionResultSchema.parse({
    kind: raw.kind ?? 'PHYSICAL_ASSET',
    merchantName: String(raw.merchantName || 'Local Merchant').trim(),
    title: String(raw.title || 'Purchased Item').trim(),
    category: String(raw.category || 'Electronics').trim(),
    purchasePrice: Math.max(0, Number(raw.purchasePrice) || 0),
    currency: String(raw.currency || 'PKR').toUpperCase().slice(0, 5),
    purchaseDateISO: dateStr,
    identifiers: {
      orderNumber: rawIdentifiers.orderNumber ? String(rawIdentifiers.orderNumber) : null,
      serialNumber: rawIdentifiers.serialNumber ? String(rawIdentifiers.serialNumber) : null,
      imei: rawIdentifiers.imei ? String(rawIdentifiers.imei) : null,
      modelCode: rawIdentifiers.modelCode ? String(rawIdentifiers.modelCode) : null,
    },
    explicitReturnDaysOnReceipt:
      typeof raw.explicitReturnDaysOnReceipt === 'number'
        ? Math.max(0, Math.round(raw.explicitReturnDaysOnReceipt))
        : null,
    explicitWarrantyMonthsOnReceipt:
      typeof raw.explicitWarrantyMonthsOnReceipt === 'number'
        ? Math.max(0, Math.round(raw.explicitWarrantyMonthsOnReceipt))
        : null,
    billingCycle: raw.billingCycle ?? 'NONE',
    fieldConfidence: cleanConf,
    boundingBoxes: cleanBoxes,
  });
}

const GEMINI_MODEL_CANDIDATES = [
  'gemini-flash-latest',
  'gemini-3-flash-preview',
];

let openAiCooldownUntil = 0;

async function callGeminiStructuredExtraction(params: {
  text: string;
  imageBuffer: Buffer | null;
  todayISO: string;
}): Promise<{ extraction: ExtractionResult; modelUsed: string } | null> {
  if (!env.GEMINI_API_KEY) return null;

  const hasText = params.text.trim().length >= 20;
  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        `You are a deterministic receipt and invoice parser. Today's date is ${params.todayISO}.`,
        'Extract merchantName, concise product/plan title, category, purchasePrice (numeric), currency (ISO 3-letter e.g. PKR or USD), purchaseDateISO (YYYY-MM-DD), identifiers (orderNumber, serialNumber, imei, modelCode), explicitReturnDaysOnReceipt, explicitWarrantyMonthsOnReceipt, billingCycle, per-field confidence (0.0-1.0), and normalized [x1,y1,x2,y2] bounding boxes in [0,1].',
        'If thermal ink looks smudged or a date/price is ambiguous (for instance "??/11/2026" or "[faded]"), set purchaseDateISO confidence < 0.70.',
        params.text ? `Receipt / Order Text:\n${params.text}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
  ];

  // Only send image bytes when there is no clean extracted text (real camera/scan uploads)
  if (!hasText && params.imageBuffer) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: params.imageBuffer.toString('base64'),
      },
    });
  }

  const deadlineAt = Date.now() + 8000;

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs < 1500) break;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.0,
              responseMimeType: 'application/json',
              responseSchema: GEMINI_JSON_SCHEMA,
            },
          }),
          signal: AbortSignal.timeout(Math.min(5000, remainingMs)),
        },
      );

      if (!res.ok) {
        console.warn(`[AI Gemini] ${model} returned HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      return {
        extraction: sanitizeExtraction(parsed, params.todayISO),
        modelUsed: model,
      };
    } catch (err) {
      console.warn(
        `[AI Gemini] ${model} error:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return null;
}

async function callOpenAIStructuredExtraction(params: {
  text: string;
  imageBuffer: Buffer | null;
  todayISO: string;
}): Promise<ExtractionResult | null> {
  if (!env.OPENAI_API_KEY || Date.now() < openAiCooldownUntil) return null;

  const hasText = params.text.trim().length >= 20;
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Today is ${params.todayISO}. Parse this receipt/order into strict JSON with merchantName, title, kind (PHYSICAL_ASSET|SUBSCRIPTION|UTILITY_BILL), category, purchasePrice, currency, purchaseDateISO (YYYY-MM-DD), identifiers, explicitReturnDaysOnReceipt, explicitWarrantyMonthsOnReceipt, billingCycle (NONE|MONTHLY|YEARLY), fieldConfidence, and normalized [x1,y1,x2,y2] boundingBoxes.\n\n${params.text}`,
    },
  ];
  if (!hasText && params.imageBuffer) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${params.imageBuffer.toString('base64')}`,
      },
    });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You output strictly valid JSON matching the requested receipt schema.',
        },
        { role: 'user', content: userContent },
      ],
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    console.warn(`[AI OpenAI] gpt-4o-mini returned HTTP ${res.status}`);
    if (res.status === 429 || res.status === 401) {
      openAiCooldownUntil = Date.now() + 5 * 60 * 1000;
    }
    return null;
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;
  return sanitizeExtraction(JSON.parse(content) as Record<string, unknown>, params.todayISO);
}

async function runLocalTesseractOcr(imageBuffer: Buffer): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      cachePath: os.tmpdir(),
    });
    try {
      const result = await worker.recognize(imageBuffer);
      return result.data.text ?? '';
    } finally {
      await worker.terminate();
    }
  } catch {
    return '';
  }
}

function parseDateFromText(text: string, fallbackISO: string): {
  iso: string;
  confidence: number;
  matchedLineIndex: number;
} {
  const lines = text.split(/\r?\n/);

  // Explicit smudged/uncertain markers in thermal receipts
  const hasThermalNoise = /\?{2,}|faded|smudg|illegible|blur/i.test(text);

  // 1. YYYY-MM-DD
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (m) {
      const yyyy = m[1];
      const mm = m[2].padStart(2, '0');
      const dd = m[3].padStart(2, '0');
      return {
        iso: `${yyyy}-${mm}-${dd}`,
        confidence: hasThermalNoise && /date/i.test(lines[i]) ? 0.64 : 0.96,
        matchedLineIndex: i,
      };
    }
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return {
        iso: `${yyyy}-${mm}-${dd}`,
        confidence: hasThermalNoise && /date/i.test(lines[i]) ? 0.68 : 0.93,
        matchedLineIndex: i,
      };
    }
  }

  // 3. "16 Nov 2026" or "Nov 16, 2026"
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  for (let i = 0; i < lines.length; i++) {
    const m1 = lines[i].match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[, ]+(20\d{2})\b/i);
    if (m1) {
      return {
        iso: `${m1[3]}-${months[m1[2].slice(0, 3).toLowerCase()]}-${m1[1].padStart(2, '0')}`,
        confidence: hasThermalNoise && /date/i.test(lines[i]) ? 0.65 : 0.95,
        matchedLineIndex: i,
      };
    }
    const m2 = lines[i].match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[, ]+(20\d{2})\b/i);
    if (m2) {
      return {
        iso: `${m2[3]}-${months[m2[1].slice(0, 3).toLowerCase()]}-${m2[2].padStart(2, '0')}`,
        confidence: hasThermalNoise && /date/i.test(lines[i]) ? 0.65 : 0.95,
        matchedLineIndex: i,
      };
    }
  }

  return {
    iso: fallbackISO,
    confidence: 0.62, // Low confidence triggers Eric Horvitz amber 1-tap verification!
    matchedLineIndex: 2,
  };
}

function lineToBox(lineIndex: number, totalLines: number, x1 = 0.07, x2 = 0.78): BoundingBox {
  const safeTotal = Math.max(totalLines, 10);
  const yStart = Math.min(0.84, Math.max(0.12, 0.14 + (lineIndex / safeTotal) * 0.68));
  const yEnd = Math.min(0.94, yStart + 0.055);
  return [
    Number(x1.toFixed(2)),
    Number(yStart.toFixed(2)),
    Number(x2.toFixed(2)),
    Number(yEnd.toFixed(2)),
  ];
}

export function runDeterministicExtraction(
  rawText: string,
  todayISO: string,
  fileNameHint?: string,
): ExtractionResult {
  const sourceText = rawText.trim() || fileNameHint || 'Retail Store Purchase';
  const lines = sourceText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const lowerAll = sourceText.toLowerCase();

  // Match known merchant in built-in rules
  let matchedRule = BUILTIN_MERCHANT_RULES.find((rule) =>
    rule.aliases.some((alias) => lowerAll.includes(alias)),
  );

  // Extract explicit merchant line if present ("Merchant: X" or "Store: X" or line 0)
  let merchantLineIdx = 0;
  let merchantName = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:merchant|store|vendor|retailer|from|seller)\s*[:\-]\s*(.+)$/i);
    if (m) {
      merchantName = m[1].trim();
      merchantLineIdx = i;
      break;
    }
  }
  if (!merchantName) {
    if (matchedRule) {
      merchantName = matchedRule.displayName;
      const idx = lines.findIndex((l) =>
        matchedRule!.aliases.some((a) => l.toLowerCase().includes(a)),
      );
      merchantLineIdx = idx >= 0 ? idx : 0;
    } else {
      merchantName = (lines[0] ?? 'Local Merchant').replace(/^receipt\s*[-:]\s*/i, '').slice(0, 60);
    }
  }
  if (!matchedRule) {
    matchedRule = BUILTIN_MERCHANT_RULES.find((r) =>
      r.aliases.some((a) => merchantName.toLowerCase().includes(a)),
    );
  }

  // Extract Item Title
  let titleLineIdx = Math.min(1, lines.length - 1);
  let title = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:item|product|description|plan|service|subject)\s*[:\-]\s*(.+)$/i);
    if (m) {
      title = m[1].trim();
      titleLineIdx = i;
      break;
    }
  }
  if (!title) {
    const candidate = lines.find(
      (l, idx) =>
        idx !== merchantLineIdx &&
        !/^(?:date|total|amount|order|serial|imei|warranty|return|receipt|invoice|tax|subtotal|thank)/i.test(
          l,
        ) &&
        l.length >= 4,
    );
    if (candidate) {
      title = candidate.replace(/\s+(?:PKR|Rs\.?|USD|\$)\s*[\d,]+.*$/i, '').trim();
      titleLineIdx = lines.indexOf(candidate);
    }
  }
  if (!title) {
    title = `${merchantName} Purchase`;
  }

  // Extract Price & Currency
  let priceLineIdx = lines.length > 2 ? 2 : 0;
  let purchasePrice = 0;
  let currency = matchedRule?.defaultCurrency ?? 'PKR';
  let priceConfidence = 0.68;

  const priceRegex =
    /(?:(PKR|Rs\.?|₨|USD|\$|EUR|€|GBP|£)\s*([\d,]+(?:\.\d{1,2})?))|(?:([\d,]+(?:\.\d{1,2})?)\s*(PKR|Rs\.?|USD))/i;

  // Prefer lines with Total / Price / Amount / Paid
  const orderedIndices = [
    ...lines.map((_, i) => i).filter((i) => /total|amount|price|paid|bill|charge/i.test(lines[i])),
    ...lines.map((_, i) => i),
  ];

  for (const idx of orderedIndices) {
    const m = lines[idx].match(priceRegex);
    if (m) {
      const sym = (m[1] ?? m[4] ?? '').toUpperCase();
      const numStr = (m[2] ?? m[3] ?? '0').replace(/,/g, '');
      const val = Number.parseFloat(numStr);
      if (!Number.isNaN(val) && val > 0) {
        purchasePrice = val;
        priceLineIdx = idx;
        priceConfidence = /\?{2,}|faded|blur/i.test(lines[idx]) ? 0.69 : 0.97;
        if (sym.includes('USD') || sym === '$') currency = 'USD';
        else if (sym.includes('EUR') || sym === '€') currency = 'EUR';
        else if (sym.includes('GBP') || sym === '£') currency = 'GBP';
        else if (sym.includes('PKR') || sym.includes('RS') || sym === '₨') currency = 'PKR';
        break;
      }
    }
  }

  // Extract Purchase Date
  const dateParsed = parseDateFromText(sourceText, todayISO);

  // Extract Identifiers
  let orderLineIdx = 1;
  let serialLineIdx = 2;
  const orderMatch = sourceText.match(
    /(?:order(?:\s*(?:id|no|number|#))?|inv(?:oice)?(?:\s*#)?)\s*[:#\-]?\s*([A-Z0-9-]{4,28})/i,
  );
  if (orderMatch) {
    const idx = lines.findIndex((l) => l.includes(orderMatch[1]));
    if (idx >= 0) orderLineIdx = idx;
  }

  const serialMatch = sourceText.match(
    /(?:serial(?:\s*(?:no|number|#))?|s\/n|sn)\s*[:#\-]?\s*([A-Z0-9-]{5,32})/i,
  );
  if (serialMatch) {
    const idx = lines.findIndex((l) => l.includes(serialMatch[1]));
    if (idx >= 0) serialLineIdx = idx;
  }

  const imeiMatch = sourceText.match(/imei\s*[:#\-]?\s*(\d{14,17})/i);
  const modelMatch = sourceText.match(/(?:model(?:\s*code)?)\s*[:#\-]?\s*([A-Z0-9-]{3,24})/i);

  // Explicit Return Window & Warranty Terms
  let explicitReturnDaysOnReceipt: number | null = null;
  const returnMatch = sourceText.match(/(\d{1,3})\s*[- ]?(?:day|days)\s*(?:return|exchange|refund|check)/i);
  if (returnMatch) {
    explicitReturnDaysOnReceipt = Number.parseInt(returnMatch[1], 10);
  }

  let explicitWarrantyMonthsOnReceipt: number | null = null;
  const warrantyMonthMatch = sourceText.match(/(\d{1,3})\s*[- ]?(?:month|months|mo)\s*(?:official\s+)?warranty/i);
  const warrantyYearMatch = sourceText.match(/(\d{1,2})\s*[- ]?(?:year|years|yr)\s*(?:official\s+)?warranty/i);
  if (warrantyMonthMatch) {
    explicitWarrantyMonthsOnReceipt = Number.parseInt(warrantyMonthMatch[1], 10);
  } else if (warrantyYearMatch) {
    explicitWarrantyMonthsOnReceipt = Number.parseInt(warrantyYearMatch[1], 10) * 12;
  }

  // Kind & Billing Cycle
  let kind: ExtractionResult['kind'] = matchedRule?.kind ?? 'PHYSICAL_ASSET';
  let billingCycle: ExtractionResult['billingCycle'] = matchedRule?.billingCycle ?? 'NONE';
  if (/trial|subscription|auto[- ]?renew|monthly plan|annual plan|saas|seat/i.test(sourceText)) {
    kind = 'SUBSCRIPTION';
    billingCycle = /year|annual/i.test(sourceText) ? 'YEARLY' : 'MONTHLY';
  } else if (/electricity|gas bill|fiber|broadband|internet bill|due date|utility/i.test(sourceText)) {
    kind = 'UTILITY_BILL';
    billingCycle = 'MONTHLY';
  }

  const fieldConfidence: Record<string, number> = {
    merchantName: matchedRule ? 0.99 : 0.93,
    title: title.length > 4 ? 0.96 : 0.84,
    purchasePrice: priceConfidence,
    purchaseDateISO: dateParsed.confidence,
  };
  if (serialMatch) {
    fieldConfidence.serialNumber = /\?/.test(serialMatch[1]) ? 0.72 : 0.93;
  }
  if (orderMatch) {
    fieldConfidence.orderNumber = 0.96;
  }

  const boundingBoxes: Record<string, BoundingBox> = {
    merchantName: lineToBox(merchantLineIdx, lines.length, 0.06, 0.64),
    title: lineToBox(titleLineIdx, lines.length, 0.06, 0.84),
    purchasePrice: lineToBox(priceLineIdx, lines.length, 0.45, 0.91),
    purchaseDateISO: lineToBox(dateParsed.matchedLineIndex, lines.length, 0.06, 0.56),
  };
  if (orderMatch) {
    boundingBoxes.orderNumber = lineToBox(orderLineIdx, lines.length, 0.06, 0.65);
  }
  if (serialMatch) {
    boundingBoxes.serialNumber = lineToBox(serialLineIdx, lines.length, 0.06, 0.72);
  }

  return ExtractionResultSchema.parse({
    kind,
    merchantName,
    title: title.slice(0, 140),
    category: matchedRule?.category ?? (kind === 'SUBSCRIPTION' ? 'Software & Subscriptions' : 'Electronics'),
    purchasePrice,
    currency,
    purchaseDateISO: dateParsed.iso,
    identifiers: {
      orderNumber: orderMatch ? orderMatch[1] : null,
      serialNumber: serialMatch ? serialMatch[1] : null,
      imei: imeiMatch ? imeiMatch[1] : null,
      modelCode: modelMatch ? modelMatch[1] : null,
    },
    explicitReturnDaysOnReceipt,
    explicitWarrantyMonthsOnReceipt,
    billingCycle,
    fieldConfidence,
    boundingBoxes,
  });
}

export async function extractStructuredReceipt(params: {
  extractedTextFromFile: string;
  ocrReadableImageBuffer: Buffer | null;
  fileNameHint?: string;
}): Promise<StructuredExtractionOutput> {
  const todayISO = new Date().toISOString().slice(0, 10);
  let textToUse = params.extractedTextFromFile.trim();

  // 1. Live Gemini Flash Vision if configured
  if (
    env.AI_PRIMARY_PROVIDER !== 'local' &&
    (env.AI_PRIMARY_PROVIDER === 'gemini' || env.AI_PRIMARY_PROVIDER === 'auto') &&
    env.GEMINI_API_KEY
  ) {
    try {
      const geminiResult = await callGeminiStructuredExtraction({
        text: textToUse,
        imageBuffer: params.ocrReadableImageBuffer,
        todayISO,
      });
      if (geminiResult) {
        const heuristicFallback = textToUse
          ? runDeterministicExtraction(textToUse, todayISO, params.fileNameHint)
          : null;
        const mergedBoxes =
          Object.keys(geminiResult.extraction.boundingBoxes).length > 0
            ? geminiResult.extraction.boundingBoxes
            : (heuristicFallback?.boundingBoxes ?? {});
        return {
          extraction: {
            ...geminiResult.extraction,
            boundingBoxes: mergedBoxes,
          },
          rawOcrText:
            textToUse ||
            `${geminiResult.extraction.merchantName} - ${geminiResult.extraction.title}`,
          engineUsed: `${geminiResult.modelUsed}-structured`,
        };
      }
    } catch {
      // Fall through cleanly to OpenAI or local OCR fallback
    }
  }

  // 2. Live OpenAI gpt-4o-mini if configured
  if (
    env.AI_PRIMARY_PROVIDER !== 'local' &&
    (env.AI_PRIMARY_PROVIDER === 'openai' || env.AI_PRIMARY_PROVIDER === 'auto') &&
    env.OPENAI_API_KEY
  ) {
    try {
      const openAiResult = await callOpenAIStructuredExtraction({
        text: textToUse,
        imageBuffer: params.ocrReadableImageBuffer,
        todayISO,
      });
      if (openAiResult) {
        return {
          extraction: openAiResult,
          rawOcrText: textToUse || `${openAiResult.merchantName} - ${openAiResult.title}`,
          engineUsed: 'openai-gpt-4o-mini-structured',
        };
      }
    } catch {
      // Fall through cleanly to local OCR fallback
    }
  }

  // 3. Local Tesseract OCR if image upload had no accompanying text
  let engineUsed = 'deterministic-regex-heuristic-v1';
  if (!textToUse && params.ocrReadableImageBuffer) {
    const ocrText = await runLocalTesseractOcr(params.ocrReadableImageBuffer);
    if (ocrText.trim().length > 0) {
      textToUse = ocrText.trim();
      engineUsed = 'tesseract-local-hybrid-v1';
    }
  }

  const extraction = runDeterministicExtraction(textToUse, todayISO, params.fileNameHint);
  return {
    extraction,
    rawOcrText: textToUse || `${extraction.merchantName} | ${extraction.title}`,
    engineUsed,
  };
}
