import { assertEquals } from "jsr:@std/assert@1";
import Indexed_db, {
  IndexedDBError,
  IndexedDBErrorKind,
} from "../src/indexed_db.ts";

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

// TODO: Determine how to unit test Indexed_db
// Deno.test("Indexed_db", async (test) => {
//   await test.step("can open a new database without error", async () => {
//     const db = new Indexed_db();
//
//     await db.open("test");
//   });
// });
