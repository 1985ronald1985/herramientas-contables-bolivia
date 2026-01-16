
import React, { useState, useMemo, useCallback } from 'react';
import { UFVEntry } from '../types';

interface GeneralUpdaterProps {
    ufvData: UFVEntry[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// Componente movido fuera y memoizado para prevenir la pérdida de foco.
const InputField = React.memo(({ label, type, value, onChange, ...rest }: { 
    label:string, 
    type:string, 
    value: any, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    min?: string,
    max?: string,
    inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
}) => (
     <div>
        <label className="block mb-1 text-sm font-medium text-gray-400">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            className={`bg-yellow-200 text-gray-900 placeholder-gray-500 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${type === 'date' ? 'date-input-fix' : ''}`}
            {...rest}
        />
    </div>
));

// Componente movido fuera y memoizado.
const ResultField = React.memo(({ label, value }: {label: string, value: string | null}) => (
    <div className="bg-green-900/50 p-3 rounded-lg">
        <p className="text-sm text-green-300">{label}</p>
        <p className="text-xl font-semibold text-green-200">{value ?? 'N/A'}</p>
    </div>
));


const GeneralUpdater: React.FC<GeneralUpdaterProps> = ({ ufvData }) => {
    const [startDate, setStartDate] = useState('2022-12-31');
    const [endDate, setEndDate] = useState('2023-12-31');
    const [amountStr, setAmountStr] = useState('10000');

    const { minDate, maxDate } = useMemo(() => {
        if (!ufvData || ufvData.length === 0) {
            return { minDate: undefined, maxDate: undefined };
        }
        const dates = ufvData.map(d => d.date);
        const min = dates.reduce((a, b) => a < b ? a : b);
        const max = dates.reduce((a, b) => a > b ? a : b);
        return { minDate: min, maxDate: max };
    }, [ufvData]);


    const findUfv = useCallback((date: string): number | null => {
        const entry = ufvData.find(d => d.date === date);
        return entry ? entry.value : null;
    }, [ufvData]);

    const results = useMemo(() => {
        const ufvInitial = findUfv(startDate);
        const ufvFinal = findUfv(endDate);
        const amount = parseFloat(amountStr.replace(',', '.')) || 0;
        
        if (ufvInitial === null || ufvFinal === null || amount <= 0 || !startDate || !endDate) {
            return null;
        }

        const factor = ufvFinal / ufvInitial;
        const updatedValue = amount * factor;
        const increment = updatedValue - amount;

        return { ufvInitial, ufvFinal, factor, updatedValue, increment };
    }, [startDate, endDate, amountStr, findUfv]);

    return (
        <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Cálculo de Actualización Rápida</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-4 p-6 bg-gray-900 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-100 border-b border-gray-700 pb-2">Datos de Entrada</h3>
                    <InputField label="Fecha inicial:" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={minDate} max={maxDate} />
                    <InputField label="Fecha final:" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={minDate} max={maxDate} />
                    <InputField 
                        label="Valor a actualizar:" 
                        type="text"
                        inputMode="decimal"
                        value={amountStr}
                        onChange={e => setAmountStr(e.target.value)}
                    />
                </div>

                {/* Results */}
                <div className="space-y-4 p-6 bg-gray-900 rounded-lg">
                     <h3 className="text-lg font-semibold text-gray-100 border-b border-gray-700 pb-2">Resultados</h3>
                    {results ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ResultField label="UFV Inicial:" value={results.ufvInitial.toFixed(5)} />
                            <ResultField label="UFV Final:" value={results.ufvFinal.toFixed(5)} />
                            <ResultField label="Factor de actualización:" value={results.factor.toFixed(5)} />
                            <div className="bg-green-200 text-gray-900 p-3 rounded-lg sm:col-span-2">
                                <p className="text-sm font-bold">Valor Actualizado:</p>
                                <p className="text-2xl font-bold">{formatCurrency(results.updatedValue)}</p>
                            </div>
                             <div className="bg-green-200 text-gray-900 p-3 rounded-lg sm:col-span-2">
                                <p className="text-sm font-bold">Incremento (AITB):</p>
                                <p className="text-2xl font-bold">{formatCurrency(results.increment)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-700 rounded-lg">
                            <p className="text-gray-400 text-center">Seleccione fechas con datos UFV válidos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GeneralUpdater;