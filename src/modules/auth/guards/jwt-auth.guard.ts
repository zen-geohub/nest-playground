import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// @Injectable()
// export class JwtAuthGuard implements CanActivate {
//   constructor(private readonly jwtService: JwtService) {}

//   async canActivate(ctx: ExecutionContext) {
//     const request = ctx.switchToHttp().getRequest<Request>();

//     const authorization = request.headers.authorization;

//     if (!authorization)
//       throw new UnauthorizedException("Missing authorization header.");

//     const [type, token] = authorization.split(" ");

//     if (type !== "Bearer" || !token)
//       throw new UnauthorizedException("Invalid authorization header.");

//     try {
//       const payload = await this.jwtService.verifyAsync(token);

//       request.user = payload;

//       return true;
//     } catch {
//       throw new UnauthorizedException("Invalid or expired token.");
//     }
//   }
// }
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
