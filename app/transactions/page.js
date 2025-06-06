'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedTransactionList from "../_components/transactions/VirtualizedTransactionList";
import { useEffect, useState, Suspense } from "react";
import { db } from "../_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import { IoFilter as FilterIcon } from "react-icons/io5";
import Dialog from "../_components/common/Dialog";
import FilterTransaction from "../_components/transactions/FilterTransaction";

export default function Transactions() {
    const PAGE_SIZE = 20;

    const [limit, setLimit] = useState(PAGE_SIZE);
    const [searchText, setSearchText] = useState("");
    const [filterOptions, setFilterOptions] = useState({
        categoryId: null,
        shopId: null,
        amountRange: [undefined, undefined],
        dateRange: [undefined, undefined]
    })

    const transactionQuery = useLiveQuery(
        () => db.getPaginatedTransactions(limit, searchText, "Expense", filterOptions), 
        [limit, searchText, filterOptions]
    )
    
    const [transactions, setTransactions] = useState(null)
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [filterMode, setFilterMode] = useState(false);

    useEffect(() => {        
        setLimit(PAGE_SIZE); // Refresh page limit
    }, [searchText, filterOptions])

    useEffect(() => {
        if(transactionQuery && categories && shops) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));
            setTransactions(
                transactionQuery
                .map(transaction => ({ 
                    ...transaction, 
                    category: categoriesMap.get(String(transaction.categoryId)),
                    shop: shopsMap.get(String(transaction.shopId))
                }))
            )
        }
    }, [transactionQuery, categories, shops])

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
    };

    return(
        <Layout pathname={"/transactions"}>
            <div className="h-full flex flex-col">
                <div className="mb-4">
                    <Header title={"Transaction List"} textAlign="center"/>
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
                <div className="flex grow mb-2">
                    <VirtualizedTransactionList
                        items={transactions}
                        loadMore={fetchMoreData}
                        hasNextPage={transactionQuery && transactionQuery.length > 0 && transactionQuery.length % PAGE_SIZE === 0}
                    />
                </div>
            </div>
            <Suspense>
                <Dialog
                    show={filterMode}
                    hideFn={() => setFilterMode(false)}
                >
                    <FilterTransaction
                        onSubmit={() => setFilterMode(false)}
                        filterOptions={filterOptions}
                        setFilterOptions={setFilterOptions}
                    />
                </Dialog>
            </Suspense>
        </Layout>
    )
}