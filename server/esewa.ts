import crypto from 'node:crypto';

export interface EsewaConfig {
  mode: 'sandbox' | 'production';
  formUrl: string;
  statusUrl: string;
  productCode: string;
  secretKey: string;
}

export interface EsewaFormFields {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface EsewaDecodedCallback {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
  [key: string]: unknown;
}

export function getEsewaConfig(): EsewaConfig {
  const mode = process.env.ESEWA_ENV === 'production' ? 'production' : 'sandbox';
  const productCode = process.env.ESEWA_PRODUCT_CODE || (mode === 'sandbox' ? 'EPAYTEST' : '');
  const secretKey = process.env.ESEWA_SECRET_KEY || (mode === 'sandbox' ? '8gBm/:&EnhH.1/q' : '');

  if (!productCode || !secretKey) {
    throw new Error('eSewa production credentials (ESEWA_PRODUCT_CODE, ESEWA_SECRET_KEY) are not configured.');
  }

  return {
    mode,
    formUrl:
      mode === 'production'
        ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
        : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    statusUrl:
      mode === 'production'
        ? 'https://epay.esewa.com.np/api/epay/transaction/status/'
        : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/',
    productCode,
    secretKey,
  };
}

export function generateEsewaSignature(message: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

export function buildEsewaInitiation(params: {
  totalAmountNpr: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}): { formUrl: string; mode: 'sandbox' | 'production'; fields: EsewaFormFields } {
  const cfg = getEsewaConfig();
  const formattedTotal = (Math.round(params.totalAmountNpr * 100) / 100).toFixed(2);
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${formattedTotal},transaction_uuid=${params.transactionUuid},product_code=${cfg.productCode}`;
  const signature = generateEsewaSignature(message, cfg.secretKey);

  return {
    formUrl: cfg.formUrl,
    mode: cfg.mode,
    fields: {
      amount: formattedTotal,
      tax_amount: '0',
      total_amount: formattedTotal,
      transaction_uuid: params.transactionUuid,
      product_code: cfg.productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export function verifyEsewaCallbackPayload(encodedData: string): {
  valid: boolean;
  payload: EsewaDecodedCallback | null;
  reason?: string;
} {
  try {
    const cfg = getEsewaConfig();
    const jsonStr = Buffer.from(encodedData, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr) as EsewaDecodedCallback;

    if (!parsed || !parsed.signed_field_names || !parsed.signature || !parsed.transaction_uuid) {
      return { valid: false, payload: null, reason: 'Missing required eSewa callback fields.' };
    }

    const fieldList = String(parsed.signed_field_names)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const message = fieldList.map((field) => `${field}=${String(parsed[field] ?? '')}`).join(',');
    const expectedSig = generateEsewaSignature(message, cfg.secretKey);

    const providedBuf = Buffer.from(String(parsed.signature), 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: false, payload: parsed, reason: 'eSewa cryptographic signature mismatch.' };
    }

    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, payload: null, reason: 'Malformed Base64 callback payload.' };
  }
}

export interface EsewaStatusResponse {
  product_code: string;
  transaction_uuid: string;
  total_amount: number;
  status: 'COMPLETE' | 'PENDING' | 'FULL_REFUND' | 'PARTIAL_REFUND' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CANCELED' | string;
  ref_id: string | null;
}

export async function checkEsewaTransactionStatus(params: {
  totalAmountNpr: number;
  transactionUuid: string;
}): Promise<EsewaStatusResponse> {
  const cfg = getEsewaConfig();
  const formattedTotal = (Math.round(params.totalAmountNpr * 100) / 100).toFixed(2);
  const url = new URL(cfg.statusUrl);
  url.searchParams.set('product_code', cfg.productCode);
  url.searchParams.set('total_amount', formattedTotal);
  url.searchParams.set('transaction_uuid', params.transactionUuid);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`eSewa status verification failed with HTTP ${response.status}`);
  }

  return (await response.json()) as EsewaStatusResponse;
}
