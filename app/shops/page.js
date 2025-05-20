'use client'
import Layout from "../_components/layout/Layout";
import VirtualizedShopList from "../_components/shops/VirtualizedShopList";
import { useEffect, useState } from "react";
import { db } from "../_lib/db";
import SearchBar from "../_components/common/Searchbar";
import Header from "../_components/common/Header";
import IconButton from "../_components/common/IconButton";
import { IoMdAdd as PlusIcon } from "react-icons/io";
import { useLiveQuery } from "dexie-react-hooks";
import InfoShopDialog from "../_components/shops/InfoShopDialog";

export default function Shops() {
    const PAGE_SIZE = 10;
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [searchText, setSearchText] = useState("");

    const shops = useLiveQuery(
        () => db.getPaginatedShops(limit, searchText), 
        [limit, searchText]
    )
    
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => {        
        setLimit(PAGE_SIZE); // Refresh search
    }, [searchText])

    const fetchMoreData = async() => {
        setLimit(currentLimit => currentLimit + PAGE_SIZE);
    };

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
                        hasNextPage={shops && shops.length > 0 && shops.length % PAGE_SIZE === 0}
                    />
                </div>
                <InfoShopDialog
                    show={showAdd}
                    hideFn={() => setShowAdd(false)}
                />
            </div>
        </Layout>
    )
}