using Portfolio.Application.DTOs;
using Portfolio.Domain.Entities;
using Portfolio.Shared.Responses;

namespace Portfolio.Application.Abstractions;

public interface IPortfolioDataStore
{
    Task<ProfileDto?> GetProfileAsync(CancellationToken ct = default);
    Task<PagedResult<ProjectDto>> GetProjectsAsync(string? category, string? tech, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<ProjectDto?> GetProjectBySlugOrIdAsync(string idOrSlug, CancellationToken ct = default);
    Task<int> CreateProjectAsync(CreateProjectRequest request, string actorEmail, CancellationToken ct = default);
    Task<int> SaveContactMessageAsync(ContactSubmissionRequest request, string? ipAddress, CancellationToken ct = default);
}

public interface IAuditTrailService
{
    Task RecordAsync(string userEmail, string action, string entityType, string? entityId, string? details, CancellationToken ct = default);
}
