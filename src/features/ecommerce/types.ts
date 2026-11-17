/**
 * Future E-Commerce Module Extension Contracts (Inactive in initial portfolio release).
 * Mirrors backend Domain interfaces for Products, Cart, Orders, and Payment Strategy (eSewa / Khalti / Stripe).
 */

export type PaymentProviderType = 'esewa' | 'khalti' | 'stripe';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'fulfilled';

export interface ProductBlueprint {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  priceNpr: number;
  priceUsd: number;
  inventoryCount: number;
  isDigital: boolean;
}

export interface CartItemBlueprint {
  productId: number;
  quantity: number;
}

export interface PaymentInitiationRequest {
  orderId: string;
  provider: PaymentProviderType;
  idempotencyKey: string;
  returnUrl: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  providerTransactionId: string;
  amountVerified: number;
  currency: 'NPR' | 'USD';
}
