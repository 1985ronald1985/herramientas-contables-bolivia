

import React from 'react';
import { UFVEntry } from './types';

const UFV_ENTRIES: UFVEntry[] = [
    // 2023 Data (adjusted)
    { date: "2022-12-31", value: 2.44111 },
    { date: "2023-01-01", value: 2.44317 },
    { date: "2023-01-02", value: 2.44317 },
    { date: "2023-01-03", value: 2.44378 },
    { date: "2023-01-04", value: 2.44439 },
    { date: "2023-01-05", value: 2.44501 },
    { date: "2023-01-31", value: 2.45934 },
    { date: "2023-02-28", value: 2.46914 },
    { date: "2023-03-01", value: 2.46961 },
    { date: "2023-03-31", value: 2.47959 },
    { date: "2023-04-30", value: 2.48625 },
    { date: "2023-05-31", value: 2.49079 },
    { date: "2023-06-15", value: 2.49502 },
    { date: "2023-06-30", value: 2.49553 },
    { date: "2023-07-31", value: 2.49887 },
    { date: "2023-8-31", value: 2.50156 },
    { date: "2023-09-30", value: 2.50314 },
    { date: "2023-10-31", value: 2.50505 },
    { date: "2023-11-30", value: 2.50742 },
    { date: "2023-12-30", value: 2.50854 },
    { date: "2023-12-31", value: 2.47444 }, // Corrected as per user
    // 2024 Data (adjusted)
    { date: "2024-01-31", value: 2.47848 }, // Corrected as per user
    { date: "2024-02-29", value: 2.52011 },
    { date: "2024-03-31", value: 2.52590 },
    { date: "2024-04-30", value: 2.53168 },
    { date: "2024-05-31", value: 2.53747 },
    { date: "2024-06-30", value: 2.54325 },
    { date: "2024-07-31", value: 2.54904 },
    { date: "2024-08-31", value: 2.55482 },
    { date: "2024-09-30", value: 2.56061 },
    { date: "2024-10-31", value: 2.56639 },
    { date: "2024-11-30", value: 2.57218 },
    { date: "2024-12-31", value: 2.57796 },
];

export const UFV_DATA = UFV_ENTRIES.sort((a, b) => a.date.localeCompare(b.date));


export const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>
    </svg>
);

export const TableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path>
    </svg>
);

export const CalculatorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <rect width="16" height="20" x="4" y="2" rx="2"></rect><line x1="8" x2="16" y1="6" y2="6"></line><line x1="16" x2="16" y1="14" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path>
    </svg>
);

export const BuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <rect width="16" height="20" x="4" y="2" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path>
    </svg>
);

export const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>
    </svg>
);

export const BriefcaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
);

export const FileSpreadsheetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
        <path d="M8 12h8"></path>
        <path d="M8 16h4"></path>
        <path d="M15 12v-2"></path>
        <path d="M12 16v-2"></path>
    </svg>
);

export const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

export const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);

export const SortAscIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/>
    </svg>
);

export const SortDescIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h10"/><path d="M11 16h7"/><path d="M11 20h4"/>
    </svg>
);

export const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6"/>
    </svg>
);
