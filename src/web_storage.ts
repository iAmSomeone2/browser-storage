/**
 * # Web Storage
 *
 * Wrapper logic for the standard "Local" and "Session" Storage objects.
 *
 * # Examples
 *
 * @example Using `localStorage` to persist a simple object
 * ```ts
 * import { assertEquals } from "jsr:@std/assert@1";
 *
 * // Define some data to store
 * interface User extends PrimitiveRecord {
 *  name: string;
 *  age: number;
 * }
 *
 * const john: User = { name: "John Doe", age: 30 };
 *
 * // Get the local storage instance
 * const localStorage = WebStorage.getLocal();
 * await localStorage.store("currentUser", john);
 *
 * // Retrieve the stored data sometime later...
 * const currentUser = (await localStorage.load("currentUser")) as User;
 * assertEquals(currentUser?.name, "John Doe");
 * ```
 *
 * @example Store and load a class using `sessionStorage`
 * ```ts
 * // Define a compatible class...
 *
 * class User implements Storable {
 *   public readonly typeName = "User";
 *
 *   public firstName: string = "";
 *   public lastName: string = "";
 *
 *   public get fullName(): string {
 *     let name = this.firstName;
 *     if (this.lastName) name += " " + this.lastName;
 *     return name;
 *   }
 *
 *   public constructor(firstName: string, lastName: string) {
 *     this.firstName = firstName;
 *     this.lastName = lastName;
 *   }
 *
 *   // Define the conversion methods
 *
 *   public intoStorage(): StorageValue {
 *     return {
 *       firstName: this.firstName,
 *       lastName: this.lastName,
 *     };
 *   }
 *
 *   // Interfaces can only enforce instance variables and methods. The following
 *   // pattern allows us to define the required function as a static method,
 *   // then satisfy the interface by providing a function pointer via the
 *   // `fromStorage` instance property.
 *
 *   private static fromStorageStatic(value: StorageValue): User {
 *     let firstName = "";
 *     let lastName = "";
 *     if (isPrimitiveRecord(value)) {
 *       if (typeof value["firstName"] === "string") firstName = value["firstName"];
 *       if (typeof value["lastName"] === "string") lastName = value["lastName"];
 *     }
 *
 *     return new User(firstName, lastName);
 *   }
 *
 *   public fromStorage: FromStorage = User.fromStorageStatic;
 * }
 *
 * // Use the class with WebStorage...
 * const storedUser = new User("Test", "Testington");
 *
 * const sessionStorage = WebStorage.getSession();
 * await sessionStorage.store("testUser", storedUser);
 *
 * const loadedUser = (await sessionStorage.load("testUser")) as User;
 * console.assert(storedUser.fullName === loadedUser.fullName);
 * ```
 *
 * @since 0.1.0
 * @module web-storage
 * @author Brenden Davidson <davidson.brenden15@gmail.com>
 * @copyright Brenden Davidson 2025
 */

/**
 * A basic data type that can be either a string, number, boolean, or null.
 */
type Primitive = string | number | boolean | null;

export function isPrimitive(value: unknown): value is Primitive {
  return typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean" || value === null;
}

/**
 * Record type which can be trivially serialized and deserialized using
 * {@link JSON.stringify}.
 *
 * @since 0.2.0
 */
export interface PrimitiveRecord {
  [key: string]:
    | Primitive
    | PrimitiveRecord
    | Array<PrimitiveRecord | Primitive>;
}

export function isPrimitiveRecord(value: unknown): value is PrimitiveRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => {
      if (Array.isArray(v)) {
        return v.every((v) => isPrimitive(v) || isPrimitiveRecord(v));
      }
      return isPrimitive(v) || isPrimitiveRecord(v);
    })
  );
}

/**
 * Data which may be stored using {@link WebStorage}.
 *
 * @since 0.2.0
 */
export type StorageValue =
  | Primitive
  | PrimitiveRecord
  | Array<Primitive | PrimitiveRecord>;

/**
 * Browser storage types.
 *
 * @since 0.1.0
 * @public
 */
export enum StorageType {
  /**
   * Storage partitioned by origin which persists between browser sessions.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
   */
  Local,
  /**
   * Storage partitioned by origin which is not persisted between browser sessions.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage
   */
  Session,
}

/**
 * Error thrown when a {@link WebStorage} instance is requested for a
 * {@link StorageType} that is not available.
 *
 * @example
 * ```ts
 * try {
 *   const storage = WebStorage.getLocal();
 * } catch (error) {
 *   if (error instanceof StorageNotAvailableError) {
 *     // Handle error
 *   }
 * }
 * ```
 */
export class StorageNotAvailableError extends Error {
  /** Name of the error. */
  override name = "StorageNotAvailableError";

  /** The storage type that was requested. */
  public readonly storageType: StorageType;

  /** Message describing the error */
  override get message(): string {
    let name: string;
    switch (this.storageType) {
      case StorageType.Local:
        name = "Local";
        break;
      case StorageType.Session:
        name = "Session";
        break;
    }

    return `Storage of type, '${name}', is not available.`;
  }

  /**
   * Creates a new instance of {@link StorageNotAvailableError}.
   *
   * @param storageType storage type that was requested
   */
  public constructor(storageType: StorageType) {
    super();
    this.storageType = storageType;
  }
}

/**
 * A {@link Storable} object instance method which produces a
 * WebStorage-compatible {@link StorageValue} type.
 *
 * @returns a WebStorage-compatible representation of the {@link Storable}
 * instance
 *
 * @since 0.2.0
 */
export type IntoStorage = () => StorageValue;

/**
 * Converts a {@link StorageValue} object into a {@link Storable} instance.
 *
 * @param value WebStorage-compatible value to retrieve data from
 * @returns new {@link Storable} instance built from the stored value
 *
 * @since 0.2.0
 */
export type FromStorage = (value: StorageValue) => Storable;

/**
 * Interface representing conversion functions for transforming between
 * {@link Storable} objects and {@link StorageValue} types that are compatible
 * with {@link WebStorage}.
 *
 * @since 0.2.0
 */
interface ConversionFunctions {
  /**
   * Function used to convert a {@link Storable} object into a
   * WebStorage-compatible {@link StorageValue} type.
   *
   * @see IntoStorage
   * @since 0.2.0
   */
  readonly intoStorage: IntoStorage;

  /**
   * Function used to convert a {@link StorageValue} object into a
   * {@link Storable} instance.
   *
   * @see FromStorage
   * @since 0.2.0
   */
  readonly fromStorage: FromStorage;
}

function isConversionFunctions(value: unknown): value is ConversionFunctions {
  return (
    typeof value === "object" &&
    value !== null &&
    "intoStorage" in value &&
    typeof (value as ConversionFunctions).intoStorage === "function" &&
    "fromStorage" in value &&
    typeof (value as ConversionFunctions).fromStorage === "function"
  );
}

/**
 * Object which may be converted into a WebStorage-compatible format and back.
 */
export interface Storable extends ConversionFunctions {
  /**
   * Name to provide to WebStorage so that it may call the correct functions
   * when storing and loading this object.
   */
  readonly typeName: string;
}

/**
 * Confirm if a value conforms to the {@link Storable} type.
 *
 * @param value value to check
 * @returns `true` if the value conforms; `false` otherwise
 */
export function isStorable(value: unknown): value is Storable {
  return (
    typeof value === "object" &&
    value !== null &&
    "typeName" in value &&
    typeof (value as Storable).typeName === "string" &&
    isConversionFunctions(value)
  );
}

interface StorageMetadata {
  /** The type of data stored in this item */
  readonly itemType: string | null;
}

interface StorageItem extends StorageMetadata {
  /** The actual data stored in this item */
  readonly value: StorageValue;
}

/**
 * Browser storage manager.
 *
 * @example Using `localStorage` to persist an Object
 * ```ts
 * import { assertEquals } from "jsr:@std/assert@1";
 *
 * // Define some data to store
 * interface User extends PrimitiveRecord {
 *  name: string;
 *  age: number;
 * }
 *
 * const john: User = { name: "John Doe", age: 30 };
 *
 * // Get the local storage instance
 * const localStorage = WebStorage.getLocal();
 * await localStorage.store("currentUser", john);
 *
 * // Retrieve the stored data sometime later...
 * const currentUser = (await localStorage.load("currentUser")) as User;
 * assertEquals(currentUser?.name, "John Doe");
 * ```
 *
 * @since 0.1.0
 */
export default class WebStorage {
  /**
   * Tests whether a given {@link StorageType} is available in the current context.
   *
   * @param storage {@link StorageValue} object to test
   * @returns `true` if the storage type is available, `false` otherwise
   * @throws Error when an unexpected error occurs
   *
   * @internal
   */
  private static isAvailable(storage: Storage): boolean {
    try {
      storage.setItem("test", "test");
      storage.removeItem("test");
      return true;
    } catch (error) {
      if (!(error instanceof DOMException)) {
        // Bubble up the unexpected error
        throw error;
      }
      const err = error as DOMException;
      const isQuotaExceededError = err.name === "QuotaExceededError";
      return isQuotaExceededError && storage.length !== 0;
    }
  }

  /**
   * Tests whether {@link StorageType.Local} is available in the current environment.
   * This determines whether {@link self.localStorage} can be used without throwing errors.
   *
   * @returns `true` if {@link StorageType.Local} is available and functional, otherwise `false`.
   */
  public static localIsAvailable(): boolean {
    return WebStorage.isAvailable(self.localStorage);
  }

  /**
   * Tests whether {@link StorageType.Session} is available in the current environment.
   * This determines whether {@link self.sessionStorage} can be used without throwing errors.
   *
   * @returns `true` if {@link StorageType.Session} is available and functional, otherwise `false`.
   */
  public static sessionIsAvailable(): boolean {
    return WebStorage.isAvailable(self.sessionStorage);
  }

  /**
   * Session storage singleton.
   * @private
   * @internal
   */
  private static _session: WebStorage | null = null;

  /**
   * Local storage singleton.
   * @private
   * @internal
   */
  private static _local: WebStorage | null = null;

  /**
   * Creates a new {@link WebStorage} instance for the given {@link StorageType}.
   *
   * @param storageType storage type to create
   * @returns new {@link WebStorage} instance
   * @throws {@link StorageNotAvailableError} when the storage type is not available
   *
   * @internal
   */
  private static create(storageType: StorageType): WebStorage {
    let isAvailable = false;
    switch (storageType) {
      case StorageType.Local:
        isAvailable = WebStorage.localIsAvailable();
        break;
      case StorageType.Session:
        isAvailable = WebStorage.sessionIsAvailable();
        break;
    }

    if (!isAvailable) {
      throw new StorageNotAvailableError(storageType);
    }

    return new WebStorage(storageType);
  }

  /**
   * Gets the {@link WebStorage} instance for the {@link StorageType.Local} storage type.
   *
   * @example
   * ```ts
   * let localStorage: WebStorage;
   * try {
   *   localStorage = WebStorage.getLocal();
   * } catch (error) {
   *   if (error instanceof StorageNotAvailableError) {
   *     // Handle error
   *   }
   * }
   * ```
   *
   * @returns {@link WebStorage} instance for the {@link StorageType.Local} storage type
   * @throws {@link StorageNotAvailableError} when {@link StorageType.Local} is not available
   */
  public static getLocal(): WebStorage {
    if (!WebStorage._local) {
      WebStorage._local = WebStorage.create(StorageType.Local);
    }
    return WebStorage._local;
  }

  /**
   * Gets the {@link WebStorage} instance for the {@link StorageType.Session} storage type.
   *
   * @example
   * ```ts
   * let sessionStorage: WebStorage;
   * try {
   *   sessionStorage = WebStorage.getSession();
   * } catch (error) {
   *   if (error instanceof StorageNotAvailableError) {
   *     // Handle error
   *   }
   * }
   * ```
   *
   * @returns {@link WebStorage} instance for the {@link StorageType.Session} storage type
   * @throws {@link StorageNotAvailableError} when {@link StorageType.Session} is not available
   */
  public static getSession(): WebStorage {
    if (!WebStorage._session) {
      WebStorage._session = WebStorage.create(StorageType.Session);
    }
    return WebStorage._session;
  }

  /**
   * Reference to the browser {@link Storage} object for this instance's {@link StorageType}.
   * @private
   * @internal
   */
  private readonly storage: Storage;

  /**
   * Type of browser storage this instance manages.
   */
  public readonly storageType: StorageType;

  /**
   * Returns an integer representing the number of data items stored in the {@link Storage} object.
   *
   * @returns number of items stored in the {@link Storage} object
   */
  public get length(): number {
    return this.storage.length;
  }

  /**
   * Mapping of {@link Storable.typeName} values to their respective
   * {@link FromStorage} functions.
   *
   * @private
   * @internal
   */
  private readonly conversionMap: Map<string, FromStorage> = new Map();

  /**
   * Set of keys in the storage instance.
   *
   * @private
   * @internal
   */
  private readonly keys: Set<string> = new Set();

  /**
   * Creates a new {@link WebStorage} instance.
   *
   * @remarks
   * Library consumers should not call this constructor directly. Instead, use {@link WebStorage.getLocal} or
   * {@link WebStorage.getSession}.
   *
   * @private
   * @internal
   */
  private constructor(storageType: StorageType) {
    this.storageType = storageType;
    switch (storageType) {
      case StorageType.Local:
        this.storage = self.localStorage;
        break;
      case StorageType.Session:
        this.storage = self.sessionStorage;
        break;
    }

    // Add all existing keys to the set
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        this.keys.add(key);
      }
    }
  }

  /**
   * Returns `true` if a given key is present in the storage instance.
   *
   * @param key - key to check
   * @returns `true` if the key is present, `false` otherwise
   */
  public hasKey(key: string): boolean {
    return this.keys.has(key);
  }

  private static makeStorageItem<T extends Storable>(
    value: T | StorageValue,
  ): StorageItem {
    const isStorableType = isStorable(value);
    const itemType = isStorableType ? value.typeName : null;
    const itemValue = isStorableType ? value.intoStorage() : value;

    return {
      itemType,
      value: itemValue,
    };
  }

  /**
   * When passed a key name and value, will add that key to the storage or
   * update that key's value if it already exists.
   *
   * @remarks
   * This is the synchronous version of {@link WebStorage.store}.
   *
   * @example Set a primitive value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * localStorage.storeSync('theAnswer', 42);
   * ```
   *
   * @example Set a simple object value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * localStorage.storeSync('fooBar', { foo: 'bar' });
   * ```
   *
   * @param key - name of the key to create or update
   * @param value - the value to store or overwrite
   *
   * @throws DOMException `QuotaExceededError` if the storage quota has been met.
   */
  public storeSync<T extends Storable>(
    key: string,
    value: T | StorageValue,
  ): void {
    const item = WebStorage.makeStorageItem(value);

    this.storage.setItem(key, JSON.stringify(item));
    this.keys.add(key);
    if (isStorable(value)) {
      // Add or update conversion functions
      this.conversionMap.set(value.typeName, value.fromStorage);
    }
  }

  /**
   * When passed a key name and value, will add that key to the storage or
   * update that key's value if it already exists.
   *
   * @remarks
   * This is the asynchronous version of {@link WebStorage.storeSync}.
   *
   * @example Set a primitive value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * await localStorage.store('theAnswer', 42);
   * ```
   *
   * @example Set a simple object value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * await localStorage.store('fooBar', { foo: 'bar' });
   * ```
   *
   * @param key - name of the key to create or update
   * @param value - the value to store or overwrite
   *
   * @throws DOMException `QuotaExceededError` if the storage quota has been met.
   */
  public store<T extends Storable>(
    key: string,
    value: T | StorageValue,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.storeSync(key, value);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * When passed a key name, will load that key's value from storage into the
   * target data type or return `null` if the key does not exist.
   *
   * @remarks
   * Synchronous version of {@link WebStorage.load}.
   *
   * @example Load a primitive value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * const theAnswer = localStorage.loadSync("theAnswer");
   * ```
   *
   * @example Load a simple object
   * ```ts
   * interface User {
   *  id: number;
   *  name: {
   *    first: string;
   *    middle?: string;
   *    last: string;
   *  };
   *  friendIDs: number[];
   * }
   *
   * const localStorage = WebStorage.getLocal();
   * const testUser = localStorage.loadSync("testUser");
   * // {
   * //   id: 0,
   * //   name: {
   * //     first: "Test",
   * //     last: "Testington",
   * //   },
   * //   friendIDs: [1, 5]
   * // }
   * ```
   *
   * @param key name of the key to load the value for
   *
   * @returns the value of the key loaded into the target data type, or `null`
   * if the key does not exist
   */
  public loadSync(key: string): Storable | StorageValue | null {
    // Check for key existence without asking the browser.
    if (!this.hasKey(key)) return null;

    const stringifiedValue = this.storage.getItem(key)!; // This should never return `null` since we've confirmed that the key exists.

    const item: StorageItem = JSON.parse(stringifiedValue);
    if (item.itemType === null) {
      // No conversion function, just return the value as-is
      return item.value;
    }

    const fromStorage = this.conversionMap.get(item.itemType);
    return fromStorage ? fromStorage(item.value) : item.value;
  }

  /**
   * When passed a key name, will load that key's value from storage into the
   * target data type or return `null` if the key does not exist.
   *
   * @remarks
   * Asynchronous version of {@link WebStorage.loadSync}.
   *
   * @example Load a primitive value
   * ```ts
   * const localStorage = WebStorage.getLocal();
   * const theAnswer = await localStorage.load("theAnswer");
   *
   * console.log("The answer is " + theAnswer + "."); // Prints: "The answer is 42."
   * ```
   *
   * @example Load a simple object
   * ```ts
   * interface User {
   *  id: number;
   *  name: {
   *    first: string;
   *    middle?: string;
   *    last: string;
   *  };
   *  friendIDs: number[];
   * }
   *
   * const localStorage = WebStorage.getLocal();
   * const testUser = await localStorage.load("testUser");
   * // {
   * //   id: 0,
   * //   name: {
   * //     first: "Test",
   * //     last: "Testington",
   * //   },
   * //   friendIDs: [1, 5]
   * // }
   * ```
   *
   * @param key name of the key to load the value for
   *
   * @returns the value of the key loaded into the target data type, or `null`
   * if the key does not exist
   */
  public load(key: string): Promise<Storable | StorageValue | null> {
    return new Promise((resolve, reject) => {
      try {
        const value = this.loadSync(key);
        resolve(value);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Removes a key/value pair from the storage instance if it exists.
   *
   * Synchronous version of {@link removeItem}.
   *
   * @remarks
   * Does nothing if the key does not exist.
   *
   * @param key name of the key to remove
   */
  public removeItemSync(key: string): void {
    this.storage.removeItem(key);
    this.keys.delete(key);
  }

  /**
   * Removes a key/value pair from the storage instance if it exists.
   *
   * Asynchronous version of {@link removeItemSync}.
   *
   * @remarks
   * Does nothing if the key does not exist.
   *
   * @param key name of the key to remove
   */
  public removeItem(key: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.removeItemSync(key);
      resolve();
    });
  }

  /**
   * Removes all keys/value pairs from the storage instance.
   *
   * Synchronous version of {@link clear}.
   */
  public clearSync(): void {
    this.storage.clear();
    this.keys.clear();
  }

  /**
   * Removes all keys/value pairs from the storage instance.
   *
   * Asynchronous version of {@link clearSync}.
   */
  public clear(): Promise<void> {
    return new Promise((resolve, _reject) => {
      this.clearSync();
      resolve();
    });
  }
}
