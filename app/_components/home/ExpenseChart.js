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

export default function ExpenseChart({ expenseData }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const [labels, setLabels] = useState(null);
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState(null);

    useEffect(() => {
        if(categories && expenseData && expenseData.length > 0) {
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

            setLabels(Object.keys(groupCategory).map(label => `${label} (${Math.round(groupCategory[label] / sumExpenseAmount * 100)}%)`));
            setData(Object.values(groupCategory));
        }
    }, [categories, expenseData])

    useEffect(() => {
        if(labels && data) {
            setChartData({
                labels,
                datasets: [{
                    label: 'IDR spent',
                    data,
                    backgroundColor: generateRandomDistinctColors(labels.length),
                    borderWidth: 0
                }]
            });
            setChartOptions({
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
            });
        }
    }, [labels, data])

    if(expenseData && expenseData.length === 0) return (
        <div className="flex justify-center items-center h-48 xs:h-64 px-3 py-4">
            <p className="text-sm md:text-base text-center text-dark dark:text-white">No expense data found, please create an expense first.</p>
        </div>
    )
    return(
        <div className="flex justify-start items-center h-48 xs:h-64">
            {
                (chartData && chartOptions) ? 
                <Doughnut 
                    data={chartData}
                    options={chartOptions}
                /> :
                <div className="w-full h-full px-3 py-4">
                    <div className="w-full h-full rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
                </div>
            }
        </div>
    )
}