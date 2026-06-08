import { useState, useRef, useCallback } from 'react'
import { toast } from 'react-toastify'
import type { AiAnalysisResult, AiMaterial, AiMatchedBarang } from '../interfaces/AiMaterialAnalyzerInterface'
import { AiMaterialAnalyzerService } from '../service/AiMaterialAnalyzerService'

interface PageState {
  imageBase64: string | null
  imageMimeType: string | null
  imagePreviewUrl: string | null
  loading: boolean
  result: AiAnalysisResult | null
}

function compressImage(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 1920
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim }
          else { width = Math.round((width * maxDim) / height); height = maxDim }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', previewUrl: dataUrl })
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function SkeletonResult() {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ height: 16, width: '70%', background: 'var(--border)', borderRadius: 6, marginBottom: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />
      <div style={{ height: 13, width: '90%', background: 'var(--border)', borderRadius: 6, marginBottom: 20, animation: 'pulse 1.4s ease-in-out infinite' }} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 2fr', gap: 10, marginBottom: 10 }}>
          {[0, 1, 2, 3].map((j) => (
            <div key={j} style={{ height: 13, background: 'var(--border)', borderRadius: 5, opacity: 1 - i * 0.1, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function MaterialTable({ materials }: { materials: AiMaterial[] }) {
  const handleCopy = () => {
    const headers = ['Nama Material', 'Est. Qty', 'Satuan', 'Catatan Penggunaan']
    const rows = materials.map(m => [m.nama, m.estimasi_qty, m.satuan, m.catatan].join('\t'))
    navigator.clipboard.writeText([headers.join('\t'), ...rows].join('\n')).then(() => {
      toast('Tabel berhasil disalin!', { type: 'success', autoClose: 1800 })
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Hasil Analisa
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', border: '1px solid var(--border)',
            borderRadius: 6, background: 'var(--white)', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-2)', fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Salin tabel
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama Material</th>
              <th style={{ width: 80 }}>Est. Qty</th>
              <th style={{ width: 80 }}>Satuan</th>
              <th>Catatan Penggunaan</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, i) => (
              <tr key={i}>
                <td className="name-cell">{m.nama}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{m.estimasi_qty}</td>
                <td><span className="badge badge-blue">{m.satuan}</span></td>
                <td style={{ color: 'var(--text-2)', fontSize: 12.5 }}>{m.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryCard({ item }: { item: AiMatchedBarang }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      style={{
        display: 'flex', gap: 12, padding: '12px 14px',
        background: 'var(--white)', border: '1px solid var(--border)',
        borderRadius: 10, transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{
        width: 52, height: 52, flexShrink: 0,
        background: 'var(--bg)', borderRadius: 8,
        border: '1px solid var(--border)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.photo_url && !imgError ? (
          <img
            src={item.photo_url} alt={item.nama}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 20, height: 20, color: 'var(--border)' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.nama}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          {item.kategori && <span className="badge badge-gray" style={{ fontSize: 10.5 }}>{item.kategori}</span>}
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Stok: <strong style={{ color: 'var(--text-2)' }}>{item.stok}</strong></span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--brand)', fontStyle: 'italic' }}>
          ≈ {item.matched_material}
        </div>
      </div>
    </div>
  )
}

export default function AiMaterialAnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<PageState>({
    imageBase64: null,
    imageMimeType: null,
    imagePreviewUrl: null,
    loading: false,
    result: null,
  })
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('File harus berupa gambar (JPG, PNG, WEBP).', { type: 'error' })
      return
    }
    try {
      const { base64, mimeType, previewUrl } = await compressImage(file)
      setState(prev => ({ ...prev, imageBase64: base64, imageMimeType: mimeType, imagePreviewUrl: previewUrl, result: null }))
    } catch {
      toast('Gagal memproses gambar.', { type: 'error' })
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleAnalyze = async () => {
    if (!state.imageBase64 || !state.imageMimeType || state.loading) return
    setState(prev => ({ ...prev, loading: true }))
    try {
      const result = await AiMaterialAnalyzerService.analyze(state.imageBase64, state.imageMimeType)
      setState(prev => ({ ...prev, loading: false, result }))
    } catch (err) {
      setState(prev => ({ ...prev, loading: false }))
      toast(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.', { type: 'error' })
    }
  }

  const handleReset = () => {
    setState({ imageBase64: null, imageMimeType: null, imagePreviewUrl: null, loading: false, result: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Material Analyzer</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
            Upload gambar dekorasi untuk menganalisa material yang dibutuhkan menggunakan AI.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge badge-purple" style={{ fontSize: 11 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, marginRight: 4 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            AI Powered
          </span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 18, marginBottom: 18 }}>

        {/* Left: Upload panel */}
        <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Upload Gambar Dekorasi
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {/* Drop zone */}
          <div
            onClick={() => !state.imagePreviewUrl && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 10,
              background: dragOver ? 'var(--brand-bg)' : 'var(--bg)',
              minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: state.imagePreviewUrl ? 'default' : 'pointer',
              transition: 'border-color .15s, background .15s',
              overflow: 'hidden',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!state.imagePreviewUrl) e.currentTarget.style.borderColor = 'var(--brand)' }}
            onMouseLeave={e => { if (!state.imagePreviewUrl) e.currentTarget.style.borderColor = dragOver ? 'var(--brand)' : 'var(--border)' }}
          >
            {state.imagePreviewUrl ? (
              <>
                <img
                  src={state.imagePreviewUrl}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: 240 }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                >
                  <button
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                    className="btn btn-ghost"
                    style={{ opacity: 0, transition: 'opacity .15s', fontSize: 12 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    Ganti Gambar
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 20px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--brand-bg)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  <span style={{ color: 'var(--brand)' }}>Klik untuk upload</span> atau drag &amp; drop
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG, WEBP</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', opacity: (!state.imageBase64 || state.loading) ? 0.55 : 1 }}
              disabled={!state.imageBase64 || state.loading}
              onClick={handleAnalyze}
            >
              {state.loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Menganalisa...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  Analisa Material
                </>
              )}
            </button>
            {state.imagePreviewUrl && (
              <button className="btn btn-ghost" onClick={handleReset} title="Reset">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Right: Result panel */}
        <div className="card" style={{ padding: '20px 22px' }}>
          {state.loading ? (
            <SkeletonResult />
          ) : state.result ? (
            <>
              {state.result.deskripsi && (
                <div style={{
                  background: 'var(--brand-bg)', border: '1px solid rgba(79,70,229,0.15)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  fontSize: 13, color: 'var(--brand)', lineHeight: 1.55,
                }}>
                  <strong>Deskripsi: </strong>{state.result.deskripsi}
                </div>
              )}
              <MaterialTable materials={state.result.material} />
            </>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', minHeight: 220,
              color: 'var(--text-muted)',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 12, background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 12, border: '1px solid var(--border)',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Hasil Analisa</p>
              <p style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.5 }}>
                Upload gambar dekorasi untuk<br />memulai analisa.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory matches */}
      {state.result && (
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Ketersediaan di Inventori
            </div>
            {(state.result.matched_barang?.length ?? 0) > 0 && (
              <span className="badge badge-green">
                {state.result.matched_barang!.length} item ditemukan
              </span>
            )}
          </div>

          {(state.result.matched_barang?.length ?? 0) === 0 ? (
            <div className="no-data">Tidak ada material yang cocok di inventori.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {state.result.matched_barang!.map(item => (
                <InventoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
