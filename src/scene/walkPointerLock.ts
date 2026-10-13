/** Keep a late lock request from capturing the mouse after its walk has ended. */
export function requestWalkPointerLock(canvas: HTMLElement, isDisposed: () => boolean, onUnavailable: () => void): void {
  const document = canvas.ownerDocument
  let settled = false
  const finish = () => {
    settled = true
    document.removeEventListener('pointerlockchange', changed)
    document.removeEventListener('pointerlockerror', failed)
  }
  const releaseLateLock = () => {
    if (isDisposed() && document.pointerLockElement === canvas) document.exitPointerLock()
  }
  const changed = () => {
    if (document.pointerLockElement !== canvas) return
    releaseLateLock()
    finish()
  }
  const failed = () => {
    if (settled) return
    finish()
    if (!isDisposed()) onUnavailable()
  }
  // Event handling also covers browsers whose requestPointerLock returns void.
  document.addEventListener('pointerlockchange', changed)
  document.addEventListener('pointerlockerror', failed)
  try {
    const request = canvas.requestPointerLock()
    if (request && typeof request.then === 'function') {
      request.then(() => { releaseLateLock(); finish() }, failed)
    }
  } catch { failed() }
}
