import type { ApiErrorCode } from "../contracts/v1.ts";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
