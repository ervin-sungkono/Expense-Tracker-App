'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedExpenseList from "../_components/expenses/VirtualizedExpenseList";
import { useEffect, useState } from "react";
import { db } from "../_lib/db";
import { liveQuery } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import { useSearchParams } from "next/navigation";

export default function Expenses() {
    const PAGE_SIZE = 20;
    const createLiveQuery = (pageIndex) => liveQuery(() => db.getPaginatedExpenses(pageIndex, PAGE_SIZE, searchText, chosenCategory));
    const [liveQueries, setLiveQueries] = useState([createLiveQuery(0)]);
    const [resultArrays, setResultArrays] = useState([]);
    const [expenses, setExpenses] = useState([])
    const [searchText, setSearchText] = useState("");
    const [chosenCategory, setChosenCategory] = useState(null);
    const categories = useLiveQuery(() => db.getAllCategories());

    const searchParams = useSearchParams();
    const category = searchParams.get('category');

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
        setLiveQueries([createLiveQuery(0)]);
        setResultArrays([]);
    }, [searchText, chosenCategory])

    useEffect(() => {
        if(category && categories) {
            setChosenCategory(categories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id)
        }
    }, [category, categories])

    useEffect(() => {
        if(resultArrays && categories) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            setExpenses(
                resultArrays.flat(1)
                .map(expense => ({ ...expense, category: categoriesMap.get(String(expense.categoryId)) }))
            )
        }
    }, [resultArrays, categories])

    const fetchMoreData = async() => {
        const nextPageIndex = liveQueries.length;
        setLiveQueries(currentLiveQueries => [...currentLiveQueries, createLiveQuery(nextPageIndex)])
    };

    return(
        <Layout pathname={"/expenses"}>
            <div className="h-full flex flex-col">
                <div className="mb-4">
                    <Header title={"Expense List"} textAlign="center"/>
                    <div className="flex items-center gap-2">
                        <SearchBar
                            placeholder={"Search based on notes"}
                            onSearch={(value) => setSearchText(value.toLowerCase())}
                        />
                    </div>
                </div>
                <div className="flex grow">
                    <VirtualizedExpenseList
                        items={expenses}
                        loadMore={fetchMoreData}
                        hasNextPage={resultArrays.at(-1)?.length === PAGE_SIZE}
                    />
                </div>
            </div>
        </Layout>
    )
}