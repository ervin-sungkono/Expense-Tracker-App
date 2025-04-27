'use client'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import { generateRandomDistinctColors } from "@/app/_lib/utils";

ChartJS.defaults.font.family = "'Inter', sans-serif"
ChartJS.defaults.font.size = 14;
ChartJS.defaults.font.style = 'normal';
ChartJS.defaults.font.weight = 700;
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpenseChart({ expenseData = [] }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const [labels, setLabels] = useState([])
    const [data, setData] = useState([])

    useEffect(() => {
        if(categories && expenseData.length > 0) {
            const categoriesMap = {};
            const groupCategory = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = categories[i].name;
                groupCategory[categories[i].name] = 0;
            }

            let sumExpenseAmount = 0;
            for(let i = 0; i < expenseData.length; i++) {
                if(expenseData[i].categoryId) groupCategory[categoriesMap[expenseData[i].categoryId]] += expenseData[i].amount;
                sumExpenseAmount += expenseData[i].amount;
            }

            setLabels(Array.from(Object.keys(groupCategory)).map(label => `${label} (${Math.round(groupCategory[label] / sumExpenseAmount * 100)}%)`));
            setData(Array.from(Object.values(groupCategory)));
        }
    }, [categories, expenseData])

    const chartData = {
        labels,
        datasets: [{
            label: 'IDR spent',
            data,
            backgroundColor: generateRandomDistinctColors(labels.length),
            borderWidth: 0
        }]
    }

    const options = {
        responsive: true,
        aspectRatio: 16 / 9,
        layout: {
            padding: {
                top: 16,
                bottom: 16,
                left: 12,
                right: 12
            }
        },
        plugins: {
            legend: {
                labels: {
                    boxWidth: 20
                },
                position: 'right'
            }
        }
    }

    if(expenseData.length === 0) return (
        <div className="flex justify-center items-center h-48 xs:h-64 px-3">
            <p className="text-sm md:text-base text-center text-dark dark:text-white">No expense data found, please create an expense first.</p>
        </div>
    )
    return(
        <div className="flex justify-start items-center h-48 xs:h-64">
            <Doughnut 
                data={chartData}
                options={options}
            />
        </div>
    )
}