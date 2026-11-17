using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Interfaces;
using Portfolio.Infrastructure.Identity;
using Portfolio.Infrastructure.Payments;
using Portfolio.Infrastructure.Persistence.Context;
using Portfolio.Infrastructure.Persistence.Repositories;

namespace Portfolio.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        services.AddDbContext<PortfolioDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsAssembly(typeof(PortfolioDbContext).Assembly.FullName)));

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 10;
                options.Password.RequireUppercase = true;
            })
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<PortfolioDbContext>();

        services.AddScoped<IPortfolioDataStore, PortfolioDataStore>();
        services.AddScoped<IAuditTrailService, PortfolioDataStore>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        // Future E-Commerce Strategy registration (not exposed until e-commerce module is activated)
        services.AddScoped<IPaymentGateway, EsewaPaymentGateway>();
        services.AddScoped<IPaymentGateway, KhaltiPaymentGateway>();
        services.AddScoped<IPaymentGateway, StripePaymentGateway>();
        services.AddScoped<IPaymentGatewayResolver, PaymentGatewayResolver>();

        return services;
    }
}
