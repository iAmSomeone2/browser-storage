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

  await test.step("Synchronous Item Management", async (test) => {
    const storage = WebStorage.getSession();
    storage.clearSync();

    await test.step("setting and getting items should work as expected", () => {
      storage.setItemSync("test", "test");
      assertEquals(storage.length, 1);
      assertEquals(storage.hasKey("test"), true);
      assertEquals(storage.getItemSync<string>("test"), "test");
    });

    await test.step("removing items should work as expected", () => {
      storage.setItemSync("test", "test");
      storage.removeItemSync("test");
      assertEquals(storage.length, 0);
      assertEquals(storage.hasKey("test"), false);
      assertEquals(storage.getItemSync<string>("test"), null);
    });

    await test.step("clearing storage should work as expected", () => {
      storage.setItemSync("test", "test");
      storage.clearSync();
      assertEquals(storage.length, 0);
    })
  });

  await test.step("Asynchronous Item Management", async (test) => {
    const storage = WebStorage.getSession();
    await storage.clear();

    await test.step("setting and getting many items should work as expected", async () => {
      const itemCount = 1000;

      const setItemPromises = [];
      for (let i = 1; i <= itemCount; i++) {
        setItemPromises.push(storage.setItem("test" + i, i));
      }

      await Promise.all(setItemPromises);

      assertEquals(storage.length, itemCount);
      for (let i = 1; i <= itemCount; i++) {
        const value = await storage.getItem<number>("test" + i);
        assertEquals(value, i);
      }
    });

    await test.step("removing items should work as expected", async () => {
      await storage.setItem("test", "test");
      await storage.removeItem("test");
      assertEquals(storage.hasKey("test"), false);
    });
  });
});
