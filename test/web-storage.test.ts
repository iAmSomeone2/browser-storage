import { assertEquals } from "@std/assert";
// import { stub, returnsNext, assertSpyCall, type Stub } from "@std/testing/mock";
import WebStorage, {StorageType} from "../src/web-storage.ts";

Deno.test("WebStorage", async (test) => {
  await test.step("Static Methods", async (test) => {
    await test.step("localIsAvailable()", async (test) => {
      await test.step("should return `true` when localStorage is available", () => {
        assertEquals(WebStorage.localIsAvailable(), true);
      });

      // await test.step("should return `false` when localStorage cannot be used", () => {
      //   using setItemStub = stub(
      //     self.localStorage,
      //     "setItem",
      //     () => {
      //       throw new DOMException("test", "QuotaExceededError");
      //     },
      //   );
      //
      //   const isAvailable = WebStorage.localIsAvailable();
      //   assertSpyCall(setItemStub, 0, {
      //     args: ["test", "test"],
      //     error: {
      //       Class: DOMException,
      //     }
      //   });
      //
      //   assertEquals(isAvailable, false);
      // });
    });

    await test.step("sessionIsAvailable()", async (test) => {
      await test.step("should return `true` when sessionStorage is available", () => {
        assertEquals(WebStorage.sessionIsAvailable(), true);
      });
    });
  });

  await test.step("Instantiation", async (test) => {
    await test.step("getLocal() should instantiate and return a WebStorage instance", () => {
      const storage = WebStorage.getLocal();
      assertEquals(storage instanceof WebStorage, true);
      assertEquals(storage.storageType, StorageType.Local);
    });

    await test.step("getSession() should instantiate and return a WebStorage instance", () => {
      const storage = WebStorage.getSession();
      assertEquals(storage instanceof WebStorage, true);
      assertEquals(storage.storageType, StorageType.Session);
    });
  });

  await test.step("Item Management", async (test) => {
    const storage = WebStorage.getSession();

    await test.step("setItem() & getItem() should work as expected", () => {
      storage.setItem("test", "test");
      assertEquals(storage.length, 1);
      assertEquals(storage.hasKey("test"), true);
      assertEquals(storage.getItem<string>("test"), "test");
    });

    await test.step("removeItem() should work as expected", () => {
      storage.setItem("test", "test");
      storage.removeItem("test");
      assertEquals(storage.length, 0);
      assertEquals(storage.hasKey("test"), false);
      assertEquals(storage.getItem<string>("test"), null);
    });

    await test.step("clear() should work as expected", () => {
      storage.setItem("test", "test");
      storage.clear();
      assertEquals(storage.length, 0);
    })
  });
});
