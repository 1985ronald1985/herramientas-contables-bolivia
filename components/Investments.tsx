import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UFVEntry, InvestmentItem, CalculatedInvestmentItem, InvestmentHistoryEntry, AssetType } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileTextIcon, FileSpreadsheetIcon, DownloadIcon, SaveIcon, SortAscIcon, SortDescIcon, ChevronDownIcon } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatters';
import InvestmentTable from './InvestmentTable';

interface InvestmentsProps {
    ufvData: UFVEntry[];
}

const findUfv = (date: string, data: UFVEntry[]): number | null => {
    const entry = data.find(d => d.date === date);
    return entry ? entry.value : null;
};

interface ItemForCalculation extends InvestmentItem {
    baseValue: number;
}

interface ItemForCalcWithDates extends ItemForCalculation {
    calcStartDate: string;
    calcEndDate: string;
}

const Investments: React.FC<InvestmentsProps> = ({ ufvData }) => {
    const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    // Defaulting to 2022 dates where we likely have data, to prevent "0 increment" confusion
    const [startDate, setStartDate] = useState('2022-01-01');
    const [endDate, setEndDate] = useState('2022-12-31');
    const companyOptions = ['Inmobiliaria Kantutani S.A.', 'Inmobiliaria Las Misiones S.A.'];
    const [companyName, setCompanyName] = useState(companyOptions[0]);
    const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
    const [isJournalEntryMenuOpen, setIsJournalEntryMenuOpen] = useState(false);
    const [calculationBase, setCalculationBase] = useState<'original' | 'latest'>('original');
    const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');
    const [isSelectionExpanded, setIsSelectionExpanded] = useState(true);
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
    const excelButtonRef = useRef<HTMLDivElement>(null);
    const journalEntryButtonRef = useRef<HTMLDivElement>(null);

    const [itemsForCalc, setItemsForCalc] = useState<ItemForCalcWithDates[]>([]);
    const prevStartDateRef = useRef(startDate);
    const prevEndDateRef = useRef(endDate);


    useEffect(() => {
        if (saveMessage) {
            const timer = setTimeout(() => setSaveMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveMessage]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (excelButtonRef.current && !excelButtonRef.current.contains(event.target as Node)) {
                setIsExcelMenuOpen(false);
            }
            if (journalEntryButtonRef.current && !journalEntryButtonRef.current.contains(event.target as Node)) {
                setIsJournalEntryMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const sourceItemsForCalculation = useMemo((): ItemForCalculation[] => {
        return investmentItems
            .filter(item => {
                // Filter out retired items (sold before the current period starts)
                if (item.retirementDate && item.retirementDate < startDate) {
                    return false;
                }
                return true;
            })
            .map(item => {
                const latestHistory = (item.history && item.history.length > 0)
                    ? [...item.history].sort((a, b) => b.periodEndDate.localeCompare(a.periodEndDate))[0]
                    : null;

                const baseValue = (calculationBase === 'latest' && latestHistory)
                    ? latestHistory.endValue
                    : item.originalValue;

                return { ...item, baseValue };
            });
    }, [investmentItems, calculationBase, startDate]);

    useEffect(() => {
        const prevStart = prevStartDateRef.current;
        const prevEnd = prevEndDateRef.current;

        setItemsForCalc(currentItems => {
            const currentItemsMap = new Map<string, ItemForCalcWithDates>(currentItems.map(item => [item.id, item]));

            return sourceItemsForCalculation.map(sourceItem => {
                const currentItem = currentItemsMap.get(sourceItem.id);

                if (currentItem) {
                    // Item exists, update it smartly
                    const startDateWasSynced = currentItem.calcStartDate === prevStart;
                    const endDateWasSynced = currentItem.calcEndDate === prevEnd;

                    return {
                        ...sourceItem, // Update with latest base value etc.
                        calcStartDate: startDateWasSynced ? startDate : currentItem.calcStartDate,
                        calcEndDate: endDateWasSynced ? endDate : currentItem.calcEndDate,
                    };
                } else {
                    // New item, initialize with global dates
                    return {
                        ...sourceItem,
                        calcStartDate: startDate,
                        calcEndDate: endDate,
                    };
                }
            });
        });

        // Update refs AFTER the render has been scheduled
        prevStartDateRef.current = startDate;
        prevEndDateRef.current = endDate;
    }, [sourceItemsForCalculation, startDate, endDate]);

    useEffect(() => {
        // Automatically select all items when the list for calculation changes
        setSelectedItemIds(new Set(itemsForCalc.map(item => item.id)));
    }, [itemsForCalc]);

    const handleItemDateChange = (id: string, field: 'calcStartDate' | 'calcEndDate', value: string) => {
        setItemsForCalc(prev =>
            prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedItemIds(new Set(itemsForCalc.map(item => item.id)));
        } else {
            setSelectedItemIds(new Set());
        }
    };

    const handleItemSelection = (itemId: string, isChecked: boolean) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    const { selectedCount, totalSelectedValue } = useMemo(() => {
        const selectedItems = itemsForCalc.filter(item => selectedItemIds.has(item.id));
        const total = selectedItems.reduce((sum, item) => sum + item.baseValue, 0);
        return {
            selectedCount: selectedItems.length,
            totalSelectedValue: total
        };
    }, [itemsForCalc, selectedItemIds]);

    const handleItemChange = (id: string, field: keyof InvestmentItem, value: any) => {
        setInvestmentItems(prevItems =>
            prevItems.map(item => {
                if (item.id !== id) return item;
                // If the field is originalValue, value is already a number from SmartNumberInput
                // If it's something else, use it as is.
                return { ...item, [field]: value };
            })
        );
    };

    const handleRemoveItem = (id: string) => {
        setInvestmentItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const handleAddItem = () => {
        const newItem: InvestmentItem = {
            id: `${Date.now()}-${Math.random()}`,
            account: '12XXXXX',
            accountName: 'CUENTA ACTIVO',
            property: 'Nueva Propiedad',
            type: AssetType.OTRO,
            originalValue: 0,
            history: [],
            acquisitionDate: startDate // Default to the current calculation start date
        };
        setInvestmentItems(prev => [...prev, newItem]);
    };

    const handleDownloadTemplate = () => {
        const headers = [['CUENTA', 'NOMBRE_CUENTA', 'INMUEBLE', 'TIPO_ACTIVO', 'VALOR']];
        const exampleData = [
            ['1230101', 'TERRENOS', 'TERRENO ED. SAN JORGE', 'Terreno', 500000.00],
            ['1230101', 'TERRENOS', 'TERRENO Z/ NORTE', 'Terreno', 750000.50],
            ['1240101', 'INVERSIONES PERMANENTES', 'ACCIONES BNB', 'Inversión Permanente', 12000.00],
        ];
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...exampleData]);
        ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];

        const numberFormat = '#,##0.00';
        for (let i = 1; i <= exampleData.length; i++) {
            const cellRef = XLSX.utils.encode_cell({ c: 4, r: i });
            if (ws[cellRef]) {
                ws[cellRef].z = numberFormat;
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inversiones');
        XLSX.writeFile(wb, 'Plantilla_Inversiones_V2.xlsx');
    };

    const handleFileProcessing = async (files: FileList | null) => {
        if (!files || files.length === 0 || isProcessing) return;

        setIsProcessing(true);
        setMessage(null);

        try {
            const promises = Array.from(files).map(file => {
                return new Promise<InvestmentItem[]>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const arrayBuffer = e.target?.result as ArrayBuffer;
                            const workbook = XLSX.read(arrayBuffer);
                            const sheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[sheetName];
                            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                            if (json.length === 0) { resolve([]); return; }

                            const requiredHeaders = ['CUENTA', 'INMUEBLE', 'VALOR'];
                            const actualHeaders = Object.keys(json[0] || {});

                            if (!requiredHeaders.every(h => actualHeaders.includes(h))) {
                                console.warn(`El archivo ${file.name} no tiene las columnas requeridas. Omitiendo archivo.`);
                                resolve([]);
                                return;
                            }

                            const newInvestments: InvestmentItem[] = [];
                            for (const row of json) {
                                const account = row['CUENTA']?.toString().trim();
                                const property = row['INMUEBLE']?.toString().trim();
                                const value = row['VALOR'];
                                const typeRaw = row['TIPO_ACTIVO']?.toString().trim();

                                let type = AssetType.OTRO;
                                if (typeRaw) {
                                    if (typeRaw.toLowerCase().includes('terreno')) type = AssetType.TERRENO;
                                    else if (typeRaw.toLowerCase().includes('obra')) type = AssetType.OBRA_EN_EJECUCION;
                                    else if (typeRaw.toLowerCase().includes('inversi')) type = AssetType.INVERSION_PERMANENTE;
                                }

                                if (!account || !property || value === null || typeof value !== 'number' || isNaN(value)) {
                                    continue;
                                }

                                newInvestments.push({
                                    id: `${Date.now()}-${Math.random()}`,
                                    account,
                                    accountName: row['NOMBRE_CUENTA']?.toString().trim() || '',
                                    property,
                                    type,
                                    originalValue: value,
                                    history: [],
                                });
                            }
                            resolve(newInvestments);
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsArrayBuffer(file);
                });
            });

            const results = await Promise.all(promises);
            const allNewInvestments = results.flat();

            if (allNewInvestments.length === 0) {
                throw new Error('No se encontraron datos de inversiones válidos en los archivos seleccionados. Verifique el contenido y el formato.');
            }

            setInvestmentItems(allNewInvestments);
            setMessage({ type: 'success', text: `Se cargaron un total de ${allNewInvestments.length} registros desde ${files.length} archivo(s).` });

        } catch (error) {
            console.error("Error processing investment files:", error);
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

    const hasHistory = useMemo(() => investmentItems.some(i => i.history && i.history.length > 0), [investmentItems]);

    const calculatedInvestments = useMemo((): CalculatedInvestmentItem[] => {
        return itemsForCalc.map(item => {
            const isIncluded = selectedItemIds.has(item.id);

            if (!isIncluded) {
                return {
                    ...item,
                    isIncluded,
                    startDate: item.calcStartDate,
                    startUfv: 0,
                    endDate: item.calcEndDate,
                    endUfv: 0,
                    factor: 0,
                    increment: 0,
                    updatedValue: 0,
                };
            }

            // Determine effective dates
            const effectiveStartDate = item.acquisitionDate && item.acquisitionDate > item.calcStartDate
                ? item.acquisitionDate
                : item.calcStartDate;

            const effectiveEndDate = item.retirementDate && item.retirementDate < item.calcEndDate
                ? item.retirementDate
                : item.calcEndDate;

            const startUfv = findUfv(effectiveStartDate, ufvData);
            const endUfv = findUfv(effectiveEndDate, ufvData);

            console.log('Calc Debug:', {
                id: item.id,
                dates: [effectiveStartDate, effectiveEndDate],
                ufvs: [startUfv, endUfv],
                baseValue: item.baseValue,
                itemsForCalcRaw: item
            });

            if (!startUfv || !endUfv || item.baseValue === 0) {
                return {
                    ...item,
                    isIncluded,
                    startDate: effectiveStartDate,
                    startUfv: startUfv || 0,
                    endDate: effectiveEndDate,
                    endUfv: endUfv || 0,
                    factor: 0,
                    increment: 0,
                    updatedValue: item.baseValue,
                };
            }

            const factor = endUfv / startUfv;
            const updatedValue = item.baseValue * factor;
            const increment = updatedValue - item.baseValue;

            return {
                ...item,
                isIncluded,
                startDate: effectiveStartDate,
                startUfv,
                endDate: effectiveEndDate,
                endUfv,
                factor,
                increment,
                updatedValue
            };
        });
    }, [itemsForCalc, selectedItemIds, ufvData]);

    const summaryTotals = useMemo(() => {
        const includedItems = calculatedInvestments.filter(item => item.isIncluded);
        const totalBaseValue = includedItems.reduce((sum, item) => sum + item.baseValue, 0);
        const totalIncrement = includedItems.reduce((sum, item) => sum + item.increment, 0);
        const totalUpdatedValue = includedItems.reduce((sum, item) => sum + item.updatedValue, 0);

        return {
            processedItemsCount: includedItems.length,
            totalBaseValue,
            totalIncrement,
            totalUpdatedValue
        };
    }, [calculatedInvestments]);

    const groupedInvestments = useMemo(() => {
        return calculatedInvestments.reduce((acc, item) => {
            if (!acc[item.account]) {
                acc[item.account] = {
                    items: [],
                    totalValue: 0,
                    totalIncrement: 0,
                    totalUpdatedValue: 0
                };
            }
            acc[item.account].items.push(item);
            if (item.isIncluded) {
                acc[item.account].totalValue += item.baseValue;
                acc[item.account].totalIncrement += item.increment;
                acc[item.account].totalUpdatedValue += item.updatedValue;
            }
            return acc;
        }, {} as Record<string, { items: CalculatedInvestmentItem[], totalValue: number, totalIncrement: number, totalUpdatedValue: number }>);
    }, [calculatedInvestments]);

    const flatHistory = useMemo(() => {
        const allHistory = investmentItems.flatMap(item =>
            item.history.map(h => ({
                ...h,
                account: item.account,
                accountName: item.accountName,
                property: item.property,
            }))
        );

        return allHistory.sort((a, b) => {
            if (historySortOrder === 'desc') {
                return b.calculationDate.localeCompare(a.calculationDate);
            }
            return a.calculationDate.localeCompare(b.calculationDate);
        });
    }, [investmentItems, historySortOrder]);

    const handleSaveUpdate = () => {
        const newHistoryDate = new Date().toISOString();
        const updatedItems = investmentItems.map(item => {
            const calculatedItem = calculatedInvestments.find(c => c.id === item.id);
            if (!calculatedItem || !calculatedItem.isIncluded || calculatedItem.increment === 0) {
                return item;
            }

            const newEntry: InvestmentHistoryEntry = {
                id: `hist-${Date.now()}-${Math.random()}`,
                calculationDate: newHistoryDate,
                periodStartDate: calculatedItem.startDate,
                periodEndDate: calculatedItem.endDate,
                startUfv: calculatedItem.startUfv,
                endUfv: calculatedItem.endUfv,
                startValue: calculatedItem.baseValue,
                increment: calculatedItem.increment,
                endValue: calculatedItem.updatedValue,
            };

            const newHistory = [...item.history, newEntry].sort((a, b) => a.periodEndDate.localeCompare(b.periodEndDate));

            return { ...item, history: newHistory };
        });

        setInvestmentItems(updatedItems);
        setSaveMessage('Actualización guardada en el historial exitosamente.');

        if (calculationBase === 'latest') {
            setStartDate(endDate);
        }
    };

    const startUfvValue = findUfv(startDate, ufvData);
    const endUfvValue = findUfv(endDate, ufvData);
    const isUfvMissing = !startUfvValue || !endUfvValue;
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const handleGeneratePdf = () => {
        if (!companyName.trim()) { alert("Por favor, ingrese el nombre de la empresa."); return; }
        if (!startUfvValue || !endUfvValue) { alert("Fechas o valores UFV no válidos para generar el reporte."); return; }
        if (summaryTotals.processedItemsCount === 0) { alert("No hay items seleccionados para generar el reporte."); return; }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 40;

        // --- Prepare all data upfront ---
        const summaryData: { account: string, accountName: string, totalIncrement: number, totalUpdatedValue: number }[] = [];
        const mainTableBody: any[][] = [];
        let itemCounter = 0;

        Object.entries(groupedInvestments).forEach(([groupKey, data]) => {
            const includedItems = data.items.filter(i => i.isIncluded);
            if (includedItems.length === 0) return;

            summaryData.push({
                account: includedItems[0].account,
                accountName: includedItems[0].accountName,
                totalIncrement: data.totalIncrement,
                totalUpdatedValue: data.totalUpdatedValue,
            });

            mainTableBody.push([{
                content: groupKey,
                colSpan: 9,
                styles: { fontStyle: 'bold', fillColor: [232, 232, 232], textColor: 0, halign: 'left' }
            }]);

            includedItems.forEach(item => {
                itemCounter++;
                mainTableBody.push([
                    itemCounter.toString(),
                    `${item.property} [${item.type || AssetType.OTRO}]`,
                    formatDate(item.startDate),
                    { content: item.startUfv.toFixed(5), styles: { halign: 'right' } },
                    formatDate(item.endDate),
                    { content: item.endUfv.toFixed(5), styles: { halign: 'right' } },
                    { content: formatCurrency(item.baseValue), styles: { halign: 'right' } },
                    { content: formatCurrency(item.increment), styles: { halign: 'right' } },
                    { content: formatCurrency(item.updatedValue), styles: { halign: 'right', fontStyle: 'bold' } },
                ]);
            });

            mainTableBody.push([
                { content: 'SUBTOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(data.totalValue), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(data.totalIncrement), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(data.totalUpdatedValue), styles: { halign: 'right', fontStyle: 'bold' } },
            ]);
        });

        // --- Start Drawing PDF ---

        // 1. Draw Page 1 Header Manually
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(companyName, pageWidth / 2, 40, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('Cuadro de Actualización por UFV', pageWidth / 2, 55, { align: 'center' });

        const subheaderText = `Del ${formattedStartDate} (UFV: ${startUfvValue.toFixed(5)}) al ${formattedEndDate} (UFV: ${endUfvValue.toFixed(5)})`;
        doc.text(subheaderText, pageWidth / 2, 68, { align: 'center' });

        doc.setFontSize(9);
        doc.text('Expresado en Bolivianos', pageWidth / 2, 80, { align: 'center' });

        let lastY = 80;

        // 2. Draw Summary Table on Page 1 if it exists
        if (summaryData.length > 0) {
            const summaryHead = [['Cuenta', 'Nombre Cuenta', 'Total Ajuste por\nActualización', `Total Valor Actualizado al\n${formattedEndDate}`]];
            const summaryBody = summaryData.map(d => [
                d.account,
                d.accountName,
                { content: formatCurrency(d.totalIncrement), styles: { halign: 'right' } },
                { content: formatCurrency(d.totalUpdatedValue), styles: { halign: 'right', fontStyle: 'bold' } },
            ]);
            const summaryFoot = [[
                { content: 'TOTAL GENERAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(summaryTotals.totalIncrement), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(summaryTotals.totalUpdatedValue), styles: { halign: 'right', fontStyle: 'bold' } },
            ]];

            const cmToPt = 28.3465; // 1 cm in points
            const summaryStartY = lastY + cmToPt;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Resumen Total por Cuenta', pageWidth / 2, summaryStartY - 10, { align: 'center' });

            autoTable(doc, {
                head: summaryHead,
                body: summaryBody,
                foot: summaryFoot,
                startY: summaryStartY,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4, font: 'helvetica' },
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: 100 },
                footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', lineWidth: 0.5, lineColor: 100 },
                bodyStyles: { lineWidth: 0.5, lineColor: 150 },
                margin: { left: margin, right: margin },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 100 },
                    3: { cellWidth: 110 },
                }
            });
            lastY = (doc as any).lastAutoTable.finalY;
        }

        // --- NEW: Identify and Draw ALTAS and BAJAS tables ---
        const acquisitions = calculatedInvestments.filter(item =>
            item.isIncluded && item.acquisitionDate && item.acquisitionDate > startDate && item.acquisitionDate <= endDate
        );
        const retirements = calculatedInvestments.filter(item =>
            item.isIncluded && item.retirementDate && item.retirementDate > startDate && item.retirementDate <= endDate
        );

        if (acquisitions.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Altas del Periodo', pageWidth / 2, lastY + 30, { align: 'center' });
            autoTable(doc, {
                head: [['Cuenta', 'Inmueble', 'Tipo', 'Fecha de Alta', 'Valor de Adquisición']],
                body: acquisitions.map(item => [
                    item.account,
                    item.property,
                    item.type,
                    formatDate(item.acquisitionDate!),
                    { content: formatCurrency(item.originalValue), styles: { halign: 'right' } }
                ]),
                startY: lastY + 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4, font: 'helvetica' },
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: 100 },
                bodyStyles: { lineWidth: 0.5, lineColor: 150 },
                margin: { left: margin, right: margin },
            });
            lastY = (doc as any).lastAutoTable.finalY;
        }

        if (retirements.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Bajas del Periodo', pageWidth / 2, lastY + 30, { align: 'center' });
            autoTable(doc, {
                head: [['Cuenta', 'Inmueble', 'Tipo', 'Fecha de Baja', 'Valor Base (Inicio Periodo)']],
                body: retirements.map(item => [
                    item.account,
                    item.property,
                    item.type,
                    formatDate(item.retirementDate!),
                    { content: formatCurrency(item.baseValue), styles: { halign: 'right' } }
                ]),
                startY: lastY + 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4, font: 'helvetica' },
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.5, lineColor: 100 },
                bodyStyles: { lineWidth: 0.5, lineColor: 150 },
                margin: { left: margin, right: margin },
            });
            lastY = (doc as any).lastAutoTable.finalY;
        }

        // 3. Draw Main Detailed Table
        const mainTableHead = [
            ['No.', 'Inmueble', 'Fecha\nInicial', 'UFV\nInicial', 'Fecha\nFinal', 'UFV\nFinal', 'Valor Inicial', 'Actualización', 'Valor Final']
        ];

        const drawSubsequentPageHeader = (data: any) => {
            if (data.pageNumber > 1) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(companyName, margin, 30);

                doc.setFont('helvetica', 'normal');
                doc.text('Cuadro de Actualización por UFV', pageWidth - margin, 30, { align: 'right' });
            }
        };

        autoTable(doc, {
            head: mainTableHead,
            body: mainTableBody,
            startY: lastY + 30, // Start after summary/altas/bajas tables
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', overflow: 'linebreak' },
            headStyles: { fontSize: 7, fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle', lineWidth: 0.5, lineColor: 100 },
            bodyStyles: { lineWidth: 0.5, lineColor: 150 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 117 },
                2: { cellWidth: 45 },
                3: { cellWidth: 45 },
                4: { cellWidth: 45 },
                5: { cellWidth: 45 },
                6: { cellWidth: 65 },
                7: { cellWidth: 65 },
                8: { cellWidth: 80 },
            },
            margin: { left: margin, right: margin },
            didDrawPage: drawSubsequentPageHeader,
        });

        // 4. Draw Footer on all pages
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Elaboración del Área Contable', margin, pageHeight - 20);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
        }

        doc.save(`reporte_actualizacion_${companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleGenerateExcel = (format: 'formatted' | 'unformatted') => {
        if (!companyName.trim()) { alert("Por favor, ingrese el nombre de la empresa."); return; }
        if (!startUfvValue || !endUfvValue) { alert("Fechas o valores UFV no válidos para generar el reporte."); return; }
        if (summaryTotals.processedItemsCount === 0) { alert("No hay items seleccionados para generar el reporte."); return; }

        const wb = XLSX.utils.book_new();

        if (format === 'formatted') {
            const ws_data: any[][] = [];
            ws_data.push([companyName]);
            ws_data.push(['Cuadro de Actualización por UFV']);
            ws_data.push(['Fecha Inicial', formatDate(startDate), 'UFV Inicial', startUfvValue]);
            ws_data.push(['Fecha Final', formatDate(endDate), 'UFV Final', endUfvValue]);
            ws_data.push([`Base de Cálculo: ${calculationBase === 'original' ? 'Valor Original' : 'Último Valor Actualizado'}`]);
            ws_data.push(['Expresado en Bolivianos']);
            ws_data.push([]);

            Object.entries(groupedInvestments).forEach(([groupKey, data]) => {
                const includedItems = data.items.filter(i => i.isIncluded);
                if (includedItems.length === 0) return;

                ws_data.push([groupKey]);
                ws_data.push(['Cuenta', 'Inmueble', 'Tipo Activo', `Valor Inicial`, 'Fecha Ini. Act.', 'Fecha Fin Act.', 'Considera Act.', 'Ajuste', `Valor Actualizado`]);

                includedItems.forEach(item => {
                    ws_data.push([item.account, item.property, item.type || AssetType.OTRO, item.baseValue, formatDate(item.startDate), formatDate(item.endDate), item.isIncluded ? 'Si' : 'No', item.increment, item.updatedValue]);
                });

                ws_data.push(['', 'SUBTOTAL', '', data.totalValue, '', '', '', data.totalIncrement, data.totalUpdatedValue]);
                ws_data.push([]);
            });

            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, 'Actualizacion UFV');
            XLSX.writeFile(wb, `reporte_actualizacion_${companyName.replace(/\s+/g, '_')}.xlsx`);

        } else { // Unformatted
            const headers = [
                'No.', 'Cuenta', 'Nombre de la Cuenta', 'Inmueble', 'Tipo Activo',
                'Fecha Inicial', 'UFV inicial',
                'Fecha Final', 'UFV Final',
                'Valor inicial', 'Actualización', 'Valor Final',
                'Considera Act.'
            ];

            const data = calculatedInvestments
                .filter(item => item.isIncluded)
                .map((item, index) => [
                    index + 1,
                    item.account,
                    item.accountName,
                    item.property,
                    item.type || AssetType.OTRO,
                    formatDate(item.startDate),
                    item.startUfv,
                    formatDate(item.endDate),
                    item.endUfv,
                    item.baseValue,
                    item.increment,
                    item.updatedValue,
                    item.isIncluded ? 'Si' : 'No'
                ]);

            const ws_data = [headers, ...data];
            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            ws['!cols'] = [
                { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 20 },
                { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
                { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
            ];

            const currencyFormat = '#,##0.00';
            const ufvFormat = '0.00000';
            data.forEach((row, rowIndex) => {
                const realRow = rowIndex + 1; // XLSX rows are 1-based
                [6, 8].forEach(colIndex => { // UFV Columns updated index
                    const cell = ws[XLSX.utils.encode_cell({ c: colIndex, r: realRow })];
                    if (cell) cell.z = ufvFormat;
                });
                [9, 10, 11].forEach(colIndex => { // Currency Columns updated index
                    const cell = ws[XLSX.utils.encode_cell({ c: colIndex, r: realRow })];
                    if (cell) cell.z = currencyFormat;
                });
            });

            XLSX.utils.book_append_sheet(wb, ws, 'Listado Actualizacion');
            XLSX.writeFile(wb, `listado_actualizacion_${companyName.replace(/\s+/g, '_')}.xlsx`);
        }
    };

    const handleGenerateJournalEntryExcel = (format: 'detailed' | 'grouped') => {
        if (!companyName.trim()) { alert("Por favor, ingrese el nombre de la empresa."); return; }
        if (!startUfvValue || !endUfvValue) { alert("Fechas o valores UFV no válidos para generar el reporte."); return; }

        const includedItems = calculatedInvestments.filter(item => item.isIncluded && item.increment !== 0);
        if (includedItems.length === 0) { alert("No hay items con incrementos para generar el asiento."); return; }

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);
        const fechaAsiento = formattedEndDate;
        const base = companyName === 'Inmobiliaria Las Misiones S.A.' ? 5 : 2;
        const aitbAccount = '51020101';
        const aitbDescription = 'AJUSTE POR INFLACION Y TENENCIA DE BIENES';

        const excelData: any[][] = [];
        let order = 1;

        if (format === 'detailed') {
            const debitRows = includedItems.map(item => {
                const glosa = `${item.property} - Actualizacion de Inversiones Del ${formattedStartDate} Al ${formattedEndDate}`;
                const row = [
                    fechaAsiento,           // FECHA
                    base,                   // BASE
                    item.account,           // CUENTA_CONTABLE
                    'DB',                   // NATURALEZA
                    'BOL',                  // MONEDA
                    0,                      // TERCERO
                    item.increment,         // VALOR
                    item.property,          // REFERENCIA
                    order,                  // ORDEN
                    glosa,                  // GLOSA
                    31,                     // CENTRO_COSTO
                    'ANDES'                 // ENTIDAD_FINANCIERA
                ];
                order++;
                return row;
            });
            excelData.push(...debitRows);

        } else { // grouped
            const grouped = includedItems.reduce((acc, item) => {
                const key = item.account;
                if (!acc[key]) {
                    acc[key] = { increment: 0, items: [] };
                }
                acc[key].increment += item.increment;
                acc[key].items.push(item);
                return acc;
            }, {} as Record<string, { increment: number, items: CalculatedInvestmentItem[] }>);

            const debitRows = Object.entries(grouped).map(([account, data]) => {
                const accountName = data.items[0]?.accountName || 'N/A';
                const glosa = `Actualizacion Total Cta. ${accountName} (${account}) Del ${formattedStartDate} Al ${formattedEndDate}`;
                const row = [
                    fechaAsiento,           // FECHA
                    base,                   // BASE
                    account,                // CUENTA_CONTABLE
                    'DB',                   // NATURALEZA
                    'BOL',                  // MONEDA
                    0,                      // TERCERO
                    data.increment,         // VALOR
                    accountName,            // REFERENCIA
                    order,                  // ORDEN
                    glosa,                  // GLOSA
                    31,                     // CENTRO_COSTO
                    'ANDES'                 // ENTIDAD_FINANCIERA
                ];
                order++;
                return row;
            });
            excelData.push(...debitRows);
        }

        const totalIncrement = includedItems.reduce((sum, item) => sum + item.increment, 0);
        const glosaCredit = `Actualizacion Total Inversiones Del ${formattedStartDate} Al ${formattedEndDate}`;
        const creditRow = [
            fechaAsiento,               // FECHA
            base,                       // BASE
            aitbAccount,                // CUENTA_CONTABLE
            'CR',                       // NATURALEZA
            'BOL',                      // MONEDA
            0,                          // TERCERO
            totalIncrement,             // VALOR
            aitbDescription,            // REFERENCIA
            order,                      // ORDEN
            glosaCredit,                // GLOSA
            31,                         // CENTRO_COSTO
            'ANDES'                     // ENTIDAD_FINANCIERA
        ];

        excelData.push(creditRow);

        const headers = [
            'FECHA', 'BASE', 'CUENTA_CONTABLE', 'NATURALEZA', 'MONEDA',
            'TERCERO', 'VALOR', 'REFERENCIA', 'ORDEN', 'GLOSA',
            'CENTRO_COSTO', 'ENTIDAD_FINANCIERA'
        ];

        const ws_data = [headers, ...excelData];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        ws['!cols'] = [
            { wch: 10 }, { wch: 5 }, { wch: 15 }, { wch: 10 }, { wch: 8 },
            { wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 80 },
            { wch: 15 }, { wch: 20 }
        ];

        const currencyFormat = '#,##0.00';
        excelData.forEach((_, rowIndex) => {
            const cellRef = XLSX.utils.encode_cell({ c: 6, r: rowIndex + 1 });
            if (ws[cellRef]) ws[cellRef].z = currencyFormat;
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'AsientoDiario');
        XLSX.writeFile(wb, `Asiento_Diario_Actualizacion_${companyName.replace(/\s+/g, '_')}_${endDate}.xlsx`);
    };


    return (
        <div className="animate-fade-in space-y-6">
            {/* Input Section */}
            <div>
                <div className="bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-800/60 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            Gestión de Inversiones
                        </h2>
                        <div className="flex gap-2 text-xs">
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-3 rounded-lg transition-all border border-slate-700"
                            >
                                <DownloadIcon /> Plantilla
                            </button>
                            <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-3 rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-500/20">
                                <DownloadIcon className="transform rotate-180" />
                                <span>Importar Excel</span>
                                <input
                                    type="file"
                                    accept=".xls,.xlsx"
                                    multiple
                                    onChange={(e) => handleFileProcessing(e.target.files)}
                                    className="hidden"
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50' : 'bg-red-950/30 text-red-400 border-red-800/50'}`}>
                            {message.text}
                        </div>
                    )}

                    {investmentItems.length === 0 && (
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-900/20">
                                <FileSpreadsheetIcon className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <p className="text-slate-400 mb-2">Arrastra tus archivos Excel aquí o usa el botón Importar</p>
                            <p className="text-xs text-slate-500">Soporta .xls y .xlsx con las columnas requeridas</p>
                            <button
                                onClick={handleAddItem}
                                className="mt-6 text-sm text-blue-400 hover:text-blue-300 font-medium"
                            >
                                O crear registro manual
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {investmentItems.length > 0 && (
                <div className="space-y-6">
                    {/* SECTION: CALCULATION PARAMETERS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800/60">
                        <div className="lg:col-span-2">
                            <label className="block mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Empresa</label>
                            <select value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all">
                                {companyOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Inicio UFV</label>
                                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">
                                        {startUfvValue?.toFixed(5) || '-'}
                                    </span>
                                </div>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Fin UFV</label>
                                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">
                                        {endUfvValue?.toFixed(5) || '-'}
                                    </span>
                                </div>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex items-center gap-6 pt-2 border-t border-slate-800/50">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Base de Cálculo:</span>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${calculationBase === 'original' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}>
                                        {calculationBase === 'original' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        <input type="radio" name="calcBase" value="original" checked={calculationBase === 'original'} onChange={() => setCalculationBase('original')} className="hidden" />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Valor Original</span>
                                </label>
                                <label className={`flex items-center gap-2 group ${!hasHistory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${calculationBase === 'latest' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}>
                                        {calculationBase === 'latest' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        <input type="radio" name="calcBase" value="latest" checked={calculationBase === 'latest'} onChange={() => setCalculationBase('latest')} disabled={!hasHistory} className="hidden" />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Último Valor Actualizado</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: ITEMS FOR CALCULATION (NEW TABLE) */}
                    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-xl border border-slate-800/60 overflow-hidden">
                        <div
                            className="flex justify-between items-center p-6 cursor-pointer hover:bg-slate-800/50 transition-colors border-b border-slate-800"
                            onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}
                        >
                            <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                                <span className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                                    <FileSpreadsheetIcon className="w-5 h-5" />
                                </span>
                                Detalle de Inversiones
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddItem(); }}
                                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    + Añadir
                                </button>
                                <ChevronDownIcon className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${isSelectionExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        <div className={`transition-all duration-500 ease-in-out ${isSelectionExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {/* Use the new InvestmentTable component */}
                            <InvestmentTable
                                items={calculatedInvestments}
                                selectedIds={selectedItemIds}
                                onSelectionChange={handleItemSelection}
                                onSelectAll={handleSelectAll}
                                onItemChange={handleItemChange}
                                onDateChange={handleItemDateChange}
                                onRemove={handleRemoveItem}
                                calculationBase={calculationBase}
                                itemsForCalc={itemsForCalc}
                            />

                            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center text-sm">
                                <span className="text-slate-400">
                                    Seleccionados: <span className="text-white font-bold">{selectedCount}</span>
                                </span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-slate-400">Total Base Seleccionado:</span>
                                    <span className="text-emerald-400 font-mono font-bold text-base">{formatCurrency(totalSelectedValue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* SECTION: SUMMARY METRICS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/40 backdrop-blur border border-slate-800 p-4 rounded-2xl shadow-lg">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Items Evaluados</p>
                            <p className="text-2xl font-bold text-white mt-1">{summaryTotals.processedItemsCount}</p>
                        </div>
                        <div className="bg-slate-900/40 backdrop-blur border border-slate-800 p-4 rounded-2xl shadow-lg">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Total Valor Base</p>
                            <p className="text-2xl font-bold text-slate-200 mt-1 tracking-tight">{formatCurrency(summaryTotals.totalBaseValue)}</p>
                        </div>
                        <div className="bg-emerald-950/20 backdrop-blur border border-emerald-900/30 p-4 rounded-2xl shadow-lg">
                            <p className="text-xs font-semibold text-emerald-500/80 uppercase">Ajuste Total (AITB)</p>
                            <p className="text-2xl font-bold text-emerald-400 mt-1 tracking-tight">+{formatCurrency(summaryTotals.totalIncrement)}</p>
                        </div>
                        <div className="bg-blue-950/20 backdrop-blur border border-blue-900/30 p-4 rounded-2xl shadow-lg">
                            <p className="text-xs font-semibold text-blue-400/80 uppercase">Total Actualizado</p>
                            <p className="text-2xl font-bold text-blue-300 mt-1 tracking-tight">{formatCurrency(summaryTotals.totalUpdatedValue)}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button onClick={handleSaveUpdate} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group">
                            <SaveIcon className="group-hover:scale-110 transition-transform" />
                            <span>Guardar en Historial</span>
                        </button>
                        <button onClick={handleGeneratePdf} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg group">
                            <FileTextIcon className="text-red-400 group-hover:scale-110 transition-transform" />
                            <span>PDF Reporte</span>
                        </button>
                        <div className="relative flex-1" ref={excelButtonRef}>
                            <button
                                onClick={() => setIsExcelMenuOpen(prev => !prev)}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg group"
                            >
                                <FileSpreadsheetIcon className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span>Excel Reporte</span>
                                <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExcelMenuOpen && (
                                <div className="absolute bottom-full mb-2 w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-20 animate-fade-in-up">
                                    <div className="p-1">
                                        <button onClick={() => { handleGenerateExcel('formatted'); setIsExcelMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                            Con Formato (Detallado)
                                        </button>
                                        <button onClick={() => { handleGenerateExcel('unformatted'); setIsExcelMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                            Sin Formato (Plano)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative flex-1" ref={journalEntryButtonRef}>
                            <button
                                onClick={() => setIsJournalEntryMenuOpen(prev => !prev)}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg group"
                            >
                                <FileTextIcon className="text-purple-400 group-hover:scale-110 transition-transform" />
                                <span>Asiento Diario</span>
                                <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${isJournalEntryMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isJournalEntryMenuOpen && (
                                <div className="absolute bottom-full mb-2 w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-20 animate-fade-in-up">
                                    <div className="p-1">
                                        <button onClick={() => { handleGenerateJournalEntryExcel('detailed'); setIsJournalEntryMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                            Detallado (Fila por Fila)
                                        </button>
                                        <button onClick={() => { handleGenerateJournalEntryExcel('grouped'); setIsJournalEntryMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-700 rounded-lg text-sm text-slate-200 transition-colors">
                                            Agrupado por Cuenta
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {saveMessage && (
                        <div className="mt-4 p-4 rounded-xl text-sm font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 text-center animate-fade-in-up">
                            {saveMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Investments;