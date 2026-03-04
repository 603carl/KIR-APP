/**
 * Formats incident data into a CSV string.
 */
export const generateCSV = (data: any[]) => {
    if (!data || data.length === 0) return "";

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
        Object.values(row)
            .map((val) => {
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            })
            .join(",")
    );

    return [headers, ...rows].join("\n");
};

/**
 * Triggers a browser download of a CSV file.
 */
export const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
