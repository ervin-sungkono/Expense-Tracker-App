'use client'
import { useLiveQuery } from "dexie-react-hooks"
import SwiperContainer from "../common/SwiperContainer"
import SubHeader from "./SubHeader"
import { db } from "@/app/_lib/db"
import { useEffect, useState } from "react"
import ShopCard from "./ShopCard"

export default function ShopsCarousel() {
    const [shopData, setShopData] = useState([]);
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

            setShopData(Object.entries(shopsMap).map(([key, value]) => { 
                const shop = shops.find(shop => shop.id == key);

                return {
                    totalVisit: value.count,
                    averageExpense: value.count > 0 ? Math.round(value.amount / value.count) : 0,
                    ...shop
                }
            }));
        }
    }, [expenses, shops])

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