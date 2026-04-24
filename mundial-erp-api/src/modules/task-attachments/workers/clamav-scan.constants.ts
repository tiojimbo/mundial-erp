export const CLAMAV_SCAN_QUEUE = 'clamav-scan' as const;

export interface ClamAvScanJobData {
  attachmentId: string;
  storageKey: string;
}

export const CLAMAV_SCAN_CONCURRENCY = 3 as const;
export const CLAMAV_SCAN_MAX_ATTEMPTS = 5 as const;
export const CLAMAV_SCAN_BACKOFF_MS = 30_000 as const;
export const CLAMAV_SCAN_TIMEOUT_MS = 60_000 as const;
