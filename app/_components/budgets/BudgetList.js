'use client'
import { useRef, useState } from "react";
import Button from "../common/Button";
import VirtualizedBudgetList from "./VirtualizedBudgetList"
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import Dialog from "../common/Dialog";
import AddBudgetForm from "./AddBudgetForm";
import BudgetTab from "./BudgetTab";
import InfoBudgetContent from "./InfoBudgetContent";

export default function BudgetList() {
    const PAGE_SIZE = 10;

    const [budgetData, setBudgetData] = useState(null);
    const [budgetType, setBudgetType] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
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

    const handleBudgetClick = (data) => {
        setBudgetData(data);
        setShowInfo(true);
    }

    return (
        <div className="grow flex flex-col">
            <BudgetTab onChange={handleTypeChange}/>
            <div className="grow">
                <VirtualizedBudgetList
                    scrollRef={scrollRef}
                    items={budgets}
                    hasNextPage={budgets && budgets.length % PAGE_SIZE === 0}
                    loadMore={fetchMoreData}
                    onBudgetClicked={handleBudgetClick}
                />
            </div>
            <div className="flex justify-center mt-2">
                <Button label={"Add New Budget"} onClick={() => setShowAdd(true)}/>
            </div>
            <Dialog
                show={showAdd}
                hideFn={() => setShowAdd(false)}
            >
                <AddBudgetForm onSubmit={() => setShowAdd(false)}/>
            </Dialog>
            <Dialog
                show={showInfo}
                hideFn={() => setShowInfo(false)}
            >
                <InfoBudgetContent budget={budgetData}/>
            </Dialog>
        </div>
    )
}