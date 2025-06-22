'use client'
import { useRef, useState } from "react";
import Button from "../common/Button";
import VirtualizedBudgetList from "./VirtualizedBudgetList"
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import Dialog from "../common/Dialog";
import AddBudgetForm from "./AddBudgetForm";
import BudgetTab from "./BudgetTab";

export default function BudgetList() {
    const PAGE_SIZE = 10;

    const [budgetType, setBudgetType] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const budgets = useLiveQuery(() => db.getPaginatedBudgets(limit, budgetType), [limit, budgetType]);
    const scrollRef = useRef(null);

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
    };

    const handleTypeChange = async(type) => {
        scrollRef.current?.scrollToItem(0);
        setBudgetType(type);
        setLimit(PAGE_SIZE);
    }

    return (
        <div className="grow flex flex-col">
            <BudgetTab selected={'all'} onChange={handleTypeChange}/>
            <div className="grow">
                <VirtualizedBudgetList
                    scrollRef={scrollRef}
                    items={budgets}
                    hasNextPage={budgets && budgets.length % PAGE_SIZE === 0}
                    loadMore={fetchMoreData}
                />
            </div>
            <div className="flex justify-center mt-2">
                <Button label={"Add New Budget"} onClick={() => setShowDialog(true)}/>
            </div>
            <Dialog
                show={showDialog}
                hideFn={() => setShowDialog(false)}
            >
                <AddBudgetForm onSubmit={() => setShowDialog(false)}/>
            </Dialog>
        </div>
    )
}