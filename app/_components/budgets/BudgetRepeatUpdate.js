'use client'

import { useLocalStorage } from "@/app/_lib/hooks"
import { useEffect } from "react";

export default function BudgetRepeatUpdate() {
    // TODO: make budget repeat update function
    const [lastUpdate, setLastUpdate] = useLocalStorage('lastBudgetUpdate');

    useEffect(() => {

    }, [lastUpdate])

    return (
        <></>
    )
}