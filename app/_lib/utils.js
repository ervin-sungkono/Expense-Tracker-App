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
    const daysInMonth = new Date(year, month, 0).getDate();

    const result = [];
    for(let date = 1; date <= daysInMonth; date++) {
        result.push(formatDateString(new Date(year, month, date)));
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