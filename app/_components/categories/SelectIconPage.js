'use client'
import { useEffect, useState } from "react";
import Page from "../common/Page";
import SearchBar from "../common/Searchbar";
import VirtualizedIconList from "./VirtualizedIconList";

export default function SelectIconPage({ show, hideFn, onIconSelected }) {
    const [icons, setIcons] = useState(null);
    const [searchText, setSearchText] = useState('');

    const handleIconClicked = (value) => {
        hideFn && hideFn();
        onIconSelected && onIconSelected(value);
    }
    
    const loadIconData = () => {
        fetch("./icons.json")
            .then(res => res.json())
            .then(data => setIcons(data))
            .catch(error => console.log(error))
    }

    useEffect(() => {
        loadIconData()
    }, [])

    return(
        <Page
            title={"Icon List"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col gap-4">
                <SearchBar
                    placeholder={"Search icon"}
                    onSearch={(val) => setSearchText(val.toLowerCase())}
                />
                <div className="grow">
                    <VirtualizedIconList
                        items={icons?.filter(icon => icon.toLowerCase().includes(searchText))}
                        onIconClicked={handleIconClicked}
                    />
                </div>
            </div>
        </Page>
    )
}