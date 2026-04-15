const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
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

const YEAR_HOLIDAYS = {
  2026: {
    '02-17': '春节',
    '04-05': '清明',
    '06-19': '端午',
    '09-25': '中秋'
  }
}

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

function getHolidayForDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (FIXED_HOLIDAYS[mmdd]) return FIXED_HOLIDAYS[mmdd]
  const yearHolidayMap = YEAR_HOLIDAYS[year] || {}
  return yearHolidayMap[mmdd] || ''
}

function getHolidayAndSolarTerm(date) {
  const holiday = getHolidayForDate(date)
  const solarTerm = getSolarTermForDate(date)
  return {
    holiday,
    solarTerm,
    label: holiday || solarTerm || ''
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
  getHolidayAndSolarTerm
}
