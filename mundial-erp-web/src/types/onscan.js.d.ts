declare module 'onscan.js' {
  interface OnScanOptions {
    minLength?: number;
    maxLength?: number;
    avgTimeByChar?: number;
    suffixKeyCodes?: number[];
    prefixKeyCodes?: number[];
    ignoreIfFocusOn?: string | boolean | HTMLElement;
    scanButtonKeyCode?: number;
    scanButtonLongPressTime?: number;
    onScan?: (code: string, quantity: number) => void;
    onScanError?: (debug: unknown) => void;
    onKeyProcess?: (key: string, event: KeyboardEvent) => void;
    onKeyDetect?: (key: string, event: KeyboardEvent) => void;
    onPaste?: (pastedValue: string, event: Event) => void;
    keyCodeMapper?: (event: KeyboardEvent) => string | null;
    reactToPaste?: boolean;
    timeBeforeScanTest?: number;
  }

  interface OnScan {
    attachTo(element: Document | HTMLElement, options?: OnScanOptions): void;
    detachFrom(element: Document | HTMLElement): void;
    isAttachedTo(element: Document | HTMLElement): boolean;
    getOptions(element: Document | HTMLElement): OnScanOptions;
    setOptions(element: Document | HTMLElement, options: Partial<OnScanOptions>): void;
    simulate(element: Document | HTMLElement, code: string): void;
  }

  const onScan: OnScan;
  export default onScan;
}
