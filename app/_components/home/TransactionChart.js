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

export default function TransactionChart({ transactionData = [] }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const [labels, setLabels] = useState(null);
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState(null);
    const [maxData, setMaxData] = useState(6);

    useEffect(() => {
        if(categories && transactionData && transactionData.length > 0) {
            const categoriesMap = {};
            const groupCategory = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = categories[i].name;
                groupCategory[categories[i].name] = 0;
            }

            let sumTransactionAmount = 0;
            for(let i = 0; i < transactionData.length; i++) {
                if(transactionData[i].categoryId) groupCategory[categoriesMap[transactionData[i].categoryId]] += transactionData[i].amount;
                sumTransactionAmount += transactionData[i].amount;
            }

            const result = Object.entries(groupCategory)
                .map(([key, value]) => ({key, value}))
                .sort((a,b) => b.value - a.value);

            // no need to trim because category length is lesser than maxData
            if(result.length <= maxData) {
                setLabels(result.map(r => r.key));
                setData(result.map(r => r.value));
            } else {
                const otherSum = result.slice(maxData).reduce((sum, acc) => sum += acc.value, 0);
                setLabels([...result.map(r => r.key).slice(0, maxData - 1), 'Others']);
                setData([...result.map(r => r.value).slice(0, maxData - 1), otherSum]);
            }
        }
    }, [categories, transactionData, maxData])

    useEffect(() => {
        const handleResize = () => {
            if(window.matchMedia("(min-width: 600px)").matches) {
                setMaxData(16);
            } else if(window.matchMedia("(min-width: 480px)").matches) {
                setMaxData(8);
            } else {
                setMaxData(6);
            }
        }

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        }
    }, [])

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
                maintainAspectRatio: false,
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
                            usePointStyle: true,
                            textAlign: 'left'
                        },
                        position: 'right',
                        maxWidth: ({chart}) => chart.width * 0.9
                    }
                }
            });
        }
    }, [labels, data, maxData])

    if(transactionData && transactionData.length === 0) return (
        <div className="flex justify-center items-center h-48 xs:h-64 px-3 py-4">
            <p className="text-sm md:text-base text-center text-dark dark:text-white">No transaction data found, please create an transaction first.</p>
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
                    <div className="w-full h-full rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse"></div>
                </div>
            }
        </div>
    )
}