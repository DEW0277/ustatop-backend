import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function flattenErrors(errors: ValidationError[], parentPath = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      Object.assign(result, flattenErrors(error.children, path));
    }
  }

  return result;
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: "Kiritilgan ma'lumotlarda xatolik bor",
    errors: flattenErrors(errors),
  });
}
