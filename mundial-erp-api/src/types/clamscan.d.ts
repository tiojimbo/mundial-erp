declare module 'clamscan' {
  interface ClamdscanOptions {
    host?: string;
    port?: number;
    timeout?: number;
    local_fallback?: boolean;
    socket?: string | false;
    path?: string;
  }

  interface NodeClamOptions {
    clamdscan?: ClamdscanOptions;
    clamscan?: Record<string, unknown>;
    preference?: 'clamdscan' | 'clamscan';
    debug_mode?: boolean;
    remove_infected?: boolean;
    scan_log?: string;
    quarantine_infected?: string | boolean;
  }

  interface IsInfectedResult {
    file: string;
    isInfected: boolean | null;
    viruses: string[];
  }

  export default class NodeClam {
    init(options?: NodeClamOptions): Promise<NodeClam>;
    isInfected(filePath: string): Promise<IsInfectedResult>;
  }
}
