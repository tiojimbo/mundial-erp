import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const CUID_REGEX = /^c[a-z0-9]{20,30}$/;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!CUID_REGEX.test(value)) {
      throw new BadRequestException(`"${value}" is not a valid CUID`);
    }
    return value;
  }
}
