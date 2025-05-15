'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import ExpenseGraph from "./ExpenseGraph";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SubHeader from "./SubHeader";
import SelectField from "../common/SelectField";
import { MONTHS } from "@/app/_lib/const";
import { generateRangeOptions, getMonthlyLabels } from "@/app/_lib/utils";

export default function ExpenseReport() {
    const expenses = useLiveQuery(() => db.getAllExpenses());

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [monthMap, setMonthMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    useEffect(() => {
        if(expenses) {
            const newMonthMap = {};
            const newYearMap = {};

            expenses.forEach(expense => {
                const date = new Date(expense.date);
                const month = date.getMonth();
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`

                newMonthMap[monthKey] = (newMonthMap[monthKey] || []).concat(expense);
                newYearMap[year] = (newYearMap[year] || []).concat(expense);
            })

            setMonthMap(newMonthMap);
            setYearMap(newYearMap);
        }
    }, [expenses])

    const contents = [
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
            component: <ExpenseGraph type="MONTHLY" labels={getMonthlyLabels(selectedYear, selectedMonth)} expenseData={monthMap[`${selectedYear}-${selectedMonth}`]}/>
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
            component: <ExpenseGraph type="ANNUAL" labels={MONTHS} expenseData={yearMap[selectedYear]}/>
        },
        {
            id: 'all-time',
            label: 'All Time',
            component: <ExpenseGraph type="ALLTIME" labels={Object.keys(yearMap)} expenseData={Object.values(yearMap).flat(1)}/>
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!expenses} title="Expense Report"/>
            <Tab selected={'monthly'} contents={contents}/>
        </div>
    )
}