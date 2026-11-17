using FluentValidation;
using Portfolio.Application.DTOs;

namespace Portfolio.Application.Validators;

public sealed class ContactSubmissionValidator : AbstractValidator<ContactSubmissionRequest>
{
    public ContactSubmissionValidator()
    {
        RuleFor(x => x.SenderName).NotEmpty().MinimumLength(2).MaximumLength(120);
        RuleFor(x => x.SenderEmail).NotEmpty().EmailAddress().MaximumLength(180);
        RuleFor(x => x.Subject).NotEmpty().MinimumLength(3).MaximumLength(200);
        RuleFor(x => x.Message).NotEmpty().MinimumLength(10).MaximumLength(4000);
    }
}

public sealed class CreateProjectValidator : AbstractValidator<CreateProjectRequest>
{
    public CreateProjectValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MinimumLength(2).MaximumLength(200);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(80);
        RuleFor(x => x.ShortDescription).NotEmpty().MinimumLength(5).MaximumLength(500);
        RuleFor(x => x.FullDescription).NotEmpty().MinimumLength(5).MaximumLength(8000);
    }
}
