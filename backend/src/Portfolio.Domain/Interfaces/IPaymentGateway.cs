namespace Portfolio.Domain.Interfaces;

public enum PaymentProvider
{
    Esewa,
    Khalti,
    Stripe
}

public sealed record PaymentInitiationRequest(
    string OrderNumber,
    decimal Amount,
    string Currency,
    string ReturnUrl,
    string FailureUrl,
    string IdempotencyKey);

public sealed record PaymentInitiationResult(
    bool Success,
    string RedirectOrPaymentUrl,
    string ProviderSessionId);

public sealed record PaymentVerificationRequest(
    string OrderNumber,
    string ProviderTransactionId,
    decimal ExpectedAmount,
    string Currency);

public sealed record PaymentVerificationResult(
    bool Verified,
    string ProviderTransactionId,
    decimal VerifiedAmount,
    string Status);

/// <summary>
/// Provider-independent payment abstraction supporting Strategy Pattern for eSewa, Khalti, and Stripe.
/// Activated only when the future E-Commerce module is enabled.
/// </summary>
public interface IPaymentGateway
{
    PaymentProvider Provider { get; }
    Task<PaymentInitiationResult> InitiatePaymentAsync(PaymentInitiationRequest request, CancellationToken ct = default);
    Task<PaymentVerificationResult> VerifyPaymentAsync(PaymentVerificationRequest request, CancellationToken ct = default);
    bool VerifyWebhookSignature(string payload, string signatureHeader);
}

public interface IPaymentGatewayResolver
{
    IPaymentGateway Resolve(PaymentProvider provider);
}
