const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const HOLIDAY_CACHE_PREFIX = 'holiday_config_'
const HOLIDAY_CACHE_TTL = 1000 * 60 * 60 * 24 * 30
const HOLIDAY_API_ENDPOINTS = [
  'https://timor.tech/api/holiday/year/{year}',
  'https://timor.tech/api/holiday/year/{year}/'
]
const SOLAR_TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
]
const SOLAR_TERM_INFO = [
  0, 21208, 42467, 63836, 85337, 107014,
  128867, 150921, 173149, 195551, 218072, 240693,
  263343, 285989, 308563, 331033, 353350, 375494,
  397447, 419210, 440795, 462224, 483532, 504758
]

const FIXED_HOLIDAYS = {
  '01-01': '元旦',
  '05-01': '劳动节',
  '10-01': '国庆节'
}

// 法定节假日与调休配置：key 为 MM-DD，type 为 holiday/workday
// 可按年度持续追加，日历会自动读取。
const YEAR_HOLIDAY_CONFIG = {
  2026: {
    '01-01': { type: 'holiday', name: '元旦' },
    '02-16': { type: 'holiday', name: '春节' },
    '02-17': { type: 'holiday', name: '春节' },
    '02-18': { type: 'holiday', name: '春节' },
    '02-19': { type: 'holiday', name: '春节' },
    '02-20': { type: 'holiday', name: '春节' },
    '02-21': { type: 'holiday', name: '春节' },
    '02-22': { type: 'holiday', name: '春节' },
    '02-14': { type: 'workday', name: '春节调休' },
    '02-15': { type: 'workday', name: '春节调休' },
    '04-05': { type: 'holiday', name: '清明节' },
    '04-06': { type: 'holiday', name: '清明节' },
    '05-01': { type: 'holiday', name: '劳动节' },
    '05-02': { type: 'holiday', name: '劳动节' },
    '05-03': { type: 'holiday', name: '劳动节' },
    '05-04': { type: 'holiday', name: '劳动节' },
    '05-05': { type: 'holiday', name: '劳动节' },
    '04-26': { type: 'workday', name: '劳动节调休' },
    '05-09': { type: 'workday', name: '劳动节调休' },
    '06-19': { type: 'holiday', name: '端午节' },
    '06-20': { type: 'holiday', name: '端午节' },
    '06-21': { type: 'holiday', name: '端午节' },
    '09-25': { type: 'holiday', name: '中秋节' },
    '09-26': { type: 'holiday', name: '中秋节' },
    '09-27': { type: 'holiday', name: '中秋节' },
    '10-01': { type: 'holiday', name: '国庆节' },
    '10-02': { type: 'holiday', name: '国庆节' },
    '10-03': { type: 'holiday', name: '国庆节' },
    '10-04': { type: 'holiday', name: '国庆节' },
    '10-05': { type: 'holiday', name: '国庆节' },
    '10-06': { type: 'holiday', name: '国庆节' },
    '10-07': { type: 'holiday', name: '国庆节' },
    '09-28': { type: 'workday', name: '国庆节调休' },
    '10-10': { type: 'workday', name: '国庆节调休' }
  }
}
const HOLIDAY_CONFIG_MEMORY = {}

function pad(num) {
  return `${num}`.padStart(2, '0')
}

function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatMonthLabel(date) {
  const d = new Date(date)
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月`
}

function formatDateWithWeek(date) {
  const d = new Date(date)
  return `${formatDate(d)} ${WEEK_LABELS[d.getDay()]}`
}

function getHolidayStorageKey(year) {
  return `${HOLIDAY_CACHE_PREFIX}${year}`
}

function getCachedHolidayEntry(year) {
  const key = getHolidayStorageKey(year)
  const entry = wx.getStorageSync(key)
  if (!entry || typeof entry !== 'object') return null
  if (!entry.data || typeof entry.data !== 'object') return null
  return entry
}

function isHolidayCacheExpired(entry) {
  if (!entry || !entry.fetchedAt) return true
  return Date.now() - entry.fetchedAt > HOLIDAY_CACHE_TTL
}

function setCachedHolidayEntry(year, data) {
  const key = getHolidayStorageKey(year)
  const payload = {
    fetchedAt: Date.now(),
    data
  }
  wx.setStorageSync(key, payload)
}

function getMonthMatrix(date) {
  const current = new Date(date)
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - startWeekday)
  const days = []

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push({
      date: formatDate(day),
      day: day.getDate(),
      inCurrentMonth: day.getMonth() === month
    })
  }
  return days
}

function getPrevMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() - 1, 1)
}

function getNextMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

function getSolarTermForDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()

  const firstIndex = month * 2
  const secondIndex = firstIndex + 1
  const firstDay = getSolarTermDay(year, firstIndex)
  const secondDay = getSolarTermDay(year, secondIndex)

  if (day === firstDay) return SOLAR_TERM_NAMES[firstIndex]
  if (day === secondDay) return SOLAR_TERM_NAMES[secondIndex]
  return ''
}

function normalizeTimorHolidayData(payload) {
  const source = payload && payload.holiday ? payload.holiday : payload
  if (!source || typeof source !== 'object') return null
  const result = {}
  Object.keys(source).forEach((key) => {
    const item = source[key]
    if (!item || typeof item !== 'object') return
    let type = ''
    if (item.holiday === true) type = 'holiday'
    if (item.holiday === false) type = 'workday'
    if (!type) return
    const name = item.name || item.festival || (type === 'holiday' ? '节假日' : '调休')
    result[key] = { type, name }
  })
  return Object.keys(result).length ? result : null
}

function requestHolidayYear(year) {
  return new Promise((resolve, reject) => {
    const tryFetch = (index) => {
      if (index >= HOLIDAY_API_ENDPOINTS.length) {
        reject(new Error('holiday api unavailable'))
        return
      }
      const url = HOLIDAY_API_ENDPOINTS[index].replace('{year}', year)
      wx.request({
        url,
        method: 'GET',
        timeout: 5000,
        success: (res) => {
          const statusCode = res.statusCode || 500
          if (statusCode < 200 || statusCode >= 300) {
            tryFetch(index + 1)
            return
          }
          const data = res.data || {}
          const payload = data.holiday ? data : (data.data || data.result || data)
          const normalized = normalizeTimorHolidayData(payload)
          if (!normalized) {
            tryFetch(index + 1)
            return
          }
          resolve(normalized)
        },
        fail: () => {
          tryFetch(index + 1)
        }
      })
    }
    tryFetch(0)
  })
}

async function syncHolidayConfigByYear(year, options = {}) {
  const targetYear = Number(year)
  const { force = false } = options
  const cachedEntry = getCachedHolidayEntry(targetYear)
  if (!force && cachedEntry && !isHolidayCacheExpired(cachedEntry)) {
    HOLIDAY_CONFIG_MEMORY[targetYear] = cachedEntry.data
    return { from: 'cache', year: targetYear }
  }

  try {
    const remoteData = await requestHolidayYear(targetYear)
    setCachedHolidayEntry(targetYear, remoteData)
    HOLIDAY_CONFIG_MEMORY[targetYear] = remoteData
    return { from: 'remote', year: targetYear }
  } catch (error) {
    if (cachedEntry && cachedEntry.data) {
      HOLIDAY_CONFIG_MEMORY[targetYear] = cachedEntry.data
      return { from: 'stale-cache', year: targetYear }
    }
    HOLIDAY_CONFIG_MEMORY[targetYear] = YEAR_HOLIDAY_CONFIG[targetYear] || {}
    return { from: 'local', year: targetYear }
  }
}

async function syncHolidayConfigs(years, options = {}) {
  const yearList = Array.isArray(years) ? years : []
  const tasks = yearList.map((year) => syncHolidayConfigByYear(year, options))
  return Promise.all(tasks)
}

function getHolidayConfigByYear(year) {
  const targetYear = Number(year)
  if (HOLIDAY_CONFIG_MEMORY[targetYear]) return HOLIDAY_CONFIG_MEMORY[targetYear]

  const cachedEntry = getCachedHolidayEntry(targetYear)
  if (cachedEntry && cachedEntry.data) {
    HOLIDAY_CONFIG_MEMORY[targetYear] = cachedEntry.data
    return HOLIDAY_CONFIG_MEMORY[targetYear]
  }

  HOLIDAY_CONFIG_MEMORY[targetYear] = YEAR_HOLIDAY_CONFIG[targetYear] || {}
  return HOLIDAY_CONFIG_MEMORY[targetYear]
}

function getHolidayForDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const yearHolidayMap = getHolidayConfigByYear(year)
  const config = yearHolidayMap[mmdd]
  if (config) return config
  if (FIXED_HOLIDAYS[mmdd]) {
    return { type: 'holiday', name: FIXED_HOLIDAYS[mmdd] }
  }
  return null
}

function isWorkday(date) {
  const d = new Date(date)
  const holidayConfig = getHolidayForDate(d)
  if (holidayConfig && holidayConfig.type === 'holiday') return false
  if (holidayConfig && holidayConfig.type === 'workday') return true
  const weekDay = d.getDay()
  return weekDay !== 0 && weekDay !== 6
}

function getHolidayAndSolarTerm(date) {
  const holidayConfig = getHolidayForDate(date)
  const solarTerm = getSolarTermForDate(date)
  const holiday = holidayConfig ? holidayConfig.name : ''
  const dayType = holidayConfig ? holidayConfig.type : ''
  let dayTag = ''
  if (dayType === 'holiday') dayTag = '休'
  if (dayType === 'workday') dayTag = '班'
  return {
    holiday,
    solarTerm,
    dayType,
    dayTag,
    label: dayTag || holiday || solarTerm || '',
    isWorkday: isWorkday(date)
  }
}

function getSolarTermDay(year, termIndex) {
  const base = Date.UTC(1900, 0, 6, 2, 5)
  const offset = 31556925974.7 * (year - 1900) + SOLAR_TERM_INFO[termIndex] * 60000
  return new Date(base + offset).getUTCDate()
}

module.exports = {
  formatDate,
  formatMonthLabel,
  formatDateWithWeek,
  getMonthMatrix,
  getPrevMonth,
  getNextMonth,
  getHolidayAndSolarTerm,
  isWorkday,
  syncHolidayConfigByYear,
  syncHolidayConfigs
}
