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