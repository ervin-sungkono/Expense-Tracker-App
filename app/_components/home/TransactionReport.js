'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import TransactionGraph from "./TransactionGraph";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SelectField from "../common/SelectField";
import { MONTHS } from "@/app/_lib/const";
import { getMonthlyLabels, getWeeklyLabels, getWeekNumber, getWeekRanges } from "@/app/_lib/utils";

export default function TransactionReport() {
    const transactions = useLiveQuery(() => db.getAllTransactions());
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());
    
    const [selectedWeek, setSelectedWeek] = useState(getWeekNumber(new Date));
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [weeks, setWeeks] = useState(null);
    const [weekOptions, setWeekOptions] = useState(null);
    const [yearOptions, setYearOptions] = useState(null);

    const [weekMap, setWeekMap] = useState(null);
    const [monthMap, setMonthMap] = useState(null);
    const [yearMap, setYearMap] = useState(null);

    const [selectedType, setSelectedType] = useState('Expense');

    const getMonthKey = (year, month) => {
        return `${year}-${month}`;
    }

    const getWeekKey = (year, week) => {
        return `${year}W${week}`;
    }

    const getPreviousMonthKey = (year, month) => {
        const date = new Date(year, month);
        date.setMonth(date.getMonth() - 1);

        return getMonthKey(date.getFullYear(), date.getMonth());
    }

    const getPreviousWeekKey = (year, week) => {
        if(week > 1) {
            return getWeekKey(year, week - 1);
        }

        // Since the week is not stored, this means there will be no data to return. Just return default 53 value
        const lastYearWeekCount = weeks[year - 1]?.length ?? 53; 
        return getWeekKey(year - 1, lastYearWeekCount);
    }

    const getPreviousWeek = (year, week) => {
        if(week > 1) {
            return weeks?.[year]?.[week - 2];
        }

        // Since the week is not stored, this means there will be no data to return. Just return default 53 value
        const lastYearWeekCount = weeks[year - 1]?.length ?? 53; 
        return weeks?.[year - 1]?.[lastYearWeekCount - 1];
    }

    useEffect(() => {
        if(yearMap) {
            const yearList = Object.keys(yearMap);
            const years = yearList.length > 0 ? yearList : [`${new Date().getFullYear()}`];
            setYearOptions(years.map(year => ({
                id: Number(year),
                label: year
            })))
            
            const newWeeks = years.reduce(
                (acc, year) => {
                    acc[year] = getWeekRanges(Number(year)).map(weekRange => ({
                        labels: getWeeklyLabels(weekRange),
                        ...weekRange
                    }))
                    return acc;
                }
            , {});
            setWeeks(newWeeks);
        }
    }, [yearMap])

    useEffect(() => {
        if(selectedYear && weeks) {
            setWeekOptions(weeks[selectedYear]
                .map((_, index) => ({ 
                    id: index + 1, 
                    label: `Week ${index + 1}`
                }))
            );
        }
    }, [selectedYear, weeks])

    useEffect(() => {
        if(transactions && categories && shops) {
            const newWeekMap = {};
            const newMonthMap = {};
            const newYearMap = {};
            const categoriesMap = new Map(categories.map(category => [String(category.id), category.name]));
            const shopsMap = new Map(shops.map(shop => [String(shop.id), shop.name]));

            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const month = date.getMonth();
                const year = date.getFullYear();
                const week = getWeekNumber(date, year);
                const weekKey = `${year}W${week}`;
                const monthKey = `${year}-${month}`

                transaction.category = categoriesMap.get(transaction.categoryId);
                transaction.shop = transaction.shopId ? shopsMap.get(transaction.shopId) : '';

                if(!newWeekMap[weekKey]) {
                    newWeekMap[weekKey] = {
                        'Income': [],
                        'Expense': []
                    }
                }

                if(!newMonthMap[monthKey]) {
                    newMonthMap[monthKey] = {
                        'Income': [],
                        'Expense': []
                    }
                }
                if(!newYearMap[year]) {
                    newYearMap[year] = {
                        'Income': [],
                        'Expense': []
                    }
                }

                newWeekMap[weekKey][transaction.type].push(transaction);
                newMonthMap[monthKey][transaction.type].push(transaction);
                newYearMap[year][transaction.type].push(transaction);
            })

            setWeekMap(newWeekMap);
            setMonthMap(newMonthMap);
            setYearMap(newYearMap);
        }
    }, [transactions, categories, shops])

    const contents = [
        {
            id: 'weekly',
            label: 'Weekly',
            header: () => (
                <div className="px-3 pt-2 grid grid-cols-2 gap-2">
                    {weekOptions ? 
                    <SelectField
                        name={"week"}
                        placeholder={"Week"}
                        _selected={selectedWeek}
                        _options={weekOptions}
                        onChange={(val) => setSelectedWeek(val)}
                    /> :
                    <div className="w-full h-9 md:h-10 rounded-md bg-neutral-300 dark:bg-neutral-800 animate-pulse"></div>}
                    {yearOptions ? <SelectField 
                        name={"year"}
                        placeholder={"Year"}
                        _selected={selectedYear}
                        _options={yearOptions}
                        onChange={(val) => setSelectedYear(val)}
                    /> :
                    <div className="w-full h-9 md:h-10 rounded-md bg-neutral-300 dark:bg-neutral-800 animate-pulse"></div>}
                </div>
            ),
            component: <TransactionGraph 
                type="WEEKLY"
                labels={(weeks && weeks[selectedYear]?.[selectedWeek - 1]?.labels)}
                historyLabels={(weeks && getPreviousWeek(selectedYear, selectedWeek)?.labels)} 
                transactionData={weekMap && weekMap[getWeekKey(selectedYear, selectedWeek)]?.[selectedType]}
                historyTransactionData={weekMap && weekMap[`${getPreviousWeekKey(selectedYear, selectedWeek)}`]?.[selectedType]}
                title={`WEEK_${selectedWeek}_${selectedYear}`}
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
                historyLabels={getMonthlyLabels(selectedYear, selectedMonth - 1)}
                transactionData={monthMap && monthMap[getMonthKey(selectedYear, selectedMonth)]?.[selectedType]}
                historyTransactionData={monthMap && monthMap[`${getPreviousMonthKey(selectedYear, selectedMonth)}`]?.[selectedType]}
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
                historyLabels={MONTHS}
                transactionData={yearMap && yearMap[selectedYear]?.[selectedType]}
                historyTransactionData={yearMap && yearMap[selectedYear - 1]?.[selectedType]} 
                title={`${selectedYear}`}
            />
        }
    ]

    return(
        <div className="mb-4">
            <Tab selected={'weekly'} contents={contents}/>
        </div>
    )
}