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

    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);

    const [dailyExpense, setDailyExpense] = useState([]);
    const [monthlyExpense, setMonthlyExpense] = useState([]);
    const [annualExpense, setAnnualExpense] = useState([]);

    const filterExpenseByDate = (date) => {
        if(!date) {
            date = new Date();
            setSelectedDate(date.toISOString().split('T')[0]);
        } else if(isNaN(date)) {
            date = new Date(date);
        }

        const isSameDate = (targetDate) => {
            return Math.abs(new Date(targetDate).getTime() - date) < (24 * 60 * 60 * 1000);
        }

        return expenses.filter(expense => isSameDate(expense.date));
    }

    const filterExpenseByMonth = (month) => {
        if(!month) {
            month = new Date().getMonth(); // current month
            setSelectedMonth(month);
        }

        const isSameMonth = (targetDate) => {
            return new Date(targetDate).getMonth() === month && new Date(targetDate).getFullYear() === new Date().getFullYear();
        }

        return expenses.filter(expense => isSameMonth(expense.date));
    }

    const filterExpenseByYear = (year) => {
        if(!year) {
            year = new Date().getFullYear(); // current year
            setSelectedYear(year);
        }

        const isSameYear = (targetDate) => {
            return new Date(targetDate).getFullYear() === year;
        }

        return expenses.filter(expense => isSameYear(expense.date));
    }

    useEffect(() => {
        if(expenses) {
            setDailyExpense(filterExpenseByDate(selectedDate));
            setMonthlyExpense(filterExpenseByMonth(selectedMonth));
            setAnnualExpense(filterExpenseByYear(selectedYear));
        }
    }, [expenses])

    useEffect(() => {
        if(selectedDate) setDailyExpense(filterExpenseByDate(selectedDate));
    }, [selectedDate])

    useEffect(() => {
        if(selectedMonth) setMonthlyExpense(filterExpenseByMonth(selectedMonth));
    }, [selectedMonth])

    useEffect(() => {
        if(selectedYear) setAnnualExpense(filterExpenseByYear(selectedYear));
    }, [selectedYear])

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
                <div className="px-3">
                    <SelectField 
                        _selected={{id: selectedMonth, label: MONTHS[selectedMonth]}} 
                        _options={MONTHS.map((month, index) => ({
                            id: index,
                            label: month
                        }))} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
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
                        _selected={{id: selectedYear, label: selectedYear}} 
                        _options={generateRangeOptions(1900, 2100).map(year => ({
                            id: year,
                            label: year
                        }))}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    />
                </div>
            ),
            component: <ExpenseChart expenseData={annualExpense}/>
        }
    ]

    return(
        <div>
            <SubHeader title="My Expense" link="/expenses"/>
            <Tab selected={'daily'} contents={contents}>
                
            </Tab>
        </div>
    )
}