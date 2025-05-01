'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedExpenseList from "../_components/expenses/VirtualizedExpenseList";
import { useEffect, useState } from "react";
import { db } from "../_lib/db";
import { liveQuery } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

export default function Expenses() {
    const PAGE_SIZE = 10;
    const createLiveQuery = (pageIndex) => liveQuery(() => db.getPaginatedExpenses(pageIndex, PAGE_SIZE));
    const [liveQueries, setLiveQueries] = useState([createLiveQuery(0)]);
    const [resultArrays, setResultArrays] = useState([]);
    const [expenses, setExpenses] = useState([])
    const categories = useLiveQuery(() => db.getAllCategories());

    useEffect(() => {
        const subscriptions = liveQueries.map((q, i) => q.subscribe(
            results => setResultArrays(resultArrays => {
              const arrayClone = [...resultArrays];
              arrayClone[i] = results;
              return arrayClone;
            })
        ));
        return () => {
            for (const s of subscriptions) {
                s.unsubscribe();
            }
        };
    }, [liveQueries])

    useEffect(() => {
        if(resultArrays && categories) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            setExpenses(resultArrays.flat(1).map(expense => ({ ...expense, category: categoriesMap.get(String(expense.categoryId)) })))
        }
    }, [resultArrays, categories])

    const fetchMoreData = () => {
        const nextPageIndex = liveQueries.length;
        setLiveQueries(currentLiveQueries => [...currentLiveQueries, createLiveQuery(nextPageIndex)])
    };

    return(
        <Layout pathname={"/expenses"}>
            <VirtualizedExpenseList
                items={expenses}
                loadMore={fetchMoreData}
                hasNextPage={resultArrays.at(-1)?.length === PAGE_SIZE}
            />
        </Layout>
    )
}