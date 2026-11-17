using Portfolio.Domain.Interfaces;

namespace Portfolio.Infrastructure.Payments;

/// <summary>
/// Strategy Pattern stubs for future E-Commerce payment integration.
/// Never trust frontend redirects: verify every transaction server-side via official provider APIs.
/// </summary>
public sealed class EsewaPaymentGateway : IPaymentGateway
{
    public PaymentProvider Provider => PaymentProvider.Esewa;

    public Task<PaymentInitiationResult> InitiatePaymentAsync(PaymentInitiationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Activate the E-Commerce module and configure eSewa sandbox/production secrets before initiating payments.");

    public Task<PaymentVerificationResult> VerifyPaymentAsync(PaymentVerificationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Server-side eSewa status check endpoint requires active E-Commerce configuration.");

    public bool VerifyWebhookSignature(string payload, string signatureHeader) => false;
}

public sealed class KhaltiPaymentGateway : IPaymentGateway
{
    public PaymentProvider Provider => PaymentProvider.Khalti;

    public Task<PaymentInitiationResult> InitiatePaymentAsync(PaymentInitiationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Activate the E-Commerce module and configure Khalti secret keys before initiating payments.");

    public Task<PaymentVerificationResult> VerifyPaymentAsync(PaymentVerificationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Server-side Khalti lookup API verification requires active E-Commerce configuration.");

    public bool VerifyWebhookSignature(string payload, string signatureHeader) => false;
}

public sealed class StripePaymentGateway : IPaymentGateway
{
    public PaymentProvider Provider => PaymentProvider.Stripe;

    public Task<PaymentInitiationResult> InitiatePaymentAsync(PaymentInitiationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Activate the E-Commerce module and configure Stripe secret keys before initiating payments.");

    public Task<PaymentVerificationResult> VerifyPaymentAsync(PaymentVerificationRequest request, CancellationToken ct = default)
        => throw new NotSupportedException("Server-side Stripe PaymentIntent verification requires active E-Commerce configuration.");

    public bool VerifyWebhookSignature(string payload, string signatureHeader) => false;
}

public sealed class PaymentGatewayResolver(IEnumerable<IPaymentGateway> gateways) : IPaymentGatewayResolver
{
    private readonly Dictionary<PaymentProvider, IPaymentGateway> _map = gateways.ToDictionary(g => g.Provider);

    public IPaymentGateway Resolve(PaymentProvider provider) =>
        _map.TryGetValue(provider, out var gateway)
            ? gateway
            : throw new InvalidOperationException($"No payment gateway registered for provider '{provider}'.");
}
