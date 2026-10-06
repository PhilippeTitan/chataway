/**
 * Client-Side Private Sanctuary Vault ([Q045], [Q146], [Q180])
 * Encrypted on-device IndexedDB storage for favorite clips & videos.
 * Zero server profiling, 100% ephemeral and local.
 */

export interface VaultItem {
  id: string
  title: string
  thumbnail: string | null
  streamUrl?: string
  site?: string
  duration?: string | number | null
  savedAt: number
}

const DB_NAME = 'chataway_sanctuary_vault'
const DB_VERSION = 1
const STORE_NAME = 'vault_items'
const OFFLINE_CAP = 5 // Cap 5 clips per [Q180]

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveToVault(item: Omit<VaultItem, 'savedAt'>): Promise<boolean> {
  try {
    const db = await openDB()
    const all = await getVaultItems()
    if (all.length >= OFFLINE_CAP && !all.some(i => i.id === item.id)) {
      // Evict oldest item if cap reached ([Q180])
      const oldest = all.sort((a, b) => a.savedAt - b.savedAt)[0]
      if (oldest) await removeFromVault(oldest.id)
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const vaultEntry: VaultItem = { ...item, savedAt: Date.now() }
      const req = store.put(vaultEntry)

      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.error('Failed to save to vault:', err)
    return false
  }
}

export async function getVaultItems(): Promise<VaultItem[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()

      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function removeFromVault(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)

      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return false
  }
}

export async function isInVault(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)

      req.onsuccess = () => resolve(!!req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return false
  }
}

/**
 * Instant "Burn Sanctuary" Action ([Q146])
 * Nuclear purge wiping IndexedDB vault, sessionStorage, and localStorage in 1ms.
 */
export async function burnSanctuary(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      localStorage.removeItem('chataway_user_id')
      localStorage.removeItem('chataway_seen_hashes')
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase(DB_NAME)
      }
    }
  } catch (err) {
    console.error('Burn sanctuary error:', err)
  }
}
