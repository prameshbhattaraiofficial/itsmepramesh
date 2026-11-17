namespace Portfolio.Shared.Exceptions;

public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class NotFoundException(string message) : AppException(message, 404);
public sealed class ValidationException(string message, Dictionary<string, string[]>? errors = null) : AppException(message, 400)
{
    public Dictionary<string, string[]>? Errors { get; } = errors;
}
public sealed class UnauthorizedException(string message) : AppException(message, 401);
public sealed class ForbiddenException(string message) : AppException(message, 403);
