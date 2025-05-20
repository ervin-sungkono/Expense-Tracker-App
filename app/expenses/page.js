'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedExpenseList from "../_components/expenses/VirtualizedExpenseList";
import { useEffect, useState, Suspense } from "react";
import { db } from "../_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import FilterExpenseDialog from "../_components/expenses/FilterExpenseDialog";
import { IoFilter as FilterIcon } from "react-icons/io5";

export default function Expenses() {
    const PAGE_SIZE = 20;

    const [limit, setLimit] = useState(PAGE_SIZE);
    const [searchText, setSearchText] = useState("");
    const [filterOptions, setFilterOptions] = useState({
        categoryId: null,
        shopId: null,
        amountRange: [undefined, undefined],
        dateRange: [undefined, undefined]
    })

    const expenseQuery = useLiveQuery(
        () => db.getPaginatedExpenses(limit, searchText, filterOptions), 
        [limit, searchText, filterOptions]
    )
    
    const [expenses, setExpenses] = useState(null)
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [filterMode, setFilterMode] = useState(false);

    useEffect(() => {        
        setLimit(PAGE_SIZE); // Refresh page limit
    }, [searchText, filterOptions])

    useEffect(() => {
        if(expenseQuery && categories && shops) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));
            setExpenses(
                expenseQuery
                .map(expense => ({ 
                    ...expense, 
                    category: categoriesMap.get(String(expense.categoryId)),
                    shop: shopsMap.get(String(expense.shopId))
                }))
            )
        }
    }, [expenseQuery, categories, shops])

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
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
                        <div className="relative z-0">
                            <IconButton icon={<FilterIcon size={20}/>} contained onClick={() => setFilterMode(!filterMode)}/>
                        </div>
                    </div>
                </div>
                <div className="flex grow">
                    <VirtualizedExpenseList
                        items={expenses}
                        loadMore={fetchMoreData}
                        hasNextPage={expenseQuery && expenseQuery.length > 0 && expenseQuery.length % PAGE_SIZE === 0}
                    />
                </div>
            </div>
            <Suspense>
                <FilterExpenseDialog
                    show={filterMode}
                    hideFn={() => setFilterMode(false)}
                    filterOptions={filterOptions}
                    setFilterOptions={setFilterOptions}
                />
            </Suspense>
        </Layout>
    )
}