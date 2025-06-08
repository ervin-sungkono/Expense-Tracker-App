'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedTransactionList from "../_components/transactions/VirtualizedTransactionList";
import { useEffect, useState, Suspense } from "react";
import { db } from "../_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import CategoryTab from "../_components/categories/CategoryTab";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import { IoFilter as FilterIcon } from "react-icons/io5";
import Dialog from "../_components/common/Dialog";
import FilterTransaction from "../_components/transactions/FilterTransaction";
import { useSearchParams } from "next/navigation";
import { getDebtLoanType } from "../_lib/utils";

const UpdateFilter = ({ onSearchParamResult }) => {
    const searchParams = useSearchParams();
    const categories = useLiveQuery(() => db.getAllCategories());
    
    useEffect(() => {
        if(!categories) return;

        const category = searchParams.get('category');
        const shop = searchParams.get('shop');

        const foundCategory = categories.find(c => c.name === category);
        let defaultType = foundCategory?.type;

        if(defaultType === 'DebtLoan') {
            defaultType = getDebtLoanType(foundCategory.name);
        }

        onSearchParamResult && onSearchParamResult({ category, shop, defaultType });
    }, [searchParams, categories])

    return null;
}

export default function Transactions() {
    const PAGE_SIZE = 20;

    const [limit, setLimit] = useState(PAGE_SIZE);
    const [searchText, setSearchText] = useState("");
    const [defaultCategory, setCategory] = useState(null);
    const [defaultShop, setShop] = useState(null);
    const [type, setType] = useState('Expense');
    const [filterOptions, setFilterOptions] = useState({
        categoryId: null,
        shopId: null,
        amountRange: [undefined, undefined],
        dateRange: [undefined, undefined]
    })

    const transactionQuery = useLiveQuery(
        () => db.getPaginatedTransactions(limit, searchText, type, filterOptions), 
        [limit, searchText, type, filterOptions]
    )
    
    const [transactions, setTransactions] = useState(null);
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [filterMode, setFilterMode] = useState(false);

    useEffect(() => {        
        setLimit(PAGE_SIZE); // Refresh page limit
    }, [searchText, filterOptions])

    useEffect(() => {
        if(defaultCategory && categories) {
            setFilterOptions((prevOptions) => ({
                ...prevOptions,
                categoryId: categories.find(c => c.name.toLowerCase() === defaultCategory.toLowerCase())?.id
            }))
        }
    }, [defaultCategory, categories])

    useEffect(() => {
        if(defaultShop && shops) {
            setFilterOptions((prevOptions) => ({
                ...prevOptions,
                shopId: shops.find(s => s.name.toLowerCase() === defaultShop.toLowerCase())?.id
            }))
        }
    }, [defaultShop, shops])

    useEffect(() => {
        if(transactionQuery && categories && shops) {
            const categoriesMap = new Map(categories.map(category => [String(category.id), category]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));

            const transactionData = transactionQuery
                .map(transaction => ({
                    ...transaction, 
                    category: categoriesMap.get(String(transaction.categoryId)),
                    shop: shopsMap.get(String(transaction.shopId))
                }))

            const transactionMap = {};
            transactionData.forEach(transaction => {
                const dateKey = transaction.date.split('T')[0];

                if(!transactionMap[dateKey]) {
                    transactionMap[dateKey] = {
                        date: new Date(dateKey),
                        totalAmount: transaction.amount,
                        data: [transaction]
                    }
                } else {
                    transactionMap[dateKey].totalAmount += transaction.amount;
                    transactionMap[dateKey].data.unshift(transaction);
                }
            })

            setTransactions(Object.values(transactionMap))
        }
    }, [transactionQuery, categories, shops])

    const handleFilter = ({ category, shop, defaultType }) => {
        if(category) setCategory(category);
        if(shop) setShop(shop);
        if(defaultType) setType(defaultType);
    }

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
    };

    return(
        <Layout pathname={"/transactions"}>
            <Suspense>
                <UpdateFilter onSearchParamResult={handleFilter}/>
            </Suspense>
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
                <CategoryTab 
                    selected={type} 
                    onChange={(val) => setType(val)} 
                    excluded={['DebtLoan']}
                />
                <div className="flex grow mb-2">
                    <VirtualizedTransactionList
                        items={transactions}
                        loadMore={fetchMoreData}
                        hasNextPage={transactionQuery && transactionQuery.length > 0 && transactionQuery.length % PAGE_SIZE === 0}
                    />
                </div>
            </div>
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
        </Layout>
    )
}