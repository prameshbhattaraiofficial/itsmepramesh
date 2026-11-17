using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Portfolio.Application.DTOs;
using Portfolio.Application.Validators;

namespace Portfolio.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IValidator<ContactSubmissionRequest>, ContactSubmissionValidator>();
        services.AddScoped<IValidator<CreateProjectRequest>, CreateProjectValidator>();
        return services;
    }
}
