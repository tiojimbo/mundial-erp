import { SetMetadata } from '@nestjs/common';

export const REQUIRE_JWT_KEY = 'requireJwt';
export const RequireJwt = () => SetMetadata(REQUIRE_JWT_KEY, true);
