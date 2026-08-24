
const STORAGE_KEY = 'swim-timing:pending-writes'

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {

    return []
  }
}

function writeRaw(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {

  }
}

export function getQueue() {
  return readRaw()
}

export function enqueue(op) {
  const queue = readRaw()
  const withMeta = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const next = [...queue, withMeta]
  writeRaw(next)
  return next
}

export function removeFromQueue(opId) {
  const next = readRaw().filter((op) => op.id !== opId)
  writeRaw(next)
  return next
}
