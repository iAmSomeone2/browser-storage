/**
 * # Storage Manager
 *
 * Wrapper logic for the browser's {@link StorageManager} object.
 *
 * @module storage_manager
 * @since 0.2.0
 */

/**
 * Wrapper class for the browser's {@link StorageManager} object.
 *
 * @remarks
 * Will automatically refer to the appropriate {@link StorageManager} instance
 * if this is used in a {@link Worker} context.
 */
export default class BrowserStorageManager {
  private readonly manager: StorageManager;

  private _isPersisted: boolean = false;

  private constructor() {
    this.manager = self.navigator.storage;

    // Check if persistence has already been granted
    this.manager.persisted().then((persisted) => this._isPersisted = persisted);
  }

  private static _instance: BrowserStorageManager;

  /**
   * Returns the BrowserStorageManager singleton.
   *
   * @returns the singleton instance of
   * BrowserStorageManager.
   */
  public static get instance(): BrowserStorageManager {
    if (!BrowserStorageManager._instance) {
      BrowserStorageManager._instance = new BrowserStorageManager();
    }

    return BrowserStorageManager._instance;
  }

  /**
   * Whether the site's storage bucket is persistent.
   *
   * @return `true` if the storage bucket is persisted, otherwise `false`.
   */
  public get isPersisted(): boolean {
    return this._isPersisted;
  }

  /**
   * Estimates the amount of storage used and available for the application.
   *
   * This method calls the underlying storage manager to retrieve an estimation
   * of the storage usage, which includes both the quota allocated to the application
   * and the storage already used. The returned result can help in understanding
   * storage constraints and planning storage utilization.
   *
   * @return A promise that resolves to a StorageEstimate object containing
   * details about the quota and the actual usage (in bytes).
   */
  public estimate(): Promise<StorageEstimate> {
    return this.manager.estimate();
  }

  /**
   * Requests permission to use persistent storage.
   *
   * @remarks
   * - The result of this method will also be written to {@link isPersisted}.
   * - This method will do nothing if the permission has already been granted.
   *
   * @return A promise that resolves to a boolean value indicating whether
   * the user granted permission to use persistent storage.
   *
   * @throws {Error} if requesting the persistent storage permission is not
   * supported -- such as in a Web Worker context.
   * @throws {TypeError} if getting a local storage shelf failed
   */
  public async persist(): Promise<void> {
    if (this.isPersisted) return;

    if (!this.manager.persist) {
      throw new Error(
        "Browser does not support persistent storage, or it is not supported in this context.",
      );
    }

    this._isPersisted = await this.manager.persist();
  }

  /**
   * Retrieves a directory handle from the file system.
   *
   * This method interacts with the file system to get a handle
   * to a directory, which can be used to access or manipulate files
   * and directories within it.
   *
   * @returns a promise that resolves to a {@link FileSystemDirectoryHandle},
   * representing the directory handle.
   *
   * @throws DOMException of type `SecurityError` if the user agent is not able
   * to map the requested directory to the local origin private file system.
   */
  public getDirectory(): Promise<FileSystemDirectoryHandle> {
    return this.manager.getDirectory();
  }
}
