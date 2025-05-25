'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import TransactionChart from "./TransactionChart";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SubHeader from "./SubHeader";
import SelectField from "../common/SelectField";
import InputField from "../common/InputField";
import { MONTHS } from "@/app/_lib/const";
import { generateRangeOptions } from "@/app/_lib/utils";

export default function TransactionData() {
    const transactions = useLiveQuery(() => db.getAllTransactions());

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [dateMap, setDateMap] = useState({});
    const [monthMap, setMonthMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    useEffect(() => {
        if(transactions) {
            const newDateMap = {};
            const newMonthMap = {};
            const newYearMap = {};

            transactions.forEach(transaction => {
                const date = new Date(transaction.date);
                const month = date.getMonth();
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`

                newDateMap[transaction.date] = (newDateMap[transaction.date] || []).concat(transaction);
                newMonthMap[monthKey] = (newMonthMap[monthKey] || []).concat(transaction);
                newYearMap[year] = (newYearMap[year] || []).concat(transaction);
            })

            setDateMap(newDateMap);
            setMonthMap(newMonthMap);
            setYearMap(newYearMap);
        }
    }, [transactions])

    const contents = [
        {
            id: 'daily',
            label: 'Daily',
            header: () => (
                <div className="px-3 pt-2">
                    <InputField
                        type={"date"} 
                        defaultValue={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            ),
            component: <TransactionChart transactionData={dateMap[selectedDate]}/>
        },
        {
            id: 'monthly',
            label: 'Monthly',
            header: () => (
                <div className="px-3 pt-2 grid grid-cols-2 gap-2">
                    <SelectField
                        name={"month"}
                        _selected={selectedMonth}
                        _options={MONTHS.map((month, index) => ({
                            id: index,
                            label: month
                        }))} 
                        onChange={(val) => setSelectedMonth(val)}
                    />
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
            component: <TransactionChart transactionData={monthMap[`${selectedYear}-${selectedMonth}`]}/>
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
            component: <TransactionChart transactionData={yearMap[selectedYear]}/>
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!transactions} title="My Transaction" link="/transactions"/>
            <Tab selected={'daily'} contents={contents}/>
        </div>
    )
}