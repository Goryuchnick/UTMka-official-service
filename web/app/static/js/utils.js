// Constants
export const PRESET_COLORS = [
    '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff',
    '#f0f9ff', '#f0fdf4', '#fefce8', '#fef2f2', '#f5f3ff'
];

export const ONBOARDING_KEY = 'utmka_onboarding_done_v1';

// Helper function to parse dates safely
export function parseDate(dateString) {
    if (!dateString) return new Date(0);

    // Try different date formats
    let date;
    if (dateString.includes('T')) {
        // Already in ISO format
        date = new Date(dateString);
    } else if (dateString.includes(' ')) {
        // SQLite format: "YYYY-MM-DD HH:MM:SS"
        date = new Date(dateString.replace(' ', 'T'));
    } else {
        // Just date: "YYYY-MM-DD"
        date = new Date(dateString + 'T00:00:00');
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return new Date(0);
    }

    return date;
}

export function escapeCSVValue(value) {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // If value contains comma, newline, or quote, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
}

export function convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.map(header => escapeCSVValue(header)).join(',');

    const csvRows = data.map(row => {
        return headers.map(header => escapeCSVValue(row[header] || '')).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
}

export function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index] ? values[index].trim() : '';
            });
            data.push(obj);
        }
    }

    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

export function getTextColorForBg(hexColor) {
    if (!hexColor || hexColor.length < 7) return '#374151';

    // Специальные цвета для всех пастельных тонов
    const colorMap = {
        '#dbeafe': '#1e40af', // темно-синий для светло-синего
        '#dcfce7': '#166534', // темно-зеленый для светло-зеленого  
        '#fef3c7': '#92400e', // темно-оранжевый для светло-желтого
        '#fce7f3': '#be185d', // темно-розовый для светло-розового
        '#e0e7ff': '#3730a3', // темно-фиолетовый для светло-фиолетового
        '#f0f9ff': '#0c4a6e', // темно-голубой для светло-голубого
        '#f0fdf4': '#14532d', // темно-зеленый для светло-зеленого
        '#fefce8': '#a16207', // темно-желтый для светло-желтого
        '#fef2f2': '#991b1b', // темно-красный для светло-красного
        '#f5f3ff': '#581c87'  // темно-фиолетовый для светло-фиолетового
    };

    if (colorMap[hexColor]) {
        return colorMap[hexColor];
    }

    // Fallback для других цветов
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7 ? '#374151' : '#ffffff';
}
