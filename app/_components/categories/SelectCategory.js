'use client'
import { useState, useEffect } from "react";
import SearchBar from "../common/Searchbar";
import VirtualizedCategoryList from "./VirtualizedCategoryList";
import Button from "../common/Button";
import CategoryTab from "./CategoryTab";

export default function SelectCategory({ categories, onCategorySelected, onCancelSelection, defaultType = 'Expense', showTab = false }) {
    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState(defaultType);
    const [categoryData, setCategoryData] = useState(null);

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

    const handleCategoryClicked = (value) => {
        setSelectedType(defaultType);
        onCategorySelected && onCategorySelected(value);
    }

    const handleCancelSelection = () => {
        setSelectedType(defaultType);
        onCancelSelection && onCancelSelection();
    }

    return(
        <div className="grow flex flex-col gap-4">
            {showTab && <CategoryTab selected={selectedType} onChange={(type) => setSelectedType(type)}/>}
            <SearchBar
                placeholder={"Search category"}
                onSearch={(val) => setSearchText(val.toLowerCase())}
            />
            <div className="grow">
                <VirtualizedCategoryList
                    items={categoryData?.[selectedType]?.filter(category => category.name.toLowerCase().includes(searchText))}
                    onCategoryClicked={handleCategoryClicked}
                />
            </div>
            <div className="flex justify-center mt-2">
                <Button style="danger" label={"Cancel Selection"} onClick={handleCancelSelection}/>
            </div>
        </div>
    )
}