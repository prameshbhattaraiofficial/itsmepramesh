using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class Profile : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string CareerObjective { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhonePrimary { get; set; } = string.Empty;
    public string PhoneSecondary { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string PermanentAddress { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string CvUrl { get; set; } = string.Empty;
    public string LinkedinUrl { get; set; } = string.Empty;
    public string GithubPrimaryUrl { get; set; } = string.Empty;
    public string GithubSecondaryUrl { get; set; } = string.Empty;
    public string Availability { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public string ReferenceRole { get; set; } = string.Empty;
    public string ReferencePhone { get; set; } = string.Empty;
    public bool BlogEnabled { get; set; }
    public string SeoTitle { get; set; } = string.Empty;
    public string SeoDescription { get; set; } = string.Empty;
}

public sealed class SkillCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public ICollection<Skill> Skills { get; set; } = new List<Skill>();
}

public sealed class Skill : BaseEntity
{
    public int CategoryId { get; set; }
    public SkillCategory? Category { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class Experience : BaseEntity
{
    public string Company { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string? EndDate { get; set; }
    public string DurationLabel { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string ResponsibilitiesJson { get; set; } = "[]";
    public string AchievementsJson { get; set; } = "[]";
    public string TechnologiesJson { get; set; } = "[]";
    public int DisplayOrder { get; set; }
}

public sealed class Education : BaseEntity
{
    public string Institution { get; set; } = string.Empty;
    public string? AffiliatedUniversity { get; set; }
    public string Degree { get; set; } = string.Empty;
    public string GraduationYear { get; set; } = string.Empty;
    public string? Grade { get; set; }
    public string HighlightsJson { get; set; } = "[]";
    public int DisplayOrder { get; set; }
}

public sealed class Certification : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string IssueDate { get; set; } = string.Empty;
    public string? Duration { get; set; }
    public string? CredentialUrl { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class Project : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public string ArchitectureNotes { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? GithubUrl { get; set; }
    public string? LiveDemoUrl { get; set; }
    public bool Featured { get; set; }
    public bool IsPlaceholder { get; set; }
    public int DisplayOrder { get; set; }
    public ICollection<ProjectTechnology> Technologies { get; set; } = new List<ProjectTechnology>();
}

public sealed class ProjectTechnology
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project? Project { get; set; }
    public string TechnologyName { get; set; } = string.Empty;
}

public sealed class Service : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string DeliverablesJson { get; set; } = "[]";
    public int DisplayOrder { get; set; }
}

public sealed class Testimonial : BaseEntity
{
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorRole { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public string Quote { get; set; } = string.Empty;
    public bool IsPlaceholder { get; set; }
    public int DisplayOrder { get; set; }
}

public sealed class ContactMessage : BaseEntity
{
    public string SenderName { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "unread";
    public string? IpAddress { get; set; }
}

public sealed class BlogCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public ICollection<BlogPost> Posts { get; set; } = new List<BlogPost>();
}

public sealed class BlogTag : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}

public sealed class BlogPost : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Excerpt { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public BlogCategory? Category { get; set; }
    public string TagsJson { get; set; } = "[]";
    public string? FeaturedImageUrl { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public bool Published { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public sealed class MediaFile : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Url { get; set; } = string.Empty;
}

public sealed class RefreshToken : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}

public sealed class AuditLog
{
    public int Id { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
