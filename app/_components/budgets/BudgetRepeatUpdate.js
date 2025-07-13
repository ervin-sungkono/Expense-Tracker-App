'use client'
import { db } from "@lib/db";
import { useLocalStorage } from "@lib/hooks"
import { getDayDifference } from "@lib/utils";
import { useEffect } from "react";

export default function BudgetRepeatUpdate() {
    // TODO: make budget repeat update function
    const [lastUpdate, setLastUpdate] = useLocalStorage('lastBudgetUpdate', null);

    useEffect(() => {
        const storedDate = lastUpdate ? new Date(lastUpdate) : null;
        const date = new Date();

        // TODO: make repeat budget function
        // If date not stored or the day difference between stored date and current date is 1
        if(!storedDate || getDayDifference(storedDate, date) > 1) {
            // Execute function
            db.updateRepeatableBudgets()
            setLastUpdate(date.toISOString());
        }
    }, [lastUpdate])

    return (
        <></>
    )
}