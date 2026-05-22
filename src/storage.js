const PREFIX = 'merka.react.v1.'

const seedMeasurements = [
  { id: 1, date: '2026-05-01T09:00', weight: 89, height: 170, chest: 102, waist: 91, belly: 98, hips: 104, leg: 58, note: '' },
  { id: 2, date: '2026-05-08T09:00', weight: 88, height: 170, chest: 102, waist: 90, belly: 96, hips: 103, leg: 58, note: '' },
  { id: 3, date: '2026-05-15T09:00', weight: 86, height: 170, chest: 103, waist: 88, belly: 94, hips: 102, leg: 58, note: '' },
  { id: 4, date: '2026-05-22T09:00', weight: 85, height: 170, chest: 104, waist: 86, belly: 92, hips: 101, leg: 58, note: '' },
]

const seedClothes = {
  top: 'L',
  bottom: '48',
  shoes: '42',
  jeans: 'W32',
  shirt: '41',
  belt: '105',
  note: '',
}

const seedBrands = [
  { id: 1, name: 'Nike', type: 'Спорт', shoes: '43', top: 'L', bottom: '48', other: '42-44', note: 'Кроссовки лучше брать 43–43.5' },
  { id: 2, name: 'Adidas', type: 'Спорт', shoes: '42.5', top: 'L', bottom: '48', other: '43-45', note: 'Футболки сидят свободнее' },
]

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function initStore() {
  if (!localStorage.getItem(PREFIX + 'measurements')) writeStore('measurements', seedMeasurements)
  if (!localStorage.getItem(PREFIX + 'clothes')) writeStore('clothes', seedClothes)
  if (!localStorage.getItem(PREFIX + 'brands')) writeStore('brands', seedBrands)
}

export function exportBackup() {
  const data = {
    measurements: readStore('measurements', []),
    clothes: readStore('clothes', {}),
    brands: readStore('brands', []),
    exportedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'merka-backup.json'
  link.click()
}
