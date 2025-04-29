'use client'
import { useLiveQuery } from "dexie-react-hooks"
import SwiperContainer from "../common/SwiperContainer"
import SubHeader from "./SubHeader"
import { db } from "@/app/_lib/db"
import { useEffect, useState } from "react"
import CategoryCard from "./CategoryCard"

export default function CategoriesCarousel() {
    const [categoryData, setCategoryData] = useState([]);
    const expenses = useLiveQuery(() => db.getAllExpenses());
    const categories = useLiveQuery(() => db.getAllCategories());

    const filterExpenseByMonth = (month) => {
        if(!month) {
            month = new Date().getMonth(); // current month
        }

        const isSameMonth = (targetDate) => {
            return new Date(targetDate).getMonth() === month && new Date(targetDate).getFullYear() === new Date().getFullYear();
        }

        return expenses.filter(expense => isSameMonth(expense.date));
    }

    useEffect(() => {
        if(expenses && categories) {
            const filteredExpenses = filterExpenseByMonth();
            const categoriesMap = {};
            const groupCategory = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = categories[i].name;
                groupCategory[categories[i].name] = 0;
            }

            let sumExpenseAmount = 0;
            for(let i = 0; i < filteredExpenses.length; i++) {
                if(filteredExpenses[i].categoryId) groupCategory[categoriesMap[filteredExpenses[i].categoryId]] += filteredExpenses[i].amount;
                sumExpenseAmount += filteredExpenses[i].amount;
            }

            setCategoryData(Object.entries(groupCategory).map(([key, value]) => ({ name: key, totalExpense: value })));
        }
    }, [expenses, categories])

    return(
        <div className="mb-4">
            <SubHeader title="Categories" description={"based on this month's expense"} link="/categories"/>
            <SwiperContainer 
                spaceBetween={12}
                slidesPerView={1.8}
                items={categoryData?.sort((a,b) => b.totalExpense - a.totalExpense).map(category => ({
                    id: category.name,
                    component: <CategoryCard {...category}/>
                }))}
            />
        </div>
    )
}