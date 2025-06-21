'use client'
import { useState } from "react";
import Button from "../common/Button";
import VirtualizedBudgetList from "./VirtualizedBudgetList"
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";

export default function BudgetList() {
    const PAGE_SIZE = 10;

    const [showDialog, setShowDialog] = useState(false);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const budgets = useLiveQuery(() => db.getPaginatedBudgets(limit, { active: true }), [limit]);

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
    };

    return (
        <div className="grow flex flex-col">
            <div className="grow">
                <VirtualizedBudgetList
                    items={budgets}
                    hasNextPage={budgets && budgets.length % PAGE_SIZE === 0}
                    loadMore={fetchMoreData}
                />
            </div>
            <div className="flex justify-center mt-2">
                <Button label={"Add New Budget"} onClick={() => setShowDialog(true)}/>
            </div>
        </div>
    )
}