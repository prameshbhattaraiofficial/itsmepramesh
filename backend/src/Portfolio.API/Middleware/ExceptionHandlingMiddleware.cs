using System.Text.Json;
using Portfolio.Shared.Exceptions;
using Portfolio.Shared.Responses;

namespace Portfolio.API.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";
            var errors = ex is ValidationException vex ? vex.Errors : null;
            var payload = ApiResponse<object?>.Fail(ex.Message, errors);
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            var payload = ApiResponse<object?>.Fail("An unexpected server error occurred.");
            await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
        }
    }
}
