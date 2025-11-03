import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class OidcAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if user is authenticated via OIDC session
    if (!request.oidc || !request.oidc.isAuthenticated()) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Attach user to request for easy access
    request.user = {
      userId: request.oidc.user.sub,
      email: request.oidc.user.email,
      name: request.oidc.user.name,
      picture: request.oidc.user.picture,
    };

    return true;
  }
}
