using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Application.DTOs;
using Portfolio.Domain.Entities;
using Portfolio.Infrastructure.Persistence.Context;
using Portfolio.Shared.Responses;

namespace Portfolio.Infrastructure.Persistence.Repositories;

public sealed class PortfolioDataStore(PortfolioDbContext db) : IPortfolioDataStore, IAuditTrailService
{
    public async Task<ProfileDto?> GetProfileAsync(CancellationToken ct = default)
    {
        var p = await db.Profiles.AsNoTracking().FirstOrDefaultAsync(ct);
        if (p is null) return null;
        return new ProfileDto(
            p.Id, p.FullName, p.Headline, p.Tagline, p.Bio, p.CareerObjective,
            p.Email, p.PhonePrimary, p.PhoneSecondary, p.Location, p.AvatarUrl, p.CvUrl,
            p.LinkedinUrl, p.GithubPrimaryUrl, p.GithubSecondaryUrl, p.Availability,
            p.BlogEnabled, p.SeoTitle, p.SeoDescription);
    }

    public async Task<PagedResult<ProjectDto>> GetProjectsAsync(
        string? category, string? tech, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        var query = db.Projects.AsNoTracking().Include(x => x.Technologies).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(x => x.Category == category);

        if (!string.IsNullOrWhiteSpace(tech) && !tech.Equals("All", StringComparison.OrdinalIgnoreCase))
            query = query.Where(x => x.Technologies.Any(t => t.TechnologyName == tech));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x =>
                x.Title.ToLower().Contains(term) ||
                x.ShortDescription.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ProjectDto(
                x.Id, x.Title, x.Slug, x.Category, x.ShortDescription, x.FullDescription,
                x.ArchitectureNotes, x.ImageUrl, x.GithubUrl, x.LiveDemoUrl,
                x.Technologies.Select(t => t.TechnologyName).ToList(),
                x.Featured, x.IsPlaceholder))
            .ToListAsync(ct);

        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        return new PagedResult<ProjectDto>(items, total, page, pageSize, totalPages);
    }

    public async Task<ProjectDto?> GetProjectBySlugOrIdAsync(string idOrSlug, CancellationToken ct = default)
    {
        var isId = int.TryParse(idOrSlug, out var id);
        var entity = await db.Projects.AsNoTracking().Include(x => x.Technologies)
            .FirstOrDefaultAsync(x => isId ? x.Id == id : x.Slug == idOrSlug, ct);

        return entity is null
            ? null
            : new ProjectDto(
                entity.Id, entity.Title, entity.Slug, entity.Category, entity.ShortDescription,
                entity.FullDescription, entity.ArchitectureNotes, entity.ImageUrl, entity.GithubUrl,
                entity.LiveDemoUrl, entity.Technologies.Select(t => t.TechnologyName).ToList(),
                entity.Featured, entity.IsPlaceholder);
    }

    public async Task<int> CreateProjectAsync(CreateProjectRequest request, string actorEmail, CancellationToken ct = default)
    {
        var slug = request.Title.ToLowerInvariant().Replace(' ', '-').Trim('-');
        var project = new Project
        {
            Title = request.Title,
            Slug = slug,
            Category = request.Category,
            ShortDescription = request.ShortDescription,
            FullDescription = request.FullDescription,
            ArchitectureNotes = request.ArchitectureNotes,
            ImageUrl = request.ImageUrl,
            GithubUrl = request.GithubUrl,
            LiveDemoUrl = request.LiveDemoUrl,
            Featured = request.Featured,
            IsPlaceholder = request.IsPlaceholder,
            Technologies = request.Technologies.Select(t => new ProjectTechnology { TechnologyName = t }).ToList()
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync(ct);
        await RecordAsync(actorEmail, "CREATE", "Project", project.Id.ToString(), $"Created {project.Title}", ct);
        return project.Id;
    }

    public async Task<int> SaveContactMessageAsync(ContactSubmissionRequest request, string? ipAddress, CancellationToken ct = default)
    {
        var msg = new ContactMessage
        {
            SenderName = request.SenderName.Trim(),
            SenderEmail = request.SenderEmail.Trim(),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            IpAddress = ipAddress
        };
        db.ContactMessages.Add(msg);
        await db.SaveChangesAsync(ct);
        return msg.Id;
    }

    public async Task RecordAsync(
        string userEmail, string action, string entityType, string? entityId, string? details, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserEmail = userEmail,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details
        });
        await db.SaveChangesAsync(ct);
    }
}
