/**
 * S3AdapterService (real, Sprint 4)
 *
 * Adapter injetavel em cima do AWS SDK v3 (@aws-sdk/client-s3 +
 * @aws-sdk/s3-request-presigner). Compativel com MinIO via
 * `forcePathStyle=true` e endpoint custom.
 *
 * Config via env:
 *   - S3_ENDPOINT              (ex: http://minio:9000)
 *   - S3_ACCESS_KEY_ID
 *   - S3_SECRET_ACCESS_KEY
 *   - S3_REGION                (default: us-east-1)
 *   - S3_FORCE_PATH_STYLE=true (MinIO)
 *   - S3_BUCKET_TASK_ATTACHMENTS (default: tasks-attachments, private ACL)
 *
 * Escopo: NUNCA consuma SDKs direto em services. Use este adapter.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';

export interface SignedPutUrlParams {
  bucket?: string;
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds: number;
}

export interface SignedGetUrlParams {
  bucket?: string;
  key: string;
  expiresInSeconds: number;
  downloadFilename?: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface RangeGetParams {
  bucket?: string;
  key: string;
  rangeStart: number;
  rangeEnd: number;
}

@Injectable()
export class S3AdapterService implements OnModuleDestroy {
  private readonly logger = new Logger(S3AdapterService.name);
  private readonly client: S3Client;
  private readonly defaultBucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? '';
    const forcePathStyle =
      (process.env.S3_FORCE_PATH_STYLE ?? 'true').toLowerCase() === 'true';
    this.defaultBucket =
      process.env.S3_BUCKET_TASK_ATTACHMENTS ?? 'tasks-attachments';

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  async getSignedPutUrl(params: SignedPutUrlParams): Promise<SignedUrlResult> {
    const bucket = params.bucket ?? this.defaultBucket;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds,
    });
    const expiresAt = new Date(Date.now() + params.expiresInSeconds * 1000);
    return { url, expiresAt };
  }

  async getSignedGetUrl(params: SignedGetUrlParams): Promise<SignedUrlResult> {
    const bucket = params.bucket ?? this.defaultBucket;
    const responseContentDisposition = params.downloadFilename
      ? `attachment; filename="${encodeURIComponent(params.downloadFilename)}"`
      : undefined;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: params.key,
      ResponseContentDisposition: responseContentDisposition,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: params.expiresInSeconds,
    });
    const expiresAt = new Date(Date.now() + params.expiresInSeconds * 1000);
    return { url, expiresAt };
  }

  async deleteObject(bucketOrKey: string, maybeKey?: string): Promise<void> {
    // Sobrecarga: deleteObject(key) usa bucket default; deleteObject(bucket, key) explicita.
    const bucket = maybeKey !== undefined ? bucketOrKey : this.defaultBucket;
    const key = maybeKey !== undefined ? maybeKey : bucketOrKey;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
    this.logger.debug(`s3.delete bucket=${bucket} key=${key}`);
  }

  /**
   * Baixa objeto para Buffer completo. Use com criterio — util para scans
   * pequenos. Para arquivos grandes, prefira streaming para disco.
   */
  async downloadToBuffer(key: string, bucket?: string): Promise<Buffer> {
    const effectiveBucket = bucket ?? this.defaultBucket;
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: effectiveBucket, Key: key }),
    );
    return await this.streamToBuffer(response.Body as Readable | undefined);
  }

  /**
   * Baixa objeto como stream Node (usado pelo ClamAV worker para persistir
   * em /tmp sem carregar tudo em memoria).
   */
  async downloadAsStream(
    key: string,
    bucket?: string,
  ): Promise<Readable> {
    const effectiveBucket = bucket ?? this.defaultBucket;
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: effectiveBucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(
        `s3.download empty body bucket=${effectiveBucket} key=${key}`,
      );
    }
    return response.Body as Readable;
  }

  /**
   * Baixa um range de bytes (usado por file-type-detector para ler os
   * primeiros 4KB e checar magic number).
   */
  async downloadRange(params: RangeGetParams): Promise<Buffer> {
    const bucket = params.bucket ?? this.defaultBucket;
    const range = `bytes=${params.rangeStart}-${params.rangeEnd}`;
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: params.key,
        Range: range,
      }),
    );
    return await this.streamToBuffer(response.Body as Readable | undefined);
  }

  private async streamToBuffer(stream: Readable | undefined): Promise<Buffer> {
    if (!stream) {
      return Buffer.alloc(0);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array),
      );
    }
    return Buffer.concat(chunks);
  }
}
