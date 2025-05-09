/**
 * # Web Storage
 *
 * Wrapper logic for the standard "Local" and "Session" Storage objects.
 *
 * # Examples
 *
 * @example Using `localStorage` to persist an Object
 * ```ts
 * // Define some data to store
 * interface User {
 *  name: string;
 *  age: number;
 * }
 *
 * const john: User = { name: "John Doe", age: 30 };
 *
 * // Get the local storage instance
 * const localStorage = WebStorage.getLocal();
 * await localStorage.setItem("currentUser", john);
 *
 * // Retrieve the stored data sometime later...
 * const currentUser = await localStorage.getItem<User>("currentUser");
 * console.assert(currentUser?.name === "John Doe");
 * ```
 *
 * @since 0.1.0
 * @module web-storage
 */

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
 * Returns the name of the storage type for use in error messages and logging.
 * @param storageType storage type enum value
 * @returns human-friendly name of the storage type
 * @internal
 */
function getNameForStorageType(storageType: StorageType): string {
  switch (storageType) {
    case StorageType.Local:
      return "Local";
    case StorageType.Session:
      return "Session";
  }
}

/**
 * Error thrown when a {@link WebStorage} instance is requested for a {@link StorageType} that is not available.
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

  /**
   * Creates a new instance of {@link StorageNotAvailableError}.
   *
   * @param storageType storage type that was requested
   */
  public constructor(storageType: StorageType) {
    const storageTypeName = getNameForStorageType(storageType);
    const message = `Storage of type, '${storageTypeName}', is not available.`;
    super(message);
    this.storageType = storageType;
  }
}

/**
 * Browser storage manager.
 *
 * @example Using `localStorage` to persist an Object
 * ```ts
 * // Define some data to store
 * interface User {
 *  name: string;
 *  age: number;
 * }
 *
 * const john: User = { name: "John Doe", age: 30 };
 *
 * // Get the local storage instance
 * const localStorage = WebStorage.getLocal();
 * await localStorage.setItem("currentUser", john);
 *
 * // Retrieve the stored data sometime later...
 * const currentUser = await localStorage.getItem<User>("currentUser");
 * console.assert(currentUser?.name === "John Doe");
 * ```
 *
 * @since 0.1.0
 */
export default class WebStorage {
  /**
   * Tests whether a given {@link StorageType} is available in the current context.
   *
   * @param storage {@link Storage} object to test
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
   * Set of keys in the storage instance.
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
   * @param key key to check
   * @returns `true` if the key is present, `false` otherwise
   */
  public hasKey(key: string): boolean {
    return this.keys.has(key);
  }

  /**
   * When passed a key name and value, will add that key to the storage or update that key's value if it already exists.
   *
   * This is the synchronous version of {@link setItem}.
   *
   * @example Set a primitive value
   * ```ts ignore
   * localStorage.setItemSync('theAnswer', 42);
   * ```
   *
   * @example Set an object value
   * ```ts ignore
   * localStorage.setItemSync('key', { foo: 'bar' });
   * ```
   *
   * @remarks
   * `value` is fed through {@link JSON.stringify} before being stored.
   *
   * @param key name of the key to create or update
   * @param value the value to store or overwrite
   *
   * @throws DOMException `QuotaExceededError` if the storage quota has been met.
   * @throws TypeError in one of the following cases:
   *   - `value` contains a circular reference
   *   - a {@link BigInt} value is somewhere within `value`
   */
  public setItemSync<T>(key: string, value: T): void {
    const stringifiedValue = JSON.stringify(value);
    this.storage.setItem(key, stringifiedValue);
    this.keys.add(key);
  }

  /**
   * When passed a key name and value, will add that key to the storage or update that key's value if it already exists.
   *
   * Asynchronous version of {@link setItemSync}.
   *
   * @example Set a primitive value
   * ```ts ignore
   * await localStorage.setItem('theAnswer', 42);
   * ```
   *
   * @example Set an object value and catch any errors
   * ```ts ignore
   * localStorage.setItem('key', { foo: 'bar' })
   *  .catch((error) => {
   *    if (error instanceof DOMException) {
   *       console.error("Quota exceeded");
   *     }
   *  });
   * ```
   *
   * @remarks
   * `value` is fed through {@link JSON.stringify} before being stored.
   *
   * @param key name of the key to create or update
   * @param value the value to store or overwrite
   *
   * @throws DOMException `QuotaExceededError` if the storage quota has been met.
   * @throws TypeError in one of the following cases:
   *   - `value` contains a circular reference
   *   - a {@link BigInt} value is somewhere within `value`
   */
  public setItem<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.setItemSync(key, value);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * When passed a key name, will return that key's value, or `null` if the key does not exist.
   *
   * Synchronous version of {@link getItem}.
   *
   * @example Get a primitive value
   * ```ts ignore
   * localStorage.getItemSync<number>('theAnswer'); // 42
   * ```
   *
   * @example Get an object value
   * ```ts ignore
   * localStorage.getItemSync<Record<string, unknown>>('key'); // { foo: 'bar' }
   * ```
   *
   * @param key name of the key to retrieve the value of
   * @returns the value of the key, or `null` if the key does not exist
   */
  public getItemSync<T>(key: string): T | null {
    if (!this.hasKey(key)) return null;

    const stringifiedValue = this.storage.getItem(key)!;
    return JSON.parse(stringifiedValue);
  }

  /**
   * When passed a key name, will return that key's value, or `null` if the key does not exist.
   *
   * Asynchronous version of {@link getItemSync}.
   *
   * @example Get a primitive value
   * ```ts ignore
   * const theAnswer = await localStorage.getItem<number>('theAnswer'); // 42
   * ```
   *
   * @example Get an object value
   *
   * ```ts ignore
   * const fooBar = await localStorage.getItem<Record<string, unknown>>('key'); // { foo: 'bar' }
   * ```
   *
   * @param key name of the key to retrieve the value of
   * @returns the value of the key, or `null` if the key does not exist
   */
  public getItem<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      try {
        const value = this.getItemSync<T>(key);
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
