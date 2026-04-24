import { Global, Module } from '@nestjs/common';
import { CycleDetectorService } from './services/cycle-detector.service';
import { S3AdapterService } from './adapters/s3-adapter.service';
import { FileTypeDetectorService } from './adapters/file-type-detector.service';

/**
 * Modulo agregador de providers transversais reusados por varios modulos
 * da feature Tasks (e possivelmente fora dela). Marcado `@Global()` para
 * evitar import repetitivo em cada feature module.
 *
 * Providers expostos:
 *   - {@link CycleDetectorService} — BFS com limite 1000 nodes / timeout 2s.
 *   - {@link S3AdapterService} — signed URLs + range GET (AWS SDK v3).
 *   - {@link FileTypeDetectorService} — magic number check (file-type).
 */
@Global()
@Module({
  providers: [
    CycleDetectorService,
    S3AdapterService,
    FileTypeDetectorService,
  ],
  exports: [
    CycleDetectorService,
    S3AdapterService,
    FileTypeDetectorService,
  ],
})
export class CommonModule {}
