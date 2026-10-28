/**
 * Unsaved AI generations, kept in IndexedDB per set so closing the upload
 * dialog, leaving the page or reloading doesn't throw away cards that already
 * used part of the day's allowance. Page images run to megabytes, which is
 * why this isn't localStorage.
 *
 * A draft is two records: the selected pages (written once, when generation
 * starts) and the generation state (rewritten as it changes).
 */

const DB_NAME = 'obscura-drafts'
const PAGES = 'pages'
const STATE = 'state'

// Sets discarded or saved during this page's lifetime. A late write from a
// component that is unmounting must not bring their draft back.
const cleared = new Set<string>()

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(PAGES)
        req.result.createObjectStore(STATE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => { dbPromise = null })
  }
  return dbPromise
}

async function run<T>(
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => IDBRequest<T> | void
): Promise<T | undefined> {
  const tx = (await db()).transaction(stores, mode)
  const req = body(tx)
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(req ? req.result : undefined)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

// Drafts are a safety net: private windows or a full disk can refuse them,
// and the flow must keep working in memory when they do.
async function quietly<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn()
  } catch {
    return undefined
  }
}

export function saveDraftPages(setId: string, pages: unknown) {
  cleared.delete(setId)
  return quietly(() => run([PAGES], 'readwrite', (tx) => tx.objectStore(PAGES).put(pages, setId)))
}

export function saveDraftState(setId: string, state: unknown) {
  if (cleared.has(setId)) return Promise.resolve(undefined)
  return quietly(() => run([STATE], 'readwrite', (tx) => tx.objectStore(STATE).put(state, setId)))
}

export async function loadDraft<P, S>(setId: string): Promise<{ pages: P; state: S } | null> {
  const [pages, state] = await Promise.all([
    quietly(() => run<P>([PAGES], 'readonly', (tx) => tx.objectStore(PAGES).get(setId))),
    quietly(() => run<S>([STATE], 'readonly', (tx) => tx.objectStore(STATE).get(setId))),
  ])
  return pages && state ? { pages, state } : null
}

export function clearDraft(setId: string) {
  cleared.add(setId)
  return quietly(() =>
    run([PAGES, STATE], 'readwrite', (tx) => {
      tx.objectStore(PAGES).delete(setId)
      tx.objectStore(STATE).delete(setId)
    })
  )
}

/** Ids of sets with an unsaved generation in this browser. */
export async function draftSetIds(): Promise<string[]> {
  const keys = await quietly(() => run([STATE], 'readonly', (tx) => tx.objectStore(STATE).getAllKeys()))
  return (keys ?? []).map(String)
}

/** Lecture content shouldn't outlive the session on a shared computer. */
export function clearAllDrafts() {
  return quietly(() =>
    run([PAGES, STATE], 'readwrite', (tx) => {
      tx.objectStore(PAGES).clear()
      tx.objectStore(STATE).clear()
    })
  )
}
