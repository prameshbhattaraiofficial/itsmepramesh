# System Architecture

## Clean Architecture Layer Boundaries

- **Portfolio.Domain**: Pure entities (`Profile`, `Skill`, `Experience`, `Education`, `Certification`, `Project`, `Service`, `Testimonial`, `ContactMessage`, `BlogPost`, `RefreshToken`, `AuditLog`) and interfaces (`IPaymentGateway`). Zero external framework dependencies.
- **Portfolio.Application**: Use-case abstractions (`IPortfolioDataStore`), immutable DTO records, and FluentValidation rules. Depends only on `Domain` and `Shared`.
- **Portfolio.Infrastructure**: EF Core `PortfolioDbContext` (PostgreSQL), Fluent API configurations, ASP.NET Core Identity, SHA-256 refresh token rotation, and Strategy Pattern payment stubs.
- **Portfolio.API**: Thin REST controllers, centralized `ExceptionHandlingMiddleware`, JWT Bearer configuration, rate limiting, CORS, Swagger/OpenAPI, and health checks.

## Security Controls

- Short-lived JWT access tokens (15 minutes) paired with SHA-256 hashed refresh token rotation and reuse revocation.
- Role-based authorization (`[Authorize(Roles = "Admin")]` / `requireAdmin` middleware).
- Rate-limited contact submissions and login attempts.
- Strict upload allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) capped at 5 MB.
- Immutable `AuditLog` tracking every administrative login and content mutation.
