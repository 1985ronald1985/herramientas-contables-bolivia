import React, { useState } from 'react';
import { UFVEntry } from '../types';
import * as XLSX from 'xlsx';

interface UfvDataProps {
    ufvData: UFVEntry[];
    setUfvData: React.Dispatch<React.SetStateAction<UFVEntry[]>>;
}

const UfvData: React.FC<UfvDataProps> = ({ ufvData, setUfvData }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const itemsPerPage = 10;
    
    const currentYear = new Date().getFullYear();
    const [startYear, setStartYear] = useState(currentYear - 1);
    const [endYear, setEndYear] = useState(currentYear);
    const [generatedLinks, setGeneratedLinks] = useState<{year: number, url: string}[]>([]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    
    const yearOptions = Array.from({ length: currentYear - 2001 }, (_, i) => 2002 + i).reverse();

    const handleGenerateLinks = () => {
        if (startYear > endYear) {
            setMessage({ type: 'error', text: 'El año de inicio no puede ser mayor que el año de fin.' });
            setGeneratedLinks([]);
            return;
        }
        setMessage(null);
        const links = [];
        for (let y = startYear; y <= endYear; y++) {
            links.push({
                year: y,
                url: `https://www.bcb.gob.bo/librerias/indicadores/ufv/anualxls.php?gestion=${y}`
            });
        }
        setGeneratedLinks(links);
    };

    const parseXlsFile = (arrayBuffer: ArrayBuffer): UFVEntry[] => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(worksheet, { raw: false, header: 1, defval: null });

        const yearEntries: UFVEntry[] = [];
        let year: number | null = null;
        let headerRowIndex = -1;
        const monthColumns: Map<number, number> = new Map(); // colIndex -> month (1-12)
        const currentYear = new Date().getFullYear();

        // 1. Find the year using a robust method that checks the file's header area.
        const searchArea = rows.slice(0, 15);
        const headerText = searchArea.map(row => 
            (row || []).map(cell => cell ? cell.toString().trim() : '').join(' ')
        ).join('\n');

        // Pass 1: Look for "GESTION YYYY" pattern, which is the most reliable indicator.
        const match = headerText.toUpperCase().match(/GESTI[OÓ]N\s*(\d{4})/);
        if (match && match[1]) {
            const potentialYear = parseInt(match[1], 10);
            // Plausibility check for the year
            if (potentialYear > 2000 && potentialYear <= currentYear + 5) {
                year = potentialYear;
            }
        }
        
        // Pass 2: Fallback if pattern is not found. Look for the first plausible 4-digit year number.
        if (!year) {
            const yearMatch = headerText.match(/\b(20[0-2][0-9])\b/); // Matches years from 2000-2029
            if (yearMatch && yearMatch[1]) {
                 const potentialYear = parseInt(yearMatch[1], 10);
                 if (potentialYear > 2000 && potentialYear <= currentYear + 5) {
                    year = potentialYear;
                }
            }
        }

        if (!year) {
            console.error("UFV Parser: Could not find year ('GESTION YYYY' or plausible year number) in the file.");
            return []; // Abort if no year is found.
        }

        // 2. Find the header row (the one starting with "DIAS") and map month columns.
        const monthMap: { [key: string]: number } = {
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
            'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const firstCell = row && row[0] ? row[0].toString().trim().toUpperCase() : null;
            if (firstCell === 'DIAS' || firstCell === 'DÍAS') {
                headerRowIndex = i;
                row.forEach((cell, colIndex) => {
                    if (typeof cell === 'string') {
                        const monthName = cell.trim().toUpperCase();
                        if (monthMap[monthName]) {
                            monthColumns.set(colIndex, monthMap[monthName]);
                        }
                    }
                });
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.error("UFV Parser: Could not find header row (starting with 'DIAS') in the file.");
            return []; // Abort if no header row is found.
        }

        // 3. Process data rows, starting from the row after the header.
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row[0] === null) continue;

            const day = parseInt(row[0].toString(), 10);
            if (isNaN(day) || day < 1 || day > 31) continue;

            monthColumns.forEach((month, colIndex) => {
                const valueCell = row[colIndex];
                if (valueCell !== null && valueCell !== undefined) {
                    const cleanedValueStr = valueCell.toString().replace(/[^\d,]/g, '').replace(',', '.');
                    const value = parseFloat(cleanedValueStr);

                    if (!isNaN(value)) {
                        // Validate date to avoid issues like Feb 30th
                        const date = new Date(Date.UTC(year!, month - 1, day));
                        if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
                             const monthStr = month.toString().padStart(2, '0');
                             const dayStr = day.toString().padStart(2, '0');
                             yearEntries.push({ date: `${year}-${monthStr}-${dayStr}`, value });
                        }
                    }
                }
            });
        }
        
        return yearEntries;
    };

    const handleFileProcessing = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        setMessage(null);
        setCurrentPage(1);

        try {
            const promises = Array.from(files).map(file => {
                return new Promise<UFVEntry[]>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const arrayBuffer = e.target?.result as ArrayBuffer;
                            const entries = parseXlsFile(arrayBuffer);
                            resolve(entries);
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsArrayBuffer(file);
                });
            });

            const results = await Promise.all(promises);
            const newEntries = results.flat();

            if (newEntries.length === 0) {
              throw new Error("No se encontraron datos de UFV válidos en los archivos seleccionados. Verifique que sean los archivos XLS correctos del BCB.");
            }

            const uniqueEntriesMap = new Map<string, UFVEntry>();
            ufvData.forEach(entry => uniqueEntriesMap.set(entry.date, entry));
            newEntries.forEach(entry => uniqueEntriesMap.set(entry.date, entry));
            
            const finalEntries = Array.from(uniqueEntriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
            
            setUfvData(finalEntries);
            setMessage({ type: 'success', text: `Se cargaron y combinaron ${newEntries.length} nuevos registros de UFV. Total actual: ${finalEntries.length} registros.` });

        } catch (error) {
            console.error("Error processing XLS files:", error);
            const errorMessage = (error instanceof Error ? error.message : 'Ocurrió un error desconocido al leer los archivos.');
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (isProcessing) return;
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileProcessing(files);
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = ufvData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(ufvData.length / itemsPerPage);

    const formatDisplayDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-blue-400 mb-2">Importar Datos de UFV desde BCB</h2>
                <p className="text-gray-400 mb-4">
                    Obtenga los datos oficiales de UFV de manera rápida y segura siguiendo estos pasos.
                </p>

                <div className="bg-gray-900 p-4 rounded-lg space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Paso 1: Generar enlaces y descargar archivos</h3>
                        <p className="text-gray-400 text-sm mb-3">Seleccione el rango de años que necesita, genere los enlaces y luego haga clic en cada uno para descargar los archivos del BCB.</p>
                        <div className="flex items-end gap-4 flex-wrap">
                            <div>
                                <label htmlFor="start-year" className="text-sm font-medium text-gray-400">Desde el año:</label>
                                <select id="start-year" value={startYear} onChange={e => setStartYear(parseInt(e.target.value))} className="bg-gray-700 text-white p-2 rounded w-full sm:w-auto mt-1">
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="end-year" className="text-sm font-medium text-gray-400">Hasta el año:</label>
                                <select id="end-year" value={endYear} onChange={e => setEndYear(parseInt(e.target.value))} className="bg-gray-700 text-white p-2 rounded w-full sm:w-auto mt-1">
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                           <button 
                                onClick={handleGenerateLinks}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                           >
                               Generar Enlaces de Descarga
                           </button>
                        </div>
                         {generatedLinks.length > 0 && (
                            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                                <h4 className="text-md font-semibold text-gray-300 mb-3">Haga clic para descargar:</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {generatedLinks.map(link => (
                                        <a 
                                            key={link.year}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded transition-colors text-center text-sm"
                                        >
                                            Descargar {link.year}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">Paso 2: Cargar el/los archivo(s) XLS</h3>
                        <p className="text-gray-400 text-sm mb-3">Arrastre y suelte aquí todos los archivos que descargó. Puede cargarlos todos a la vez.</p>
                        
                        <input 
                            type="file"
                            accept=".xls,.xlsx"
                            multiple
                            onChange={(e) => handleFileProcessing(e.target.files)}
                            className="hidden"
                            id="file-upload"
                            disabled={isProcessing}
                        />
                        <label 
                            htmlFor="file-upload"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className={`block w-full p-6 border-2 border-dashed border-gray-600 rounded-lg text-center transition-colors ${!isProcessing && 'hover:border-blue-400 hover:bg-gray-800'} ${isProcessing ? 'cursor-not-allowed bg-gray-800' : 'cursor-pointer'}`}
                        >
                            <span className={`font-semibold ${isProcessing ? 'text-gray-500' : 'text-blue-400'}`}>
                               {isProcessing ? 'Procesando archivos...' : 'Haga clic para seleccionar o arrastre los archivos aquí'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">Archivos aceptados: .xls, .xlsx</p>
                        </label>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
            
            <div>
                 <h2 className="text-2xl font-bold text-blue-400 mb-4">Datos de UFV Cargados Actualmente</h2>
                <div className="overflow-x-auto bg-gray-900 rounded-lg">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-blue-300 uppercase bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Fecha</th>
                                <th scope="col" className="px-6 py-3">Valor UFV</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((entry, index) => (
                                <tr key={index} className="border-b border-gray-700 hover:bg-gray-800">
                                    <td className="px-6 py-4 font-medium whitespace-nowrap">{formatDisplayDate(entry.date)}</td>
                                    <td className="px-6 py-4">{entry.value}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={2} className="text-center py-8 text-gray-500">No hay datos de UFV cargados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                            Anterior
                        </button>
                        <span className="text-gray-400">Página {currentPage} de {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UfvData;