import * as jwt from "jsonwebtoken";
import config from "../config";

export function generateToken(userId: string): string {
  // cast secret so TS knows which overload to pick
  const secret = config.jwt.secret as jwt.Secret;
  const options: jwt.SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ userId }, secret, options);
}

export function verifyToken(token: string): { userId: string } {
  // same here: ensure secret is typed as jwt.Secret
  const secret = config.jwt.secret as jwt.Secret;
  return jwt.verify(token, secret) as { userId: string };
}
