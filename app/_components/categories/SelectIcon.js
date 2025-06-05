'use client'
import { useState } from "react";
import SearchBar from "../common/Searchbar";
import VirtualizedIconList from "./VirtualizedIconList";
import { icons } from "@/app/_lib/const/icons";

export default function SelectIcon({ onIconSelected }) {
    const [searchText, setSearchText] = useState('');

    const handleIconClicked = (value) => {
        onIconSelected && onIconSelected(value);
    }

    return(
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
    )
}