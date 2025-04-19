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
