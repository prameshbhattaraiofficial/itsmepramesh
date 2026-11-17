using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities.Commerce;

/// <summary>
/// Future E-Commerce Extension Point Entities (not wired into initial portfolio DbContext until activated).
/// </summary>
public sealed class ProductCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public sealed class Product : BaseEntity
{
    public int CategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal PriceNpr { get; set; }
    public decimal PriceUsd { get; set; }
    public int StockQuantity { get; set; }
    public bool IsDigital { get; set; }
}

public sealed class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "NPR";
    public string Status { get; set; } = "Pending";
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public sealed class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public string ProductTitleSnapshot { get; set; } = string.Empty;
    public decimal UnitPriceSnapshot { get; set; }
    public int Quantity { get; set; }
}

public sealed class PaymentTransaction : BaseEntity
{
    public int OrderId { get; set; }
    public string Provider { get; set; } = string.Empty; // Esewa | Khalti | Stripe
    public string IdempotencyKey { get; set; } = string.Empty;
    public string? ProviderReferenceId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "NPR";
    public string Status { get; set; } = "Initiated";
    public string? RawVerificationPayload { get; set; }
}
