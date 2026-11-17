namespace Portfolio.Application.DTOs;

public sealed record ProfileDto(
    int Id,
    string FullName,
    string Headline,
    string Tagline,
    string Bio,
    string CareerObjective,
    string Email,
    string PhonePrimary,
    string PhoneSecondary,
    string Location,
    string AvatarUrl,
    string CvUrl,
    string LinkedinUrl,
    string GithubPrimaryUrl,
    string GithubSecondaryUrl,
    string Availability,
    bool BlogEnabled,
    string SeoTitle,
    string SeoDescription);

public sealed record ProjectDto(
    int Id,
    string Title,
    string Slug,
    string Category,
    string ShortDescription,
    string FullDescription,
    string ArchitectureNotes,
    string? ImageUrl,
    string? GithubUrl,
    string? LiveDemoUrl,
    IReadOnlyList<string> Technologies,
    bool Featured,
    bool IsPlaceholder);

public sealed record CreateProjectRequest(
    string Title,
    string Category,
    string ShortDescription,
    string FullDescription,
    string ArchitectureNotes,
    string? ImageUrl,
    string? GithubUrl,
    string? LiveDemoUrl,
    IReadOnlyList<string> Technologies,
    bool Featured,
    bool IsPlaceholder);

public sealed record ContactSubmissionRequest(
    string SenderName,
    string SenderEmail,
    string Subject,
    string Message);
