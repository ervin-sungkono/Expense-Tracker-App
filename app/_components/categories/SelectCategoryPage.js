'use client'
import { useState } from "react";
import Page from "../common/Page";
import SearchBar from "../common/Searchbar";
import VirtualizedCategoryList from "./VirtualizedCategoryList";

export default function SelectCategoryPage({ show, hideFn, categories, onCategorySelected }) {
    const [searchText, setSearchText] = useState('');

    const handleCategoryClicked = (value) => {
        hideFn && hideFn();
        onCategorySelected && onCategorySelected(value);
    }

    return(
        <Page
            title={"Select Category"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col gap-4">
                <SearchBar
                    placeholder={"Search category"}
                    onSearch={(val) => setSearchText(val.toLowerCase())}
                />
                <div className="grow">
                    <VirtualizedCategoryList
                        items={categories?.filter(category => category.name.toLowerCase().includes(searchText))}
                        onCategoryClicked={handleCategoryClicked}
                    />
                </div>
            </div>
        </Page>
    )
}