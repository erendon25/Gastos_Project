import { Timestamp } from 'firebase/firestore';

export interface FiscalRange {
    start: Date;
    end: Date;
    startTimestamp: Timestamp;
    endTimestamp: Timestamp;
}

export const getFiscalRange = (currentDate: Date): FiscalRange => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // The user wants the range from the 24th of the previous month to the 25th of the current month.
    // Example: For February (month = 1), it should be Jan 24 to Feb 25.
    
    const start = new Date(year, month - 1, 24, 0, 0, 0);
    const end = new Date(year, month, 25, 23, 59, 59);

    return {
        start,
        end,
        startTimestamp: Timestamp.fromDate(start),
        endTimestamp: Timestamp.fromDate(end)
    };
};
