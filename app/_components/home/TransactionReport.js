'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import TransactionGraph from "./TransactionGraph";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SubHeader from "./SubHeader";
import SelectField from "../common/SelectField";
import { MONTHS } from "@/app/_lib/const";
import { getMonthlyLabels, getWeeks } from "@/app/_lib/utils";

export default function TransactionReport() {
    const transactions = useLiveQuery(() => db.getAllTransactions());
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const [weeks, setWeeks] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [weekOptions, setWeekOptions] = useState(null);
    const [yearOptions, setYearOptions] = useState(null);

    const [monthMap, setMonthMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    useEffect(() => {
        const years = Object.keys(yearMap);
        if(years.length > 0) {
            setYearOptions(years.map(year => ({
                id: Number(year),
                label: year
            })))
        }
    }, [yearMap])

    useEffect(() => {
        if(selectedMonth && selectedYear) {
            const _weeks = getWeeks(selectedMonth, selectedYear);

            setWeeks(_weeks);
            setWeekOptions(_weeks?.map((_, index) => ({ id: index, label: `Week ${index + 1}` })));
        }
    }, [selectedMonth, selectedYear])

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
        {
            id: 'weekly',
            label: 'Weekly',
            header: () => (
                <div className="px-3 pt-2 grid grid-cols-3 gap-2">
                    {weekOptions ? 
                    <SelectField
                        name={"week"}
                        placeholder={"Week"}
                        _selected={selectedWeek}
                        _options={weekOptions}
                        onChange={(val) => setSelectedWeek(val)}
                    /> :
                    <div className="w-full h-full rounded-md bg-neutral-300 dark:bg-neutral-600 animate-pulse"></div>}
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
                    {yearOptions ? <SelectField 
                        name={"year"}
                        placeholder={"Year"}
                        _selected={selectedYear}
                        _options={yearOptions}
                        onChange={(val) => setSelectedYear(val)}
                    /> :
                    <div className="w-full h-full rounded-md bg-neutral-300 dark:bg-neutral-600 animate-pulse"></div>}
                </div>
            ),
            component: <TransactionGraph 
                type="WEEKLY" 
                labels={getMonthlyLabels(selectedYear, selectedMonth)} 
                transactionData={monthMap[`${selectedYear}-${selectedMonth}`]}
                title={`Week_${selectedWeek + 1}_${MONTHS[selectedMonth]}_${selectedYear}`}
            />
        },
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
                    {yearOptions ? <SelectField 
                        name={"year"}
                        placeholder={"Year"}
                        _selected={selectedYear}
                        _options={yearOptions}
                        onChange={(val) => setSelectedYear(val)}
                    /> :
                    <div className="w-full h-full rounded-md bg-neutral-300 dark:bg-neutral-600 animate-pulse"></div>}
                </div>
            ),
            component: <TransactionGraph 
                type="MONTHLY" 
                labels={getMonthlyLabels(selectedYear, selectedMonth)} 
                transactionData={monthMap[`${selectedYear}-${selectedMonth}`]} 
                title={`${MONTHS[selectedMonth]}_${selectedYear}`}
            />
        },
        {
            id: 'annual',
            label: 'Annual',
            header: () => (
                <div className="px-3 pt-2">
                    {yearOptions && <SelectField 
                        name={"year"}
                        _selected={selectedYear}
                        _options={yearOptions}
                        onChange={(val) => setSelectedYear(val)}
                    />}
                </div>
            ),
            component: <TransactionGraph 
                type="ANNUAL" 
                labels={MONTHS} 
                transactionData={yearMap[selectedYear]} 
                title={`${selectedYear}`}
            />
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!transactions} title="Transaction Report"/>
            <Tab selected={'weekly'} contents={contents}/>
        </div>
    )
}