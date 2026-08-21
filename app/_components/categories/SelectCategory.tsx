'use client'
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import VirtualizedCategoryList from "./VirtualizedCategoryList";
import Button from "../common/Button";

const CategoryTab = dynamic(() => import('./CategoryTab'));
const SearchBar = dynamic(() => import('../common/Searchbar'));

export default function SelectCategory({ categories, onCategorySelected, onCancelSelection, defaultType = 'Expense', showTab = false, showSearch = false, hideCancelButton = false, excludedTabs }) {
    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState(defaultType);
    const [categoryData, setCategoryData] = useState(null);
    const categoryRef = useRef(null);

    useEffect(() => {
        if(categories) {
            const result = {
                'Expense': {},
                'Income': {},
                'DebtLoan': {}
            }
            
            categories.forEach(category => {
                if(!category.parentId) {
                    result[category.type][category.id] = {
                        ...category,
                        data: result[category.type][category.id]?.data ?? []
                    }
                } else {
                    if(!result[category.type][category.parentId]) {
                        result[category.type][category.parentId] = {
                            data: [category]
                        }
                    } else {
                        result[category.type][category.parentId].data.push(category);
                    }
                }
            })
            
            const types = Object.keys(result);
            types.forEach(type => {
                result[type] = Object.values(result[type]);
            })

            setCategoryData(result);
        }
    }, [categories])

    useEffect(() => {
        if(categoryData && categoryData[selectedType]) {
            console.log('TRIGGER ITEM SIZE RECOMPUTE');
            categoryRef.current?.resetAfterIndex(0);
            categoryRef.current?.scrollToItem(0);
        }
    }, [categoryData, selectedType])

    const handleCategoryClicked = (value) => {
        setSelectedType(defaultType);
        onCategorySelected && onCategorySelected(value);
    }

    const handleCancelSelection = () => {
        setSelectedType(defaultType);
        onCancelSelection && onCancelSelection();
    }

    return(
        <div className="grow flex flex-col gap-2">
            {showTab && <CategoryTab selected={selectedType} onChange={(type) => setSelectedType(type)} excluded={excludedTabs}/>}
            {showSearch && <SearchBar
                placeholder={"Search category"}
                onSearch={(val) => setSearchText(val.toLowerCase())}
            />}
            <div className="grow">
                <VirtualizedCategoryList
                    ref={categoryRef}
                    items={categoryData?.[selectedType]?.filter(category => category.name.toLowerCase().includes(searchText))}
                    onCategoryClicked={handleCategoryClicked}
                />
            </div>
            {!hideCancelButton && 
            <div className="flex justify-center mt-2">
                <Button style="danger" label={"Cancel Selection"} onClick={handleCancelSelection}/>
            </div>}
        </div>
    )
}