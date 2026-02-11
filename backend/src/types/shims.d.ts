// Minimal shims to allow TypeScript compilation without @types/node or external lib types
// NOTE: This is only to satisfy the compiler in this demo setup.
// Runtime requires actual packages to be installed (express, pg, argon2/bcrypt, etc.).

declare var process: any;
declare function require(name: string): any;

declare const Buffer: any;

declare module 'argon2';
declare module 'bcrypt';
declare module 'bcryptjs';
declare module 'pg';
declare module 'crypto';

declare module 'ts-jest';

// Jest globals (to let tsc compile tests without @types/jest)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => any): void;
declare function test(name: string, fn: () => any): void;
declare function expect(actual: any): any;

declare module 'jest' {
  export interface Config {}
}
