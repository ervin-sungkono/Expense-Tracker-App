'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedExpenseList from "../_components/expenses/VirtualizedExpenseList";
import { useEffect, useState } from "react";
import { db } from "../_lib/db";
import { liveQuery } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "next/navigation";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import { IoFilter } from "react-icons/io5";

export default function Expenses() {
    const PAGE_SIZE = 20;
    const createLiveQuery = (pageIndex) => liveQuery(() => db.getPaginatedExpenses(pageIndex, PAGE_SIZE, searchText, chosenCategory, chosenShop));
    const [liveQueries, setLiveQueries] = useState([createLiveQuery(0)]);
    const [resultArrays, setResultArrays] = useState([]);
    const [expenses, setExpenses] = useState(null)
    const [searchText, setSearchText] = useState("");
    const [chosenCategory, setChosenCategory] = useState(null);
    const [chosenShop, setChosenShop] = useState(null);
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [filterMode, setFilterMode] = useState(false);

    const searchParams = useSearchParams();
    const category = searchParams.get('category');
    const shop = searchParams.get('shop');

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
    }, [searchText, chosenCategory, chosenShop])

    useEffect(() => {
        if(category && categories) {
            setChosenCategory(categories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id)
        }
    }, [category, categories])

    useEffect(() => {
        if(shop && shops) {
            setChosenShop(shops.find(s => s.name.toLowerCase() === shop.toLowerCase())?.id)
        }
    }, [shop, shops])

    useEffect(() => {
        if(resultArrays && resultArrays.length > 0 && categories && shops) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));
            setExpenses(
                resultArrays.flat(1)
                .map(expense => ({ 
                    ...expense, 
                    category: categoriesMap.get(String(expense.categoryId)),
                    shop: shopsMap.get(String(expense.shopId))
                }))
            )
        }
    }, [resultArrays, categories, shops])

    const fetchMoreData = async() => {
        const nextPageIndex = liveQueries.length;
        setLiveQueries(currentLiveQueries => [...currentLiveQueries, createLiveQuery(nextPageIndex)])
    };

    return(
        <Layout pathname={"/expenses"}>
            <div className="h-full flex flex-col">
                <div className="mb-4">
                    <Header title={"Expense List"} textAlign="center"/>
                    <div className="flex items-center gap-1.5">
                        <SearchBar
                            placeholder={"Search based on notes"}
                            onSearch={(value) => setSearchText(value.toLowerCase())}
                        />
                        <div className="relative z-0">
                            <IconButton icon={<IoFilter size={20}/>} contained onClick={() => setFilterMode(!filterMode)}/>
                        </div>
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