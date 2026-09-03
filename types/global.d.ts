declare module 'next/server' {
  export { NextRequest, NextResponse } from 'next/dist/server/web/exports';
}
declare module 'next/headers' {
  export function cookies(): Promise<{
    get(name: string): { name: string; value: string } | undefined;
    getAll(): { name: string; value: string }[];
    set(name: string, value: string, options?: Record<string, unknown>): void;
  }>;
}