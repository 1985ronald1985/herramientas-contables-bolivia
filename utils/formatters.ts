export const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
    // Intl for 'de-DE' uses '.' for thousands and ',' for decimal, which matches Bolivian format.
    return formatted;
};

export const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};
