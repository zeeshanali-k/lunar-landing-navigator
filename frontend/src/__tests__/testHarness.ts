/** Minimal zero-dependency test runner helper compatible with strict TS, Node, and Vitest. */

export function describe(name: string, fn: () => void): void {
  console.log(`\n[suite] ${name}`);
  fn();
}

export function it(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err: unknown) {
    console.error(`  FAIL: ${name}`);
    throw err;
  }
}

function fail(msg: string): never {
  throw new Error(msg);
}

export const expect = {
  equal: <T>(actual: T, expected: T, msg?: string): void => {
    if (!Object.is(actual, expected)) {
      fail(msg ?? `Expected ${String(actual)} to equal ${String(expected)}`);
    }
  },
  deepEqual: <T>(actual: T, expected: T, msg?: string): void => {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) {
      fail(msg ?? `Expected ${left} to deep-equal ${right}`);
    }
  },
  truthy: (value: unknown, msg?: string): void => {
    if (!value) {
      fail(msg ?? `Expected truthy value, got ${String(value)}`);
    }
  },
  closeTo: (actual: number, expected: number, delta = 1e-6, msg?: string): void => {
    if (Math.abs(actual - expected) > delta) {
      fail(msg ?? `Expected ${actual} to be within ${delta} of ${expected}`);
    }
  },
};
