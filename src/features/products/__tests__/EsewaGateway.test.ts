import { describe, expect, it } from 'vitest';
import {
  buildEsewaInitiation,
  generateEsewaSignature,
  verifyEsewaCallbackPayload,
} from '../../../../server/esewa';

describe('eSewa ePay v2 HMAC Signing & Verification', () => {
  it('generates signed form fields matching the official eSewa v2 contract', () => {
    const initiation = buildEsewaInitiation({
      totalAmountNpr: 6500,
      transactionUuid: 'ORD-2026-1001-a1b2c3',
      successUrl: 'https://example.com/payment/esewa/success',
      failureUrl: 'https://example.com/payment/esewa/failure',
    });

    expect(initiation.mode).toBe('sandbox');
    expect(initiation.formUrl).toBe('https://rc-epay.esewa.com.np/api/epay/main/v2/form');
    expect(initiation.fields.total_amount).toBe('6500.00');
    expect(initiation.fields.product_code).toBe('EPAYTEST');
    expect(initiation.fields.signed_field_names).toBe('total_amount,transaction_uuid,product_code');
    expect(initiation.fields.signature).toBeTruthy();
  });

  it('verifies authentic Base64 eSewa callbacks and rejects tampered payloads', () => {
    const signedFields = 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names';
    const rawPayload = {
      transaction_code: '000AWEO',
      status: 'COMPLETE',
      total_amount: '6,500.0',
      transaction_uuid: 'ORD-2026-1001-abc123',
      product_code: 'EPAYTEST',
      signed_field_names: signedFields,
    };

    const message = signedFields
      .split(',')
      .map((field) => `${field}=${rawPayload[field as keyof typeof rawPayload]}`)
      .join(',');
    const signature = generateEsewaSignature(message, '8gBm/:&EnhH.1/q');

    const encodedValid = Buffer.from(JSON.stringify({ ...rawPayload, signature })).toString('base64');
    const verified = verifyEsewaCallbackPayload(encodedValid);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.transaction_code).toBe('000AWEO');

    const encodedTampered = Buffer.from(
      JSON.stringify({ ...rawPayload, total_amount: '1.0', signature })
    ).toString('base64');
    const rejected = verifyEsewaCallbackPayload(encodedTampered);
    expect(rejected.valid).toBe(false);
  });
});
