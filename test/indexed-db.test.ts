/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import IndexedDB, {
  IndexedDBError,
  IndexedDBErrorKind,
} from "../src/indexed-db.ts";

Deno.test("IndexedDBError", async (test) => {
  const testCases = [
    {
      errorKind: IndexedDBErrorKind.InvalidVersion,
      expectedMessage: "DB version must be a positive integer.",
      name: "InvalidVersion",
    },
    {
      errorKind: IndexedDBErrorKind.UpgradeBlocked,
      expectedMessage: "DB upgrade blocked by another connection.",
      name: "UpgradeBlocked",
    },
  ];

  for (const testCase of testCases) {
    await test.step(`should have the expected message when errorKind is "${testCase.name}"`, () => {
      const error = new IndexedDBError(testCase.errorKind);
      assertEquals(error.message, testCase.expectedMessage);
    });
  }
});

// TODO: Determine how to unit test IndexedDB
// Deno.test("IndexedDB", async (test) => {
//   await test.step("can open a new database without error", async () => {
//     const db = new IndexedDB();
//
//     await db.open("test");
//   });
// });
