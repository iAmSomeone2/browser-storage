import { assert, assertEquals } from "jsr:@std/assert@1";
import { spy } from "jsr:@std/testing@1/mock";
import WebStorage, {
  FromStorage,
  isPrimitiveRecord,
  isStorable,
  Storable,
  StorageType,
  StorageValue,
} from "../src/web_storage.ts";

class User implements Storable {
  public readonly typeName = "User";

  public firstName: string = "";
  public lastName: string = "";

  public get fullName(): string {
    let name = this.firstName;
    if (this.lastName) name += " " + this.lastName;
    return name;
  }

  public constructor(firstName: string, lastName: string) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  // Define the conversion methods

  public intoStorage(): StorageValue {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
    };
  }

  // Interfaces can only enforce instance variables and methods. The following
  // pattern allows us to define the required function as a static method,
  // then satisfy the interface by providing a function pointer via the
  // `fromStorage` instance property.

  private static fromStorageStatic(value: StorageValue): User {
    let firstName = "";
    let lastName = "";
    if (isPrimitiveRecord(value)) {
      if (typeof value["firstName"] === "string") {
        firstName = value["firstName"];
      }
      if (typeof value["lastName"] === "string") lastName = value["lastName"];
    }

    return new User(firstName, lastName);
  }

  public fromStorage: FromStorage = User.fromStorageStatic;
}

Deno.test("WebStorage", async (test) => {
  await test.step("Static Methods", async (test) => {
    await test.step("localIsAvailable()", async (test) => {
      await test.step("should return `true` when localStorage is available", () => {
        assert(WebStorage.localIsAvailable());
      });
    });

    await test.step("sessionIsAvailable()", async (test) => {
      await test.step("should return `true` when sessionStorage is available", () => {
        assert(WebStorage.sessionIsAvailable());
      });
    });
  });

  await test.step("Instantiation", async (test) => {
    await test.step("getLocal() should instantiate and return a WebStorage instance", () => {
      const storage = WebStorage.getLocal();
      assert(storage instanceof WebStorage);
      assertEquals(storage.storageType, StorageType.Local);
    });

    await test.step("getSession() should instantiate and return a WebStorage instance", () => {
      const storage = WebStorage.getSession();
      assert(storage instanceof WebStorage);
      assertEquals(storage.storageType, StorageType.Session);
    });
  });

  await test.step("Synchronous Item Management", async (test) => {
    const storage = WebStorage.getSession();
    storage.clearSync();

    await test.step("storing and loading primitive items should work as expected", () => {
      storage.storeSync("test", "test");
      assertEquals(storage.length, 1);
      assert(storage.hasKey("test"));
      assertEquals(storage.loadSync("test"), "test");
    });

    await test.step("storing and loading class instances should work as expected", () => {
      const user = new User("Test", "Testington");
      const intoStorageSpy = spy(user, "intoStorage");
      const fromStorageSpy = spy(user, "fromStorage");

      storage.storeSync("user", user);
      assertEquals(
        intoStorageSpy.calls.length,
        1,
        "intoStorage() should have been called once",
      );
      assert(storage.hasKey("user"));

      const loadedUser = storage.loadSync("user");
      assertEquals(
        fromStorageSpy.calls.length,
        1,
        "fromStorage() should have been called once",
      );
      assert(
        loadedUser instanceof User,
        "loadedUser should be an instance of User",
      );
      assertEquals(
        (loadedUser as User).fullName,
        user.fullName,
        "loadedUser should have the same fullName as user",
      );
    });

    await test.step("removing items should work as expected", () => {
      storage.storeSync("test", "test");
      storage.removeItemSync("test");
      assert(!storage.hasKey("test"));
      assertEquals(storage.loadSync("test"), null);
    });

    await test.step("clearing storage should work as expected", () => {
      storage.storeSync("test", "test");
      storage.clearSync();
      assertEquals(storage.length, 0);
    });
  });

  await test.step("Asynchronous Item Management", async (test) => {
    const storage = WebStorage.getSession();
    await storage.clear();

    await test.step("setting and getting many items should work as expected", async () => {
      const itemCount = 1000;

      const setItemPromises = [];
      for (let i = 1; i <= itemCount; i++) {
        setItemPromises.push(storage.store("test" + i, i));
      }

      await Promise.all(setItemPromises);

      assertEquals(storage.length, itemCount);
      for (let i = 1; i <= itemCount; i++) {
        const value = await storage.load("test" + i);
        assert(!isStorable(value));
        assertEquals(value, i);
      }
    });

    await test.step("removing items should work as expected", async () => {
      await storage.store("test", "test");
      await storage.removeItem("test");
      assert(!storage.hasKey("test"));
    });
  });
});
