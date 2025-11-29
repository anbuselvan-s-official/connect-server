import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export function ApiAuthHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'Authorization',
      description: 'Access token in Bearer format',
      required: true,
    }),
  );
}