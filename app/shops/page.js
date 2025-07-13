'use client'
import Layout from "@components/layout/Layout";
import VirtualizedShopList from "@components/shops/VirtualizedShopList";
import { useEffect, useState } from "react";
import { db } from "@lib/db";
import SearchBar from "@components/common/Searchbar";
import Header from "@components/common/Header";
import IconButton from "@components/common/IconButton";
import { IoMdAdd as PlusIcon } from "react-icons/io";
import { useLiveQuery } from "dexie-react-hooks";
import Dialog from "@components/common/Dialog";
import InfoShopForm from "@components/shops/InfoShopForm";

export default function Shops() {
    const PAGE_SIZE = 10;
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [searchText, setSearchText] = useState("");
    const [selectedShop, setSelectedShop] = useState(null);

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

    const handleShopAdd = (shop = null) => {
        setSelectedShop(shop);
        setShowAdd(true);
    }

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
                            <IconButton icon={<PlusIcon size={20}/>} contained onClick={() => handleShopAdd()}/>
                        </div>
                    </div>
                </div>
                <div className="flex grow mb-2">
                    <VirtualizedShopList
                        items={shops}
                        loadMore={fetchMoreData}
                        hasNextPage={shops && shops.length > 0 && shops.length % PAGE_SIZE === 0}
                        onShopClick={handleShopAdd}
                    />
                </div>
                <Dialog
                    show={showAdd}
                    hideFn={() => setShowAdd(false)}
                >
                    <InfoShopForm 
                        shop={selectedShop} 
                        hideFn={() => setShowAdd(false)}
                    />
                </Dialog>
            </div>
        </Layout>
    )
}