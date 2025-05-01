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

    const [dailyExpense, setDailyExpense] = useState(null);
    const [monthlyExpense, setMonthlyExpense] = useState(null);
    const [annualExpense, setAnnualExpense] = useState(null);

    const filterExpenseByDate = (date) => {
        const isSameDate = (targetDate) => {
            return Math.abs(new Date(targetDate).getTime() - date) < (24 * 60 * 60 * 1000);
        }

        return expenses.filter(expense => isSameDate(expense.date));
    }

    const filterExpenseByMonth = (month, year) => {
        const isSameMonth = (targetDate) => {
            return new Date(targetDate).getMonth() === month && new Date(targetDate).getFullYear() === selectedYear;
        }

        return expenses.filter(expense => isSameMonth(expense.date));
    }

    const filterExpenseByYear = (year) => {
        const isSameYear = (targetDate) => {
            return new Date(targetDate).getFullYear() === year;
        }

        return expenses.filter(expense => isSameYear(expense.date));
    }

    useEffect(() => {
        if(expenses && selectedDate) {
            setDailyExpense(filterExpenseByDate(selectedDate));
        }
    }, [expenses, selectedDate])

    useEffect(() => {
        if(expenses && selectedMonth && selectedYear) {
            setMonthlyExpense(filterExpenseByMonth(selectedMonth, selectedYear));
        }
    }, [expenses, selectedMonth, selectedYear])

    useEffect(() => {
        if(expenses && selectedYear) {
            setAnnualExpense(filterExpenseByYear(selectedYear));
        }
    }, [expenses, selectedYear])

    const contents = [
        {
            id: 'daily',
            label: 'Daily',
            header: () => (
                <div className="px-3">
                    <InputField
                        type={"date"} 
                        defaultValue={new Date().toISOString().split('T')[0]} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                </div>
            ),
            component: <ExpenseChart expenseData={dailyExpense}/>
        },
        {
            id: 'monthly',
            label: 'Monthly',
            header: () => (
                <div className="px-3 grid grid-cols-2 gap-2">
                    <SelectField
                        name={"month"}
                        _selected={{id: selectedMonth, label: MONTHS[selectedMonth]}}
                        _options={MONTHS.map((month, index) => ({
                            id: index,
                            label: month
                        }))} 
                        onChange={(val) => setSelectedMonth(val)}
                    />
                    <SelectField 
                        name={"year"}
                        _selected={{id: selectedYear, label: selectedYear}}
                        _options={generateRangeOptions(1980, 2100).map(year => ({
                            id: year,
                            label: year
                        }))}
                        onChange={(val) => setSelectedYear(val)}
                    />
                </div>
            ),
            component: <ExpenseChart expenseData={monthlyExpense}/>
        },
        {
            id: 'annual',
            label: 'Annual',
            header: () => (
                <div className="px-3">
                    <SelectField 
                        name={"year"}
                        _selected={{id: selectedYear, label: selectedYear}}
                        _options={generateRangeOptions(1980, 2100).map(year => ({
                            id: year,
                            label: year
                        }))}
                        onChange={(val) => setSelectedYear(val)}
                    />
                </div>
            ),
            component: <ExpenseChart expenseData={annualExpense}/>
        }
    ]

    return(
        <div className="mb-4">
            <SubHeader loading={!dailyExpense} title="My Expense" link="/expenses"/>
            <Tab selected={'daily'} contents={contents}/>
        </div>
    )
}