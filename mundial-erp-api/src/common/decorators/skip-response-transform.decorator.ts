import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM_KEY = 'skipResponseTransform';

export const SkipResponseTransform = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);
