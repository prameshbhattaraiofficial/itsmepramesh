using Portfolio.Application.DTOs;
using Portfolio.Application.Validators;
using Portfolio.Domain.Interfaces;
using Portfolio.Infrastructure.Payments;
using Xunit;

namespace Portfolio.UnitTests;

public sealed class PaymentGatewayResolverTests
{
    [Theory]
    [InlineData(PaymentProvider.Esewa)]
    [InlineData(PaymentProvider.Khalti)]
    [InlineData(PaymentProvider.Stripe)]
    public void Resolve_ReturnsExpectedStrategy(PaymentProvider provider)
    {
        var resolver = new PaymentGatewayResolver([
            new EsewaPaymentGateway(),
            new KhaltiPaymentGateway(),
            new StripePaymentGateway()
        ]);

        var gateway = resolver.Resolve(provider);
        Assert.Equal(provider, gateway.Provider);
    }

    [Fact]
    public void ContactValidator_RejectsInvalidEmailAndShortMessage()
    {
        var validator = new ContactSubmissionValidator();
        var result = validator.Validate(new ContactSubmissionRequest("P", "not-an-email", "Hi", "Short"));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(ContactSubmissionRequest.SenderEmail));
    }
}
