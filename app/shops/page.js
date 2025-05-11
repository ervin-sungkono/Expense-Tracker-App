'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedShopList from "../_components/shops/VirtualizedShopList";
import { useEffect, useState } from "react";
import { db } from "../_lib/db";
import { liveQuery } from "dexie";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import { IoMdAdd as PlusIcon } from "react-icons/io";

export default function Shops() {
    const PAGE_SIZE = 10;
    const createLiveQuery = (pageIndex) => liveQuery(
        () => db.getPaginatedShops(
            pageIndex, 
            PAGE_SIZE, 
            searchText
        )
    );
    const [liveQueries, setLiveQueries] = useState([createLiveQuery(0)]);
    const [resultArrays, setResultArrays] = useState([]);
    const [shops, setShops] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {
        const subscriptions = liveQueries.map((q, i) => q.subscribe(
            results => setResultArrays(resultArrays => {
              const arrayClone = [...resultArrays];
              arrayClone[i] = results;
              return arrayClone;
            })
        ));
        return () => {
            for (const s of subscriptions) {
                s.unsubscribe();
            }
        };
    }, [liveQueries])

    useEffect(() => {        
        setLiveQueries([createLiveQuery(0)]);
        setResultArrays([]);
    }, [searchText])

    const fetchMoreData = async() => {
        const nextPageIndex = liveQueries.length;
        setLiveQueries(currentLiveQueries => [...currentLiveQueries, createLiveQuery(nextPageIndex)])
    };

    useEffect(() => {
        if(resultArrays) setShops(resultArrays.flat(1))
    }, [resultArrays])

    return(
        <Layout pathname={"/shops"}>
            <div className="h-full flex flex-col">
                <div className="mb-4">
                    <Header title={"Shop List"} textAlign="center"/>
                    <div className="flex items-center gap-2">
                        <SearchBar
                            placeholder={"Search based on name"}
                            onSearch={(value) => setSearchText(value.toLowerCase())}
                        />
                        <div className="relative z-0">
                            <IconButton icon={<PlusIcon size={20}/>} contained onClick={() => setShowAdd(!showAdd)}/>
                        </div>
                    </div>
                </div>
                <div className="flex grow">
                    <VirtualizedShopList
                        items={shops}
                        loadMore={fetchMoreData}
                        hasNextPage={resultArrays.at(-1)?.length === PAGE_SIZE}
                    />
                </div>
            </div>
        </Layout>
    )
}