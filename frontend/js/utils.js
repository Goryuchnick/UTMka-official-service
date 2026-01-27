// Constants
export const PRESET_COLORS = [
    '#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#e0e7ff',
    '#f0f9ff', '#f0fdf4', '#fefce8', '#fef2f2', '#f5f3ff'
];

export const ONBOARDING_KEY = 'utmka_onboarding_done_v1';

// Helper function to parse dates safely
export function parseDate(dateString) {
    if (!dateString) return new Date(0);

    let date;
    if (dateString.includes('T')) {
        date = new Date(dateString);
    } else if (dateString.includes(' ')) {
        date = new Date(dateString.replace(' ', 'T'));
    } else {
        date = new Date(dateString + 'T00:00:00');
    }

    if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return new Date(0);
    }

    return date;
}

export function escapeCSVValue(value) {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

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
                i++;
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

    const colorMap = {
        '#dbeafe': '#1e40af',
        '#dcfce7': '#166534',
        '#fef3c7': '#92400e',
        '#fce7f3': '#be185d',
        '#e0e7ff': '#3730a3',
        '#f0f9ff': '#0c4a6e',
        '#f0fdf4': '#14532d',
        '#fefce8': '#a16207',
        '#fef2f2': '#991b1b',
        '#f5f3ff': '#581c87'
    };

    if (colorMap[hexColor]) {
        return colorMap[hexColor];
    }

    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7 ? '#374151' : '#ffffff';
}
