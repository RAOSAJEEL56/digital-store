import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Button, Panel } from './UI.jsx'

export default function BarcodeScannerModal({ onClose, onDetected }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const readerRef = useRef(null)
  const mountedRef = useRef(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controlsRef.current?.stop()
    }
  }, [])

  const handleDetectedCode = (code) => {
    const outcome = onDetected(code)
    if (!outcome?.success) setStatus(outcome?.message || `No product found for barcode "${code}".`)
  }

  const startCamera = async () => {
    setStatus('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera is unavailable. Use Gallery or enter the barcode manually.')
      return
    }

    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error, activeControls) => {
        controlsRef.current = activeControls
        if (!mountedRef.current) {
          activeControls.stop()
          return
        }
        if (result) {
          activeControls.stop()
          setCameraActive(false)
          handleDetectedCode(result.getText())
        } else if (error && error.name !== 'NotFoundException') {
          setStatus('Camera scan failed. Try another angle or use Gallery / manual entry.')
        }
      })
      controlsRef.current = controls
      if (!mountedRef.current) {
        controls.stop()
        return
      }
      setCameraActive(true)
    } catch (error) {
      setCameraActive(false)
      const message = error.name === 'NotAllowedError'
        ? 'Camera blocked. Allow camera access, or use Photo / Gallery.'
        : error.name === 'NotFoundException'
          ? 'No camera found. Use Gallery or enter the barcode manually.'
          : 'Could not start the camera. Use Photo / Gallery or enter the barcode manually.'
      setStatus(message)
    }
  }

  const decodeImage = async (file) => {
    if (!file) return
    setBusy(true)
    setStatus('')
    let imageUrl
    try {
      imageUrl = URL.createObjectURL(file)
      const reader = readerRef.current || new BrowserMultiFormatReader()
      readerRef.current = reader
      const result = await reader.decodeFromImageUrl(imageUrl)
      handleDetectedCode(result.getText())
    } catch {
      setStatus('Barcode could not be read from this image. Try a clearer photo or enter it manually.')
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
      setBusy(false)
    }
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setStatus('Start the camera before taking a photo.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const photo = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!photo) {
      setStatus('Photo could not be captured. Try the live scanner or Gallery.')
      return
    }
    await decodeImage(photo)
  }

  const submitManualCode = (event) => {
    event.preventDefault()
    const code = manualCode.trim()
    if (!code) {
      setStatus('Enter a barcode to search for the product.')
      return
    }
    handleDetectedCode(code)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Scan Barcode">
      <Panel className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex h-12 items-center justify-between bg-emerald-700 px-4 text-white">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <i className="fa-solid fa-barcode" aria-hidden="true" /> Scan Barcode
          </h2>
          <button type="button" onClick={onClose} aria-label="Close barcode scanner" className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-white hover:bg-white/10">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="relative flex h-[min(48vw,198px)] min-h-[150px] items-center justify-center overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className={`h-full w-full object-cover ${cameraActive ? 'block' : 'hidden'}`} muted playsInline />
            {!cameraActive && (
              <div className="px-5 text-center text-xs font-semibold text-slate-300">
                <i className="fa-solid fa-barcode mb-2 block text-3xl" aria-hidden="true" />
                Allow camera access to scan a barcode
              </div>
            )}
            {cameraActive && <span className="pointer-events-none absolute inset-x-8 top-1/2 border-t-2 border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />}
          </div>

          {status && <p role="status" className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-2 text-center text-[11px] font-semibold text-rose-700">{status}</p>}

          <Button type="button" onClick={startCamera} disabled={cameraActive || busy} className="min-h-9 w-full rounded-lg bg-blue-600 py-2 text-xs hover:bg-blue-700">
            <i className="fa-solid fa-camera" aria-hidden="true" /> {cameraActive ? 'Camera Ready — Scan Barcode' : 'Allow Camera'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={capturePhoto} disabled={!cameraActive || busy} className="min-h-9 rounded-lg bg-amber-500 py-2 text-xs hover:bg-amber-600">
              <i className="fa-solid fa-camera-retro" aria-hidden="true" /> Take Photo
            </Button>
            <label className={`inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
              <i className="fa-regular fa-image" aria-hidden="true" /> {busy ? 'Reading…' : 'Gallery'}
              <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(event) => { decodeImage(event.target.files?.[0]); event.target.value = '' }} className="sr-only" />
            </label>
          </div>

          <form onSubmit={submitManualCode} className="flex gap-2">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              aria-label="Type barcode"
              placeholder="Type barcode"
              className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-500"
              autoFocus
            />
            <Button type="submit" className="min-h-9 rounded-lg bg-emerald-600 px-4 py-2 text-xs hover:bg-emerald-700">OK</Button>
          </form>
        </div>
      </Panel>
    </div>
  )
}
