/**
 * # IndexedDB
 *
 * IndexedDB wrapper logic featuring a modern type-safe, Promise-based
 * asynchronous API.
 *
 * @module indexed_db
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
   * Attempt to create a new DB failed
   */
  CreationFailed,
  /**
   * Attempt to open an existing DB failed
   */
  OpenFailed,
  /**
   * Attempt to delete an existing DB failed
   */
  DeletionFailed,
  /**
   * User attempted to create a new DB with the same name as an existing one
   */
  DBExists,
  /**
   * User attempted to open a DB with a name that does not exist.
   */
  DBDoesNotExist,
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
      case IndexedDBErrorKind.OpenFailed:
        return "DB open failed.";
      case IndexedDBErrorKind.DeletionFailed:
        return "DB deletion failed.";
      case IndexedDBErrorKind.DBExists:
        return "DB with the same name already exists.";
      case IndexedDBErrorKind.DBDoesNotExist:
        return "DB with the given name does not exist.";
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
  RO = "readonly",
  /**
   * Transaction may read and write data.
   */
  RW = "readwrite",
  RWFlush = "readwriteflush",
}

export class Transaction {
  private transaction: IDBTransaction | null = null;

  public get mode(): TransactionMode | null {
    return this.transaction?.mode as TransactionMode;
  }

  /**
   * Create a new Transaction instance
   *
   * @remarks
   * Library consumers should not call this method directly. Instead, they should
   * start a transaction with {@link IndexedDB.beginTransaction}.
   *
   * @param transaction
   * @internal
   */
  constructor(transaction: IDBTransaction) {
    this.transaction = transaction;
  }

  /**
   * Aborts the current transaction.
   *
   * @remarks
   * Calling this method will set the underlying {@link IDBTransaction} to `null`
   * so that it cannot be used in error.
   */
  public abort(): void {
    if (this.transaction) {
      this.transaction.abort();
      this.transaction = null;
    }
  }

  /**
   * Immediately commits the current transaction.
   *
   * @remarks
   * Calling this method will set the underlying {@link IDBTransaction} to `null`
   * so that it cannot be used in error.
   */
  public commit(): void {
    if (this.transaction) {
      this.transaction.commit();
      this.transaction = null;
    }
  }

  /**
   * Retrieves an object store with the specified name from the transaction.
   *
   * @param name the name of the object store to retrieve.
   * @returns the object store if it exists, otherwise `null`
   */
  public store(name: string): IDBObjectStore | null {
    try {
      return this.transaction?.objectStore(name) as IDBObjectStore;
    } catch (_error) {
      return null;
    }
  }
}

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
   * Name of the connected database
   */
  public readonly name: string;

  /**
   * Current version of the connected database
   */
  public readonly version: number;

  /**
   * Transaction currently in progress
   * @private
   */
  private currentTransaction: Transaction | null = null;

  protected constructor(connection: IDBDatabase) {
    this.dbConnection = connection;
    this.name = connection.name;
    this.version = connection.version;
  }

  /**
   * Gets the database connection state
   *
   * @returns `true` if the database connection is active, otherwise `false`
   */
  public get isConnected(): boolean {
    return this.dbConnection !== null;
  }

  /**
   * Retrieves a promise that resolves to a list of information about all
   * existing databases.
   *
   * @returns a promise that resolves to an array of database information
   * objects, where each object contains the database name and version.
   */
  public static get databases(): Promise<IDBDatabaseInfo[]> {
    return self.indexedDB.databases();
  }

  /**
   * Checks if a database with the specified name exists.
   *
   * @param name the name of the database to look for.
   * @returns a Promise that resolves to `true` if a database with the given
   * name exists, otherwise `false`.
   */
  public static async databaseExists(name: string): Promise<boolean> {
    return (await IndexedDB.databases).some((db) => db.name === name);
  }

  /**
   * Deletes the specified database if it exists.
   *
   * @param name the name of the database to be deleted.
   * @returns a Promise that resolves when the database is successfully deleted,
   * or rejects if an error occurs during the deletion process.
   *
   * @throws IndexedDBError {@link IndexedDBErrorKind.DeletionFailed} if DB
   * deletion fails
   */
  public static async deleteDatabase(name: string): Promise<void> {
    // Don't delete a DB that doesn't exist
    if (!(await IndexedDB.databaseExists(name))) return;

    const dbDeleteRequest = self.indexedDB.deleteDatabase(name);

    return new Promise((resolve, reject) => {
      dbDeleteRequest.addEventListener(
        "error",
        () => reject(new IndexedDBError(IndexedDBErrorKind.DeletionFailed)),
      );
      dbDeleteRequest.addEventListener("success", () => resolve());
    });
  }

  /**
   * Creates a new database with the given schema and opens a connection to it.
   *
   * @param schema schema of the new database.
   * @returns a Promise resolving to a new {@link IndexedDB} instance managing
   * the connection to the newly created DB.
   *
   * @throws IndexedDBError with `kind` {@link IndexedDBErrorKind.DBExists} if
   * a DB with the same name already exists at this origin.
   */
  public static async create(schema: DatabaseSchema): Promise<IndexedDB> {
    const { name, objectStores } = schema;
    if (await IndexedDB.databaseExists(name)) {
      throw new IndexedDBError(IndexedDBErrorKind.DBExists);
    }

    let dbOpenRequest: IDBOpenDBRequest;
    try {
      dbOpenRequest = self.indexedDB.open(name, 1);
    } catch (_error) {
      throw new IndexedDBError(IndexedDBErrorKind.InvalidVersion);
    }

    return new Promise((resolve, reject) => {
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
        const db = dbOpenRequest.result;
        resolve(new IndexedDB(db));
      });
    });
  }

  /**
   * Opens a connection to an existing database of the given name.
   *
   * @param name name of the database to open a connection to
   */
  public static async open(name: string): Promise<IndexedDB> {
    // `open()` should only be used for existing DBs. We do not handle creation or
    // upgrade logic here
    if (!(await IndexedDB.databaseExists(this.name))) {
      throw new IndexedDBError(IndexedDBErrorKind.DBDoesNotExist);
    }

    let dbOpenRequest: IDBOpenDBRequest;
    try {
      dbOpenRequest = self.indexedDB.open(name);
    } catch (_error) {
      // We should never hit this since we aren't providing a version
      throw new IndexedDBError();
    }

    return new Promise((resolve, reject) => {
      // `blocked` and `upgradeneeded` shouldn't fire in this case. This method
      // opens the most recent DB version.
      const defaultReject = () => reject(new IndexedDBError());
      dbOpenRequest.addEventListener("blocked", defaultReject);
      dbOpenRequest.addEventListener("upgradeneeded", defaultReject);

      dbOpenRequest.addEventListener("error", () => {
        reject(new IndexedDBError(IndexedDBErrorKind.OpenFailed));
      });

      dbOpenRequest.addEventListener("success", () => {
        const db = dbOpenRequest.result;
        resolve(new IndexedDB(db));
      });
    });
  }

  /**
   * Reopens the database connection if it is not already open.
   *
   * If the database no longer exists, an error will be thrown.
   * Handles potential errors or issues during the reconnection process.
   *
   * @remarks
   * This method will attempt to reopen the same version of the database as was
   * previously used. If an upgrade has happened since then, an error will be
   * thrown.
   *
   * @returns a Promise that resolves when the database connection is
   * successfully reopened, or rejects with an error if the reconnection fails
   * or the database no longer exists.
   *
   * @throws IndexedDBError {@link IndexedDBErrorKind.DBDoesNotExist} if the DB
   * was deleted since the connection was last open.
   * @throws IndexedDBError {@link IndexedDBErrorKind.InvalidVersion} if the DB
   * version has changed since the connection was last open.
   * @throws IndexedDBError if any other error occurred
   */
  public async reopen(): Promise<void> {
    // Immediately returns if the connection is already open
    if (this.dbConnection) return;

    // Throw an error if the DB no longer exists. It was likely deleted
    // elsewhere.
    if (!(await IndexedDB.databaseExists(this.name))) {
      throw new IndexedDBError(IndexedDBErrorKind.DBDoesNotExist);
    }

    let dbOpenRequest: IDBOpenDBRequest;
    try {
      dbOpenRequest = self.indexedDB.open(this.name, this.version);
    } catch (_error) {
      throw new IndexedDBError(IndexedDBErrorKind.InvalidVersion);
    }

    return new Promise((resolve, reject) => {
      // Opening shouldn't fail or trigger an upgrade event at this point, but
      // we can't guarantee that, so we reject with a generic IndexedDBError.
      const defaultReject = () => reject(new IndexedDBError());
      dbOpenRequest.addEventListener("error", defaultReject);
      dbOpenRequest.addEventListener("blocked", defaultReject);
      dbOpenRequest.addEventListener("upgradeneeded", defaultReject);

      dbOpenRequest.addEventListener("success", () => {
        this.dbConnection = dbOpenRequest.result;
        resolve();
      });
    });
  }

  /**
   * Immediately closes the current {@link IDBDatabase} connection.
   *
   * The connection must be reopened before it can be used again.
   *
   * @see IDBDatabase.close
   */
  public close(): void {
    if (this.dbConnection) {
      this.dbConnection.close();
      this.dbConnection = null;
    }
  }

  /**
   * Begins a new transaction.
   *
   * @param stores names of {@link IDBObjectStore}s to use with this transaction
   * @param mode the transaction mode to use
   * @returns a new {@link Transaction} instance
   */
  public beginTransaction(
    stores: string | string[],
    mode: TransactionMode = TransactionMode.RO,
  ): Transaction {
    if (!this.dbConnection) throw new IndexedDBError(); // TODO: Create new error kind for this

    const transaction = this.dbConnection.transaction(
      stores,
      mode as IDBTransactionMode,
    );
    return new Transaction(transaction);
  }
}
