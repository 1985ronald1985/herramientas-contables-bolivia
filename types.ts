

export interface UFVEntry {
    date: string; // YYYY-MM-DD
    value: number;
}

export interface InvestmentHistoryEntry {
    id: string; // Unique ID for this history record
    calculationDate: string; // ISO string of when calculation was saved
    periodStartDate: string;
    periodEndDate: string;
    startUfv: number;
    endUfv: number;
    startValue: number;
    increment: number;
    endValue: number;
}


export enum AssetType {
    INVERSION_PERMANENTE = 'Inversión Permanente',
    TERRENO = 'Terreno',
    OBRA_EN_EJECUCION = 'Obra en Ejecución',
    OTRO = 'Otro Activo'
}

export interface InvestmentItem {
    id: string;
    account: string;
    accountName: string;
    property: string;
    type: AssetType;
    originalValue: number;
    acquisitionDate?: string; // YYYY-MM-DD
    retirementDate?: string; // YYYY-MM-DD
    history: InvestmentHistoryEntry[];
}

export interface CalculatedInvestmentItem extends InvestmentItem {
    startDate: string;
    startUfv: number;
    endDate: string;
    endUfv: number;
    factor: number;
    baseValue: number;
    increment: number;
    updatedValue: number;
    isIncluded: boolean;
}

export enum AppView {
    INSTRUCTIONS = 'INSTRUCCIONES',
    UFV_DATA = 'UFV_DATOS',
    GENERAL_UPDATER = 'ACTUALIZADOR_GENERAL',
    INVESTMENTS = 'INVERSIONES',
}