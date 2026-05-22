import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Archive, Home, Plus, Ruler, Shirt, UserRound, Download } from 'lucide-react'
import { exportBackup, initStore, readStore, writeStore } from './storage.js'

initStore()

const fields = [
  ['weight', 'Вес', 'кг'],
  ['height', 'Рост', 'см'],
  ['chest', 'Грудь', 'см'],
  ['waist', 'Талия', 'см'],
  ['belly', 'Живот', 'см'],
  ['hips', 'Бедра', 'см'],
  ['leg', 'Нога', 'см'],
]

const labels = Object.fromEntries(fields.map(([key, label]) => [key, label]))
const units = Object.fromEntries(fields.map(([key, , unit]) => [key, unit]))
const goodWhenDown = new Set(['weight', 'waist', 'belly', 'hips'])

function sortByDate(items) {
  return [...items].sort((a, b) => new Date(b.date) - new Date(a.date))
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(String(value).replace(',', '.'))
  return Number.isNaN(number) ? null : number
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return String(value).replace('.', ',')
}

function trendClass(key, delta) {
  if (delta === null || delta === undefined || delta === 0) return 'neutral'
  if (goodWhenDown.has(key)) return delta < 0 ? 'good' : 'bad'
  return delta > 0 ? 'good' : 'bad'
}

function trendText(delta, unit = '') {
  if (delta === null || delta === undefined) return '—'
  if (delta === 0) return '0'
  const rounded = Math.round(delta * 10) / 10
  return `${rounded > 0 ? '+' : ''}${String(rounded).replace('.', ',')}${unit ? ` ${unit}` : ''}`
}

function nowForInput() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function BodyFigure() {
  return (
    <img
      className="bodyFigure"
      src="/merka/body-model.webp"
      alt="Силуэт тела"
      draggable="false"
    />
  )
}

function MeasureItem({ name, value, unit, delta, status }) {
  return (
    <div className="measureItem">
      <div className="measureName">{name}</div>
      <div className="measureValue">{formatNumber(value)}{value !== null && value !== undefined ? ` ${unit}` : ''}</div>
      <div className={`measureDelta ${status}`}>{trendText(delta, unit)}</div>
    </div>
  )
}

function Sparkline({ data }) {
  const values = data.map(item => item.weight).filter(value => value !== null && value !== undefined)
  if (values.length < 2) return <div className="emptyChart">Недостаточно данных</div>

  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values.map((value, index) => {
    const x = 12 + index * (176 / (values.length - 1))
    const y = 74 - ((value - min) / (max - min || 1)) * 56
    return `${x},${y}`
  }).join(' ')

  return (
    <svg className="sparkline" viewBox="0 0 200 88">
      <polyline points={points} fill="none" stroke="var(--green)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {points.split(' ').map((point, index) => {
        const [x, y] = point.split(',')
        return <circle key={index} cx={x} cy={y} r="4.5" fill="var(--green)" />
      })}
    </svg>
  )
}

function HomeScreen({ measurements, clothes, setScreen, onExport }) {
  const sorted = useMemo(() => sortByDate(measurements), [measurements])
  const current = sorted[0]
  const previous = sorted[1]

  const delta = key => current?.[key] !== null && current?.[key] !== undefined && previous?.[key] !== null && previous?.[key] !== undefined
    ? current[key] - previous[key]
    : null

  const periodDelta = sorted.length >= 2 && sorted[0].weight !== null
    ? sorted[0].weight - sorted[Math.min(sorted.length - 1, 4)].weight
    : null

  return (
    <>
      <header className="header">
        <div>
          <h1>Мерка</h1>
          <p>{current ? `Последний замер: ${new Date(current.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}` : 'Нет замеров'}</p>
        </div>
        <button className="iconButton" onClick={onExport} aria-label="Экспорт"><Download size={20} /></button>
      </header>

      <section className="heroCard">
        <div className="figureGrid">
          <div className="measureColumn">
            {['height', 'waist', 'hips', 'weight'].map(key => (
              <MeasureItem key={key} name={labels[key]} value={current?.[key]} unit={units[key]} delta={delta(key)} status={trendClass(key, delta(key))} />
            ))}
          </div>

          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="figureBox">
            <BodyFigure />
          </motion.div>

          <div className="measureColumn right">
            {['chest', 'belly', 'leg'].map(key => (
              <MeasureItem key={key} name={labels[key]} value={current?.[key]} unit={units[key]} delta={delta(key)} status={trendClass(key, delta(key))} />
            ))}
          </div>
        </div>
      </section>

      <div className="quickActions">
        <button className="actionCard" onClick={() => setScreen('measure')}>
          <span className="actionIcon primary"><Plus size={24} /></span>
          <span><b>Новый замер</b><em>Вес, талия, грудь, живот</em></span>
        </button>
        <button className="actionCard" onClick={() => setScreen('clothes')}>
          <span className="actionIcon"><Shirt size={22} /></span>
          <span><b>Размеры</b><em>Одежда, обувь, бренды</em></span>
        </button>
      </div>

      <div className="twoCards">
        <button className="infoCard" onClick={() => setScreen('history')}>
          <b>Динамика</b>
          <Sparkline data={sorted.slice(0, 7).reverse()} />
          <strong className={trendClass('weight', periodDelta)}>{trendText(periodDelta, 'кг')}</strong>
          <em>по последним замерам</em>
        </button>

        <button className="infoCard" onClick={() => setScreen('clothes')}>
          <b>Одежда</b>
          <div className="sizeGrid">
            <span>Верх<strong>{clothes.top || '—'}</strong></span>
            <span>Низ<strong>{clothes.bottom || '—'}</strong></span>
            <span>Обувь<strong>{clothes.shoes || '—'}</strong></span>
            <span>Джинсы<strong>{clothes.jeans || '—'}</strong></span>
          </div>
        </button>
      </div>
    </>
  )
}

function HistoryScreen({ measurements, setScreen }) {
  const sorted = useMemo(() => sortByDate(measurements), [measurements])

  return (
    <>
      <header className="header">
        <div>
          <h1>История</h1>
          <p>Замеры и динамика</p>
        </div>
        <button className="iconButton" onClick={() => setScreen('measure')}><Plus size={20} /></button>
      </header>

      <div className="tabs">
        <button className="active">Замеры</button>
        <button>График</button>
        <button>Сравнение</button>
      </div>

      <section className="trendGrid">
        {['weight', 'waist', 'belly'].map(key => {
          const valid = sorted.filter(item => item[key] !== null && item[key] !== undefined)
          const delta = valid.length >= 2 ? valid[0][key] - valid[Math.min(valid.length - 1, 4)][key] : null
          return (
            <div className="trendCard" key={key}>
              <span>{labels[key]}</span>
              <b className={trendClass(key, delta)}>{trendText(delta, units[key])}</b>
              <em>за период</em>
            </div>
          )
        })}
      </section>

      <section className="listCard">
        <h2>История замеров</h2>
        {sorted.length === 0 ? <div className="empty">Пока нет замеров</div> : sorted.map((item, index) => {
          const prev = sorted[index + 1]
          return (
            <div className="record" key={item.id}>
              <div className="recordDate">
                <b>{new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</b>
                <span>{new Date(item.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="recordValues">
                {['weight', 'waist', 'chest', 'belly'].map(key => {
                  const delta = prev && item[key] !== null && item[key] !== undefined && prev[key] !== null && prev[key] !== undefined ? item[key] - prev[key] : null
                  return (
                    <span key={key}>
                      <em>{labels[key]}</em>
                      <b>{formatNumber(item[key])}</b>
                      <small className={trendClass(key, delta)}>{trendText(delta)}</small>
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
        <button className="wideButton" onClick={() => setScreen('measure')}>Добавить замер</button>
      </section>
    </>
  )
}

function MeasureScreen({ measurements, setMeasurements, setScreen }) {
  const last = sortByDate(measurements)[0]
  const [form, setForm] = useState({
    date: nowForInput(),
    weight: '',
    height: '',
    chest: '',
    waist: '',
    belly: '',
    hips: '',
    leg: '',
    note: '',
  })

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()

    const record = {
      id: Date.now(),
      date: form.date || new Date().toISOString(),
      note: form.note || '',
    }

    fields.forEach(([key]) => {
      const parsed = parseNumber(form[key])
      record[key] = parsed ?? last?.[key] ?? null
    })

    const next = [...measurements, record]
    setMeasurements(next)
    writeStore('measurements', next)
    setScreen('home')
  }

  return (
    <>
      <header className="header">
        <div>
          <h1>Замер</h1>
          <p>Пустые поля возьмутся из прошлого замера</p>
        </div>
        <button className="iconButton" onClick={() => setScreen('home')}>×</button>
      </header>

      <form className="formCard" onSubmit={submit}>
        <label className="field full">
          <span>Дата</span>
          <input type="datetime-local" value={form.date} onChange={event => update('date', event.target.value)} />
        </label>

        {[
          ['weight', 'Вес, кг'], ['height', 'Рост, см'],
          ['chest', 'Грудь, см'], ['waist', 'Талия, см'],
          ['belly', 'Живот, см'], ['hips', 'Бедра, см'],
          ['leg', 'Нога, см'],
        ].map(([key, label]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input inputMode="decimal" placeholder={last?.[key] ?? ''} value={form[key]} onChange={event => update(key, event.target.value)} />
          </label>
        ))}

        <label className="field full">
          <span>Комментарий</span>
          <textarea rows="3" value={form.note} onChange={event => update('note', event.target.value)} />
        </label>

        <button className="saveButton">Сохранить</button>
      </form>
    </>
  )
}

function ClothesScreen({ clothes, setClothes, setScreen }) {
  const [form, setForm] = useState(clothes)

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    setClothes(form)
    writeStore('clothes', form)
    setScreen('home')
  }

  return (
    <>
      <header className="header">
        <div>
          <h1>Одежда</h1>
          <p>Базовые размеры для заказов</p>
        </div>
        <button className="iconButton" onClick={() => setScreen('brands')}>Бренды</button>
      </header>

      <form className="formCard" onSubmit={submit}>
        {[
          ['top', 'Верх', 'L'],
          ['bottom', 'Низ', '48'],
          ['shoes', 'Обувь', '42'],
          ['jeans', 'Джинсы', 'W32 L30'],
          ['shirt', 'Рубашка', '41'],
          ['belt', 'Ремень', '105'],
        ].map(([key, label, placeholder]) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <input placeholder={placeholder} value={form[key] || ''} onChange={event => update(key, event.target.value)} />
          </label>
        ))}

        <label className="field full">
          <span>Заметки</span>
          <textarea rows="3" value={form.note || ''} onChange={event => update('note', event.target.value)} />
        </label>

        <button className="saveButton">Сохранить</button>
      </form>
    </>
  )
}

function BrandsScreen({ brands, setBrands }) {
  const empty = { name: '', type: '', shoes: '', top: '', bottom: '', other: '', note: '' }
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)

  function newBrand() {
    setEditing('new')
    setForm(empty)
  }

  function edit(index) {
    setEditing(index)
    setForm(brands[index])
  }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()

    let next
    if (editing === 'new') next = [...brands, { ...form, id: Date.now() }]
    else next = brands.map((brand, index) => index === editing ? { ...form, id: brand.id } : brand)

    setBrands(next)
    writeStore('brands', next)
    setEditing(null)
  }

  return (
    <>
      <header className="header">
        <div>
          <h1>Бренды</h1>
          <p>Реальные размеры по брендам</p>
        </div>
        <button className="iconButton" onClick={newBrand}><Plus size={20} /></button>
      </header>

      <div className="brandList">
        {brands.map((brand, index) => (
          <button className="brandCard" key={brand.id} onClick={() => edit(index)}>
            <div className="brandTop">
              <span className="brandLogo">{(brand.name || '?').slice(0, 2).toUpperCase()}</span>
              <span><b>{brand.name}</b><em>{brand.type}</em></span>
            </div>
            <div className="brandSizes">
              <span>Обувь<b>{brand.shoes || '—'}</b></span>
              <span>Верх<b>{brand.top || '—'}</b></span>
              <span>Низ<b>{brand.bottom || '—'}</b></span>
              <span>Другое<b>{brand.other || '—'}</b></span>
            </div>
            {brand.note ? <p>{brand.note}</p> : null}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {editing !== null ? (
          <motion.form className="formCard modalForm" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} onSubmit={submit}>
            {[
              ['name', 'Бренд'], ['type', 'Тип'],
              ['shoes', 'Обувь'], ['top', 'Верх'],
              ['bottom', 'Низ'], ['other', 'Другое'],
            ].map(([key, label]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input value={form[key] || ''} onChange={event => update(key, event.target.value)} />
              </label>
            ))}
            <label className="field full">
              <span>Заметка</span>
              <textarea rows="2" value={form.note || ''} onChange={event => update('note', event.target.value)} />
            </label>
            <button className="saveButton">Сохранить бренд</button>
          </motion.form>
        ) : null}
      </AnimatePresence>
    </>
  )
}

function Navigation({ screen, setScreen }) {
  const items = [
    ['home', Home, 'Главная'],
    ['history', Activity, 'История'],
    ['measure', Plus, 'Замер'],
    ['clothes', Shirt, 'Одежда'],
    ['brands', Archive, 'Бренды'],
  ]

  return (
    <nav className="bottomNav">
      {items.map(([key, Icon, label]) => (
        <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [measurements, setMeasurements] = useState(() => readStore('measurements', []))
  const [clothes, setClothes] = useState(() => readStore('clothes', {}))
  const [brands, setBrands] = useState(() => readStore('brands', []))

  return (
    <div className="appShell">
      <main className="app">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {screen === 'home' && <HomeScreen measurements={measurements} clothes={clothes} setScreen={setScreen} onExport={exportBackup} />}
            {screen === 'history' && <HistoryScreen measurements={measurements} setScreen={setScreen} />}
            {screen === 'measure' && <MeasureScreen measurements={measurements} setMeasurements={setMeasurements} setScreen={setScreen} />}
            {screen === 'clothes' && <ClothesScreen clothes={clothes} setClothes={setClothes} setScreen={setScreen} />}
            {screen === 'brands' && <BrandsScreen brands={brands} setBrands={setBrands} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Navigation screen={screen} setScreen={setScreen} />
    </div>
  )
}
