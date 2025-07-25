import { MONTHS } from "./const";

export function extractText(text) {
    const regex = /\[(.*?)\]/g;

    const result = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Push the text before the match
        if (match.index > lastIndex) {
            result.push({
                type: 'text',
                value: text.slice(lastIndex, match.index)
            });
        }

        // Push the matched pattern
        result.push({
            type: 'tag',
            value: match[1]
        });

        lastIndex = regex.lastIndex;
    }

    // Push any remaining text after the last match
    if (lastIndex < text.length) {
        result.push({
            type: 'text',
            value: text.slice(lastIndex)
        });
    }

    return result;
}

function selectColor(number) {
    const hue = number * 137.508; // use golden angle approximation
    return `hsl(${hue},70%,75%)`;
}

export function generateRandomDistinctColors(amount) {
    const res = [];
    for(let i = 1; i <= amount; i++) {
        res.push(selectColor(i));
    }

    return res;
}

export function generateRangeOptions(start, end) {
    const range = []
    for(let i = start; i <= end; i++) {
        range.push(i);
    }

    return range;
}

export function generateAsterisks(length) {
    let res = '';

    for(let i = 0; i < length; i++) {
        res += '*';
    }

    return res;
}

export function formatCurrency(value, locale = 'id-ID', currency = 'IDR') {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 });
    return formatter.format(value);
}

export function formatDateString(date, locale = 'en-US') {
    return new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

export function getMonthlyLabels(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result = [];
    for(let date = 1; date <= daysInMonth; date++) {
        result.push(formatDateString(new Date(year, month, date)));
    }

    return result;
}

/**
 * 
 * @param {WeekRange} weekRange 
 */
export function getWeeklyLabels(weekRange) {
    if(!weekRange) return [];

    const result = [];
    for(let date = new Date(weekRange.start); date <= weekRange.end; date.setDate(date.getDate() + 1)) {
        result.push(formatDateString(date));
    }

    return result;
}

export function nFormatter(num, digits) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const regexp = /\.0+$|(?<=\.[0-9]*[1-9])0+$/;
  const item = lookup.findLast(item => num >= item.value);
  return item ? (num / item.value).toFixed(digits).replace(regexp, "").concat(item.symbol) : "0";
}

/**
 * 
 * @param {Date} date 
 * @param {string} locale 
 * @param {object} options 
 * @returns 
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
  const map = {
    DD: String(date.getDate()).padStart(2, '0'),
    D: date.getDate(),
    MMM: MONTHS[date.getMonth()].slice(0, 3),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: date.getMonth() + 1,
    YYYY: date.getFullYear(),
    YY: String(date.getFullYear()).slice(-2),
  };

  return format.replace(/YYYY|YY|MMM|MM|M|DD|D/g, match => map[match]);
}

/**
 * 
 * @param {Date} date1 - Start date
 * @param {Date} date2 - End date
 * @returns 
 */
export function getDayDifference(date1, date2) {
    const msPerDay = 1000 * 60 * 60 * 24;
    
    // Normalize both dates to midnight UTC to avoid daylight saving shifts
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

    return Math.floor((utc2 - utc1) / msPerDay) + 1;
}

function isDebtLoanExpense(name) {
    return name && (name === 'Repayment' || name === 'Loan')
}

function isDebtLoanIncome(name) {
    return name && (name === 'Debt' || name === 'Debt Collection')
}

/**
 * 
 * @param {string} name 
 * @returns Debt Loan type (Income or Expense)
 */
export function getDebtLoanType(name) {
    if(isDebtLoanExpense(name)) return 'Expense';
    if(isDebtLoanIncome(name)) return 'Income';
    return null;
}

/**
 * 
 * @param {string} categoryName 
 * @returns 
 */
export function getOwnerLabel(categoryName) {
    if (categoryName === "Debt Collection" || categoryName == "Loan") {
        return "Borrower";
    }
    if (categoryName === "Debt" || categoryName === "Repayment") {
        return "Lender";
    }

    return "";
}

/**
 * 
 * @param {number} amount 
 * @param {number[]} range 
 * @returns 
 */
export function isInAmountRange(amount, range) {
    const [min, max] = range;

    if(min && amount < min) return false;
    if(max && amount > max) return false;

    return true
}

/**
 * 
 * @param {Date} date 
 * @param {Date[]} range 
 * @returns 
 */
export function isInDateRange(date, range) {
    const [min, max] = range;

    const currTime = date.getTime();
    if(min && currTime < new Date(min).getTime()) return false;
    if(max && currTime > new Date(max).getTime()) return false;

    return true
}

function zeroBased(value) {
    return value.toString().padStart(2, '0');
}

/**
 * 
 * @param {Date} date 
 * @returns Value in datetime-local input format
 */
export function dateToLocalInput(date = new Date()) {
    const year = date.getFullYear();
    const month = zeroBased(date.getMonth() + 1);
    const day = zeroBased(date.getDate());
    const hour = zeroBased(date.getHours());
    const minute = zeroBased(date.getMinutes());

    const dateString = `${year}-${month}-${day}T${hour}:${minute}`;
    return dateString;
}

/**
 * 
 * @param {Date} date 
 * @returns Value in date input format
 */
export function dateToInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = zeroBased(date.getMonth() + 1); // Month is 0-based
  const day = zeroBased(date.getDate());

  const dateString = `${year}-${month}-${day}`
  return dateString;
}

/**
 * @typedef {Object} WeekRange
 * @property {Date} start - Starting date of the week
 * @property {Date} end - End date of the week
 * 
 * @param {number} year Year to get the week range
 * @returns {WeekRange[]}
 */
export function getWeekRanges(year) {
  const weekRanges = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 12, 0);

  // Adjust to the first Monday of the year
  let current = new Date(startDate);
  const day = current.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift Sunday to previous Monday, others to next Monday
  current.setDate(current.getDate() + diff);

  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Only include weeks that at starts from the following year
    if (weekStart.getFullYear() === year || weekEnd.getFullYear() === year) {
      weekRanges.push({
        start: weekStart,
        end: weekEnd
      });
    }

    current.setDate(current.getDate() + 7); // Move to next week
  }

  return weekRanges;
}

/**
 * 
 * @param {Date} date
 * @param {number} year
 * @returns {number} Week in the year of given date
 */
export function getWeekNumber(dateInput, year) {
  const date = new Date(dateInput);
  if (!year) {
    year = date.getFullYear();
  }

  // Find the first Monday of the year
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const offset = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + offset);

  // Difference in days from the first Monday
  const diffTime = date - firstMonday;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 0; // before first week of the year
  }

  const weekNumber = Math.floor(diffDays / 7) + 1;

  return weekNumber;
}

/**
 * 
 * @param {string} type Type of date range
 * @param {*} date Given date to get the range
 * @returns
 */
export function getDateRange(type, date = new Date()) {
  const d = new Date(date); // Copy to avoid mutating input
  d.setHours(0, 0, 0, 0);

  let start, end;

  switch (type) {
    case 'daily':
      start = new Date(d);
      end = new Date(d);
      break;

    case 'weekly': {
      const day = d.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (day + 6) % 7; // make Monday=0
      start = new Date(d);
      start.setDate(d.getDate() - diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }

    case 'monthly':
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      break;

    case 'quarter': {
      const quarter = Math.floor(d.getMonth() / 3);
      const startMonth = quarter * 3;
      start = new Date(d.getFullYear(), startMonth, 1);
      end = new Date(d.getFullYear(), startMonth + 3, 0);
      break;
    }

    case 'annual':
      start = new Date(d.getFullYear(), 0, 1);
      end = new Date(d.getFullYear(), 11, 31);
      break;

    default:
      start = undefined;
      end = undefined;
  }

  // Set end time to 23:59:59.999
  if(end) end.setHours(23, 59, 59, 999);

  return [start, end];
}

const imageSignatures = {
  R0lGODdh: 'image/gif',
  iVBORw0KGgo: 'image/png',
  '/9j/': 'image/jpeg',
  Qk02U: 'image/bmp',
  UklGR: 'image/webp'
};

export function detectMimeType(base64 = '') {
  let mimeType;

  Object.entries(imageSignatures).some(([signature, type]) => {
    const signatureWasFound = base64.startsWith(signature);
    if (signatureWasFound) mimeType = type;
    return signatureWasFound;
  });

  return mimeType;
}