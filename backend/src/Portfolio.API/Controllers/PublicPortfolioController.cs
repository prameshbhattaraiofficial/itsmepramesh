using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Portfolio.Application.Abstractions;
using Portfolio.Application.DTOs;
using Portfolio.Shared.Exceptions;
using Portfolio.Shared.Responses;

namespace Portfolio.API.Controllers;

[ApiController]
[Route("api/v1")]
public sealed class PublicPortfolioController(
    IPortfolioDataStore store,
    IValidator<ContactSubmissionRequest> contactValidator) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<ProfileDto>>> GetProfile(CancellationToken ct)
    {
        var profile = await store.GetProfileAsync(ct)
            ?? throw new NotFoundException("Portfolio profile not found.");
        return Ok(ApiResponse<ProfileDto>.Ok(profile));
    }

    [HttpGet("projects")]
    public async Task<ActionResult<ApiResponse<PagedResult<ProjectDto>>>> GetProjects(
        [FromQuery] string? category,
        [FromQuery] string? tech,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await store.GetProjectsAsync(category, tech, search, Math.Max(1, page), Math.Clamp(pageSize, 1, 50), ct);
        return Ok(ApiResponse<PagedResult<ProjectDto>>.Ok(result));
    }

    [HttpGet("projects/{idOrSlug}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> GetProject(string idOrSlug, CancellationToken ct)
    {
        var project = await store.GetProjectBySlugOrIdAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Project not found.");
        return Ok(ApiResponse<ProjectDto>.Ok(project));
    }

    [HttpPost("contact")]
    [EnableRateLimiting("contact-limit")]
    public async Task<ActionResult<ApiResponse<object>>> SubmitContact(
        [FromBody] ContactSubmissionRequest request,
        CancellationToken ct)
    {
        var validation = await contactValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            var errors = validation.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            throw new Shared.Exceptions.ValidationException("Validation failed.", errors);
        }

        var id = await store.SaveContactMessageAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return Created(string.Empty, ApiResponse<object>.Ok(new { id }, "Thank you for reaching out. Your message has been received."));
    }
}

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public sealed class AdminController(
    IPortfolioDataStore store,
    IValidator<CreateProjectRequest> projectValidator) : ControllerBase
{
    [HttpPost("projects")]
    public async Task<ActionResult<ApiResponse<object>>> CreateProject(
        [FromBody] CreateProjectRequest request,
        CancellationToken ct)
    {
        var validation = await projectValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new Shared.Exceptions.ValidationException("Invalid project data.");

        var actor = User.Identity?.Name ?? "admin";
        var id = await store.CreateProjectAsync(request, actor, ct);
        return CreatedAtAction(nameof(PublicPortfolioController.GetProject), "PublicPortfolio", new { idOrSlug = id }, ApiResponse<object>.Ok(new { id }, "Project created."));
    }
}
