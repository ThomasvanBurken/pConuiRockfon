import type { App } from '.';

declare global {
    interface Window { app: App; }
}