'use client'
import { useLiveQuery } from "dexie-react-hooks";
import Tab from "../common/Tab";
import ExpenseChart from "./ExpenseChart";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import SubHeader from "./SubHeader";
import SelectField from "../common/SelectField";
import InputField from "../common/InputField";
import { MONTHS } from "@/app/_lib/const";
import { generateRangeOptions } from "@/app/_lib/utils";

export default function ExpenseData() {
    const expenses = useLiveQuery(() => db.getAllExpenses());

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [dateMap, setDateMap] = useState({});
    const [monthMap, setMonthMap] = useState({});
    const [yearMap, setYearMap] = useState({});

    useEffect(() => {
        if(expenses) {
            const newDateMap = {};
            const newMonthMap = {};
            const newYearMap = {};

            expenses.forEach(expense => {
                const date = new Date(expense.date);
                const month = date.getMonth();
                const year = date.getFullYear();
                const monthKey = `${year}-${month}`

                newDateMap[expense.date] = (newDateMap[expense.date] || []).concat(expense);
                newMonthMap[monthKey] = (newMonthMap[monthKey] || []).concat(expense);
                newYearMap[year] = (newYearMap[year] || []).concat(expense);
            })

            setDateMap(newDateMap);
            setMonthMap(newMonthMap);
            setYearMap(newYearMap);
        }
    }, [expenses])

    const contents = [
        {
            id: 'daily',
            label: 'Daily',
            header: () => (
                <div className="px-3 pt-2">
                    <InputField
                        type={"date"} 
                        defaultValue={new Date().toISOString().split('T')[0]} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            ),
            component: <ExpenseChart expenseData={dateMap[selectedDate]}/>
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
            component: <ExpenseChart expenseData={monthMap[`${selectedYear}-${selectedMonth}`]}/>
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
            component: <ExpenseChart expenseData={yearMap[selectedYear]}/>
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!expenses} title="My Expense" link="/expenses"/>
            <Tab selected={'daily'} contents={contents}/>
        </div>
    )
}