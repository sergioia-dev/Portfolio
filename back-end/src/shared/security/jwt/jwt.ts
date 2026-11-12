import jwt, { type SignOptions } from "jsonwebtoken";
import environment from "../configuration/environment";

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

interface RefreshTokenPayload {
  sub: string;
}

export default class Jwt {
  private accessSecret: string;
  private refreshSecret: string;
  private accessExpiresIn: SignOptions["expiresIn"];
  private refreshExpiresIn: SignOptions["expiresIn"];

  constructor() {
    this.accessSecret = environment.JWT_ACCESS_SECRET!;
    this.refreshSecret = environment.JWT_REFRESH_SECRET!;
    this.accessExpiresIn = environment.JWT_ACCESS_EXPIRATION as SignOptions["expiresIn"];
    this.refreshExpiresIn = environment.JWT_REFRESH_EXPIRATION as SignOptions["expiresIn"];
  }

  generateAccessToken(
    sub: string,
    email: string,
    role: string,
    permissions: string[],
  ): string {
    return jwt.sign({ sub, email, role, permissions }, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  generateRefreshToken(sub: string): string {
    return jwt.sign({ sub }, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.accessSecret) as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
  }
}
