import WebStorage from "../src/web-storage.ts";

const storage = WebStorage.getSession();
const itemCount = 500_000;
const testItem: Record<string, number>[] = [];
for (let i = 1; i <= itemCount; i++) {
  testItem.push({
    test: i,
  });
}

Deno.bench("WebStorage: insert large value (sync)", {
  group: "insert",
}, (bench) => {
  storage.clearSync();
  bench.start();
  storage.setItemSync("test", testItem);
  bench.end();
});

Deno.bench("WebStorage: insert large value (async)", {
  group: "insert",
  baseline: true,
}, async (bench) => {
  await storage.clear();
  // deno-lint-ignore prefer-const
  let setItemPromise: Promise<void>;
  bench.start();
  setItemPromise = storage.setItem("test", testItem);
  bench.end();
  await setItemPromise;
});
