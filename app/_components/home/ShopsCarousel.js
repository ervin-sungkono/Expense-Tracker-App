'use client'
import { useLiveQuery } from "dexie-react-hooks"
import SwiperContainer from "../common/SwiperContainer"
import SubHeader from "./SubHeader"
import { db } from "@/app/_lib/db"
import { useEffect, useState } from "react"
import ShopCard from "./ShopCard"

export default function ShopsCarousel() {
    const [shopData, setShopData] = useState(null);
    const expenses = useLiveQuery(() => db.getAllExpenses());
    const shops = useLiveQuery(() => db.getAllShops());

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
        if(expenses && shops) {
            const filteredExpenses = filterExpenseByMonth();
            const shopsMap = {};
            for(let i = 0; i < shops.length; i++) {
                shopsMap[shops[i].id] = {
                    ...shops[i],
                    count: 0,
                    amount: 0
                };
            }

            for(let i = 0; i < filteredExpenses.length; i++) {
                if(filteredExpenses[i].shopId) { 
                    shopsMap[filteredExpenses[i].shopId].count++;
                    shopsMap[filteredExpenses[i].shopId].amount += filteredExpenses[i].amount;
                }
            }

            setShopData(Object.values(shopsMap).map((value) => { 
                return {
                    ...value,
                    totalVisit: value.count,
                    averageExpense: value.count > 0 ? Math.round(value.amount / value.count) : 0,
                }
            }));
        }
    }, [expenses, shops])

    if(!shopData) {
        return (
            <div className="mb-4">
                <SubHeader title="Shops" description={"based on this month's visits"} link="/shops" loading/>
                <div className="h-56 w-screen bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg"></div>
            </div>
        )
    } else {
        return(
            <div className="mb-4">
                <SubHeader title="Shops" description={"based on this month's visits"} link="/shops"/>
                <SwiperContainer 
                    spaceBetween={12}
                    slidesPerView={1.8}
                    items={shopData?.sort((a,b) => b.totalVisit - a.totalVisit).map(shop => ({
                        id: shop.name,
                        component: <ShopCard {...shop}/>
                    }))}
                />
            </div>
        )
    }
}