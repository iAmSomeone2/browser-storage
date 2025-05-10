/**
 * # IndexedDB
 *
 * IndexedDB wrapper logic featuring a modern type-safe, Promise-based
 * asynchronous API.
 *
 * @module indexed-db
 * @since 0.2.0
 */

/**
 * Types of errors which may occur during use of {@link IndexedDB}.
 *
 * @since 0.2.0
 */
export enum IndexedDBErrorKind {
  /**
   * User attempted to open a DB connection with an invalid version number.
   */
  InvalidVersion,
  /**
   * Attempt to create a new DB failed.
   */
  CreationFailed,
  /**
   * User attempted to perform a DB version upgrade while another connection
   * was already open.
   */
  UpgradeBlocked,
}

/**
 * Error thrown when an IndexedDB operation fails.
 *
 * The `errorKind` property contains the exact kind of error that occurred.
 *
 * @since 0.2.0
 */
export class IndexedDBError extends Error {
  override name = "IndexedDBError";

  /**
   * Type of error that occurred.
   */
  public readonly errorKind?: IndexedDBErrorKind;

  override get message(): string {
    switch (this.errorKind) {
      case IndexedDBErrorKind.InvalidVersion:
        return "DB version must be a positive integer.";
      case IndexedDBErrorKind.CreationFailed:
        return "DB creation failed.";
      case IndexedDBErrorKind.UpgradeBlocked:
        return "DB upgrade blocked by another connection.";
      default:
        return "Unknown error.";
    }
  }

  /**
   * Constructs a new {@link IndexedDBError} instance
   *
   * @param errorKind which kind of error occurred
   */
  public constructor(errorKind?: IndexedDBErrorKind) {
    super();
    this.errorKind = errorKind;
  }
}

/**
 * Types of transaction modes supported by IndexedDB.
 *
 * @since 0.2.0
 */
export enum TransactionMode {
  /**
   * Transaction is read-only.
   */
  ReadOnly = "readonly",
  /**
   * Transaction may read and write data.
   */
  ReadWrite = "readwrite",
}

/**
 * Callback function that is triggered during an IndexedDB version change event.
 *
 * This callback is invoked when a database's version is being changed and
 * allows for handling schema changes or performing upgrades to the database
 * structure.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/upgradeneeded_event
 *
 * @callback VersionChangeCallback
 * @param {IDBVersionChangeEvent} event - The event triggered during the
 * database upgrade, containing details about the version change.
 *
 * @example
 * ```ts
 * const onUpgrade: VersionChangeCallback = (event) => {
 *   const oldVersion = event.oldVersion;
 *   const newVersion = event.newVersion;
 *
 *   console.log(`Upgrading DB from version ${oldVersion} to version ${newVersion}...`);
 *
 *   // Handle version upgrade logic...
 * };
 * ```
 */
export type VersionChangeCallback = (event: IDBVersionChangeEvent) => void;

/**
 * Defines the schema for an Index in a database or data store.
 * This schema specifies the configuration of an index, including its name,
 * the path to the data it indexes, and additional properties such as uniqueness.
 */
export interface IndexSchema {
  /**
   * Name of the index
   */
  name: string;
  /**
   * Path to the key to index
   */
  keyPath: string | string[];
  /**
   * Indicates whether the value is unique or not.
   * This flag can be used to specify uniqueness constraints or
   * ensure that a particular condition of uniqueness is met.
   *
   * @default false
   */
  unique?: boolean;
}

/**
 * Represents the schema configuration for an object store in a database.
 */
export interface ObjectStoreSchema {
  /**
   * Name of the object store
   */
  name: string;
  /**
   * An optional property representing the path to a specific key or keys.
   * Can be a single string indicating the path to a single key or an array of strings
   * representing paths to multiple keys.
   */
  keyPath?: string | string[];
  /**
   * Indicates whether the key value should automatically increment.
   * If set to true, the value will increase sequentially
   * with each new entry or record.
   */
  autoIncrement?: boolean;
  /**
   * An optional array of indexes to be created on the object store.
   */
  indexes?: IndexSchema[];
}

/**
 * Represents the schema of a database. Defines the structure, versioning,
 * and object stores required to create and manage the database.
 */
export interface DatabaseSchema {
  /**
   * Name of the database
   */
  name: string;
  /**
   * Object stores which should be present in the database
   */
  objectStores: ObjectStoreSchema[];
}

/**
 * Options for opening or creating a database.
 */
export interface OpenDBOptions {
  /**
   * Version of the database to open or create
   */
  version: number;

  /**
   * Callback to be invoked when the database version is upgraded.
   */
  onUpgrade?: VersionChangeCallback;
}

/**
 * IndexedDB wrapper featuring a modern type-safe, Promise-based asynchronous
 * API.
 *
 * @since 0.2.0
 */
export default class IndexedDB {
  /**
   * Current {@link IDBDatabase} connection.
   *
   * @internal
   */
  private dbConnection: IDBDatabase | null = null;

  /**
   * Creates a new database with the given schema and opens a connection to it.
   *
   * @param schema schema of the new database.
   */
  public create(schema: DatabaseSchema): Promise<void> {
    return new Promise((resolve, reject) => {
      const { name, objectStores } = schema;

      let dbOpenRequest: IDBOpenDBRequest;
      try {
        dbOpenRequest = self.indexedDB.open(name, 1);
      } catch (_error) {
        reject(new IndexedDBError(IndexedDBErrorKind.InvalidVersion));
        return;
      }

      dbOpenRequest.addEventListener("upgradeneeded", () => {
        const db = dbOpenRequest.result;

        objectStores.forEach((schema) => {
          const { name, keyPath, autoIncrement, indexes } = schema;
          const objectStoreOptions: IDBObjectStoreParameters = {
            keyPath,
            autoIncrement,
          };

          const objectStore = db.createObjectStore(name, objectStoreOptions);
          indexes?.forEach((indexSchema) => {
            const { name, keyPath, unique } = indexSchema;
            objectStore.createIndex(name, keyPath, { unique });
          });
        });
      });

      dbOpenRequest.addEventListener("blocked", () => {
        reject(new IndexedDBError(IndexedDBErrorKind.UpgradeBlocked));
      });

      dbOpenRequest.addEventListener("error", () => {
        reject(new IndexedDBError(IndexedDBErrorKind.CreationFailed));
      });

      dbOpenRequest.addEventListener("success", () => {
        this.dbConnection = dbOpenRequest.result;
        resolve();
      });
    });
  }

  /**
   * Opens a connection to the requested database, calling {@link onUpgrade} in
   * the event that the requested DB is new or the requested version is higher
   * than the current one.
   *
   * @param name name of the database
   * @param options options to use when opening the database connection
   *
   * @throws IndexedDBError with an `errorKind` of
   * {@link IndexedDBErrorKind.InvalidVersion} if the version number used in
   * `options` is not a positive integer.
   * @throws IndexedDBError with an `errorKind` of
   * {@link IndexedDBErrorKind.UpgradeBlocked} if an upgrade was attempted while
   * the requested DB has other open connections.
   *
   * @example Open a connection to an existing database.
   * ```ts
   * const testDB = new IndexedDB();
   * await testDB.open("testDB");
   * ```
   *
   * @example Open a connection to a new database.
   * ```ts
   * const testDB = new IndexedDB();
   *
   * const options: OpenDBOptions = {
   *   onUpgrade: (event) => {
   *     const db = event.target.result;
   *
   *     const objectStore = db.createObjectStore("testData", {
   *       keyPath: "id",
   *     });
   *
   *     objectStore.createIndex("id", "id", { unique: true });
   *   },
   * };
   *
   * await testDB.open("testDB", options);
   * ```
   */
  public open(name: string, options?: OpenDBOptions): Promise<void> {
    const { version, onUpgrade } = options ?? {};
    let dbOpenRequest: IDBOpenDBRequest;

    return new Promise((resolve, reject) => {
      try {
        dbOpenRequest = self.indexedDB.open(name, version);
      } catch (_error) {
        // This should only error in the event that an invalid version is passed
        reject(new IndexedDBError(IndexedDBErrorKind.InvalidVersion));
        return;
      }

      // Add the version change callback if it was provided
      if (onUpgrade) {
        dbOpenRequest.addEventListener("upgradeneeded", onUpgrade);
      }

      // Reject with the appropriate error if the upgrade was blocked.
      dbOpenRequest.addEventListener("blocked", () => {
        reject(new IndexedDBError(IndexedDBErrorKind.UpgradeBlocked));
      });

      // Resolve the promise when the DB is successfully opened
      dbOpenRequest.addEventListener("success", () => {
        this.dbConnection = dbOpenRequest.result;
        resolve();
      });
    });
  }

  /**
   * Immediately closes the current {@link IDBDatabase} connection.
   *
   * @see IDBDatabase.close
   */
  public close(): void {
    if (this.dbConnection) {
      this.dbConnection.close();
      this.dbConnection = null;
    }
  }
}
