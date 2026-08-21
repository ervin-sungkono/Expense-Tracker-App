'use client'
import { useLiveQuery } from "dexie-react-hooks"
import SwiperContainer from "../common/SwiperContainer"
import SubHeader from "./SubHeader"
import { db } from "@lib/db"
import { useEffect, useState } from "react"
import ShopCard from "./ShopCard"
import LinkButton from "../common/LinkButton"

export default function ShopsCarousel() {
    const [shopData, setShopData] = useState(null);
    const transactions = useLiveQuery(() => db.getMonthTransactions());
    const shops = useLiveQuery(() => db.getAllShops());

    useEffect(() => {
        if(transactions && shops) {
            const shopsMap = {};
            for(let i = 0; i < shops.length; i++) {
                shopsMap[shops[i].id] = {
                    ...shops[i],
                    count: 0,
                    amount: 0
                };
            }

            for(let i = 0; i < transactions.length; i++) {
                if(transactions[i].shopId) { 
                    shopsMap[transactions[i].shopId].count++;
                    shopsMap[transactions[i].shopId].amount += Number(transactions[i].amount);
                }
            }

            setShopData([...Object.values(shopsMap).map((value) => { 
                return {
                    ...value,
                    totalVisit: value.count,
                    averageTransaction: value.count > 0 ? Math.round(value.amount / value.count) : 0,
                }
            })]);
        }
    }, [transactions, shops])

    if(!shopData) {
        return (
            <div className="mb-4">
                <SubHeader title="Shops" description={"based on this month's visits"} link="/shops" loading/>
                <div className="h-56 w-screen bg-neutral-300 dark:bg-neutral-800 animate-pulse rounded-lg"></div>
            </div>
        )
    }
    return(
        <div className="mb-4">
            <SubHeader title="Shops" description={"based on this month's visits"} link="/shops"/>
            {shopData.length > 0 ?
            <SwiperContainer 
                spaceBetween={12}
                slidesPerView={1.8}
                items={shopData?.sort((a,b) => b.totalVisit - a.totalVisit).map(shop => ({
                    id: shop.name,
                    component: <ShopCard {...shop}/>
                }))}
            /> :
            <div className="h-40 flex flex-col justify-center items-center gap-4 w-full bg-light dark:bg-neutral-800 rounded-lg py-6 px-4">
                <p className="text-sm md:text-base text-center font-medium text-dark/80 dark:text-white/80">No shop found, please create a new shop</p>
                <LinkButton href="/shops" label="Add New Shop" contained/>
            </div>}
        </div>
    )
}