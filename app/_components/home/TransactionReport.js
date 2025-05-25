'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import TransactionGraph from "./TransactionGraph";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SubHeader from "./SubHeader";
import SelectField from "../common/SelectField";
import { MONTHS } from "@/app/_lib/const";
import { generateRangeOptions, getMonthlyLabels } from "@/app/_lib/utils";

export default function TransactionReport() {
    const transactions = useLiveQuery(() => db.getAllTransactions());
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [monthMap, setMonthMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    useEffect(() => {
        if(transactions && categories && shops) {
            const newMonthMap = {};
            const newYearMap = {};
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));

            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const month = date.getMonth();
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`

                transaction.category = categoriesMap.get(transaction.categoryId);
                transaction.shop = transaction.shopId ? shopsMap.get(transaction.shopId) : '';

                newMonthMap[monthKey] = (newMonthMap[monthKey] || []).concat(transaction);
                newYearMap[year] = (newYearMap[year] || []).concat(transaction);
            })

            setMonthMap(newMonthMap);
            setYearMap(newYearMap);
        }
    }, [transactions, categories, shops])

    const contents = [
        // TODO: make weekly report graph
        // {
        //     id: 'monthly',
        //     label: 'Monthly',
        //     header: () => (
        //         <div className="px-3 pt-2 grid grid-cols-2 gap-2">
        //             <SelectField
        //                 name={"month"}
        //                 placeholder={"Month"}
        //                 _selected={selectedMonth}
        //                 _options={MONTHS.map((month, index) => ({
        //                     id: index,
        //                     label: month
        //                 }))} 
        //                 onChange={(val) => setSelectedMonth(val)}
        //             />
        //             <SelectField 
        //                 name={"year"}
        //                 placeholder={"Year"}
        //                 _selected={selectedYear}
        //                 _options={generateRangeOptions(1980, 2100).map(year => ({
        //                     id: year,
        //                     label: year
        //                 }))}
        //                 onChange={(val) => setSelectedYear(val)}
        //             />
        //         </div>
        //     ),
        //     component: <TransactionGraph type="WEEKLY" labels={getMonthlyLabels(selectedYear, selectedMonth)} transactionData={monthMap[`${selectedYear}-${selectedMonth}`]}/>
        // },
        {
            id: 'monthly',
            label: 'Monthly',
            header: () => (
                <div className="px-3 pt-2 grid grid-cols-2 gap-2">
                    <SelectField
                        name={"month"}
                        placeholder={"Month"}
                        _selected={selectedMonth}
                        _options={MONTHS.map((month, index) => ({
                            id: index,
                            label: month
                        }))} 
                        onChange={(val) => setSelectedMonth(val)}
                    />
                    <SelectField 
                        name={"year"}
                        placeholder={"Year"}
                        _selected={selectedYear}
                        _options={generateRangeOptions(1980, 2100).map(year => ({
                            id: year,
                            label: year
                        }))}
                        onChange={(val) => setSelectedYear(val)}
                    />
                </div>
            ),
            component: <TransactionGraph type="MONTHLY" labels={getMonthlyLabels(selectedYear, selectedMonth)} transactionData={monthMap[`${selectedYear}-${selectedMonth}`]}/>
        },
        {
            id: 'annual',
            label: 'Annual',
            header: () => (
                <div className="px-3 pt-2">
                    <SelectField 
                        name={"year"}
                        _selected={selectedYear}
                        _options={generateRangeOptions(1980, 2100).map(year => ({
                            id: year,
                            label: year
                        }))}
                        onChange={(val) => setSelectedYear(val)}
                    />
                </div>
            ),
            component: <TransactionGraph type="ANNUAL" labels={MONTHS} transactionData={yearMap[selectedYear]}/>
        },
        {
            id: 'all-time',
            label: 'All Time',
            component: <TransactionGraph type="ALLTIME" labels={Object.keys(yearMap)} transactionData={Object.values(yearMap).flat(1)}/>
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!transactions} title="Transaction Report"/>
            <Tab selected={'monthly'} contents={contents}/>
        </div>
    )
}