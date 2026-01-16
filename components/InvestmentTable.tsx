import React from 'react';
import { InvestmentItem, CalculatedInvestmentItem, AssetType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters'; // We'll need to extract formatters
import { ChevronDownIcon } from '../constants'; // Import icons

interface InvestmentTableProps {
    items: CalculatedInvestmentItem[];
    selectedIds: Set<string>;
    onSelectionChange: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onItemChange: (id: string, field: keyof InvestmentItem, value: any) => void;
    onDateChange: (id: string, field: 'calcStartDate' | 'calcEndDate', value: string) => void;
    onRemove: (id: string) => void;
    calculationBase: 'original' | 'latest';
    itemsForCalc: any[]; // itemsForCalc interface needs to be imported or defined
}

const InvestmentTable: React.FC<InvestmentTableProps> = ({
    items,
    selectedIds,
    onSelectionChange,
    onSelectAll,
    onItemChange,
    onDateChange,
    onRemove,
    calculationBase,
    itemsForCalc
}) => {

    // Group items by type for better visualization
    const groupedItems = items.reduce((acc, item) => {
        const type = item.type || AssetType.OTRO;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {} as Record<AssetType, CalculatedInvestmentItem[]>);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-blue-300 uppercase bg-slate-900/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-4 w-12 rounded-tl-lg">
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-500 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-offset-slate-900 transition-all cursor-pointer"
                                checked={items.length > 0 && selectedIds.size === items.length}
                                onChange={(e) => onSelectAll(e.target.checked)}
                            />
                        </th>
                        <th className="px-4 py-4">Tipo Activo</th>
                        <th className="px-4 py-4">Cuenta / Inmueble</th>
                        <th className="px-4 py-4 text-right">Valor Base</th>
                        <th className="px-4 py-4 text-center">Fechas Cálculo</th>
                        <th className="px-4 py-4 text-right">Incremento</th>
                        <th className="px-4 py-4 text-right">Valor Final</th>
                        <th className="px-4 py-4 text-center rounded-tr-lg">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {Object.entries(groupedItems).map(([type, groupItems]) => (
                        <React.Fragment key={type}>
                            <tr className="bg-slate-800/80">
                                <td colSpan={8} className="px-4 py-2 font-bold text-blue-100 text-xs uppercase tracking-wider">
                                    {type} ({groupItems.length})
                                </td>
                            </tr>
                            {groupItems.map(item => {
                                const itemForCalc = itemsForCalc.find(i => i.id === item.id);
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-800/50 transition-colors duration-150 ${isSelected ? 'bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 text-blue-500 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-offset-slate-900 transition-all cursor-pointer"
                                                checked={isSelected}
                                                onChange={(e) => onSelectionChange(item.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.type || AssetType.OTRO}
                                                onChange={(e) => onItemChange(item.id, 'type', e.target.value)}
                                                className="bg-slate-800 border-none text-slate-300 text-xs rounded shadow-sm focus:ring-1 focus:ring-blue-500"
                                            >
                                                {Object.values(AssetType).map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 space-y-2">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={item.account}
                                                    onChange={(e) => onItemChange(item.id, 'account', e.target.value)}
                                                    className="bg-transparent border-b border-slate-700 text-slate-400 text-xs w-20 focus:border-blue-500 focus:outline-none mb-1 cursor-text hover:border-slate-500 transition-colors placeholder-slate-600"
                                                    placeholder="Cuenta"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={item.property}
                                                onChange={(e) => onItemChange(item.id, 'property', e.target.value)}
                                                className="w-full bg-transparent border-b border-slate-700 focus:border-blue-500 focus:outline-none py-1 text-slate-200 font-medium placeholder-slate-600 cursor-text hover:border-slate-500 transition-colors"
                                                placeholder="Descripción del Activo"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {calculationBase === 'original' ? (
                                                <input
                                                    type="number"
                                                    value={item.originalValue}
                                                    onChange={(e) => onItemChange(item.id, 'originalValue', e.target.value)}
                                                    className="w-32 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-mono text-slate-300">{formatCurrency(item.baseValue)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-center">
                                                <input
                                                    type="date"
                                                    value={itemForCalc?.calcStartDate || ''}
                                                    onChange={(e) => onDateChange(item.id, 'calcStartDate', e.target.value)}
                                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 w-32 focus:ring-1 focus:ring-blue-500"
                                                />
                                                <span className="text-slate-600 text-[10px]">a</span>
                                                <input
                                                    type="date"
                                                    value={itemForCalc?.calcEndDate || ''}
                                                    onChange={(e) => onDateChange(item.id, 'calcEndDate', e.target.value)}
                                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 w-32 focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-mono text-emerald-400 font-medium bg-emerald-950/30 px-2 py-1 rounded inline-block">
                                                +{formatCurrency(item.increment)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-mono text-slate-100 font-bold text-base">
                                                {formatCurrency(item.updatedValue)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onRemove(item.id)}
                                                className="text-rose-500 hover:text-rose-400 hover:bg-rose-950/30 p-2 rounded-lg transition-all"
                                                title="Eliminar registro"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </React.Fragment>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
                                    <p className="text-lg font-medium">No hay inversiones registradas</p>
                                    <p className="text-sm mt-1">Sube un archivo Excel o añade manualmente para comenzar</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default InvestmentTable;
