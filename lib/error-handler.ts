export type ErrorType = { error: string };

export type Result<T> = T | ErrorType;

export function isError<T>(result: Result<T>): result is ErrorType {
  return (result as ErrorType).error !== undefined;
}
