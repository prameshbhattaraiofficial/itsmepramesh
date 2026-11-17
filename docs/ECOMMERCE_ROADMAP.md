# Future E-Commerce Integration Roadmap

The portfolio intentionally ships without active checkout UI or payment SDK dependencies. Extension points are prepared cleanly across Frontend (`src/features/ecommerce/types.ts`), Domain (`FutureEcommerceEntities.cs`, `IPaymentGateway.cs`), and Infrastructure (`PaymentGatewayStrategies.cs`).

## Prepared Module Boundaries

- **Catalog & Cart**: `Product`, `ProductCategory`, `ProductImage`, `ShoppingCart`, `CartItem`, `Coupon`, `Inventory`.
- **Orders & Settlement**: `Order`, `OrderItem`, `PaymentTransaction`, `ShippingAddress`, `Invoice`.
- **Payment Strategy**: `IPaymentGatewayResolver` resolves `EsewaPaymentGateway`, `KhaltiPaymentGateway`, or `StripePaymentGateway` by `PaymentProvider`.

## Payment Security Workflow (When Activated)

1. Client creates a pending order; backend calculates authoritative prices server-side and generates an idempotency key.
2. Backend initiates payment session with the chosen provider (`eSewa` ePay v2 / `Khalti` KPG-2 / `Stripe` Checkout) using server-side secret keys from environment/secrets manager.
3. Customer completes payment on provider-hosted flow.
4. Backend **never trusts frontend redirect parameters alone**—it verifies the transaction status and exact amount directly against the provider's server-side verification API and validates webhook HMAC signatures.
5. `PaymentTransaction` and `Order` transition atomically inside a database transaction using idempotent guards.
