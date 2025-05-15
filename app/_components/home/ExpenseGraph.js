'use client'
import { 
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { formatDateString, nFormatter } from "@/app/_lib/utils";
import { MONTHS } from "@/app/_lib/const";

ChartJS.defaults.font.family = "'Inter', sans-serif"
ChartJS.defaults.font.size = 14;
ChartJS.defaults.font.style = 'normal';
ChartJS.defaults.font.weight = 700;
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function ExpenseGraph({ expenseData = [], labels, type = 'MONTHLY' }) {
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState(null); 

    useEffect(() => {
        if(labels && expenseData && expenseData.length > 0) {
            const labelsMap = {}
            labels.forEach(label => labelsMap[label] = 0);
            
            expenseData.forEach(expense => {
                const date = new Date(expense.date);
                const month = date.getMonth();
                const year = date.getFullYear();

                if(type === 'MONTHLY') {
                    labelsMap[formatDateString(date)] += expense.amount;
                } else if(type === 'ANNUAL') {
                    labelsMap[MONTHS[month]] += expense.amount;
                } else if(type === 'ALLTIME') {
                    labelsMap[year] += expense.amount;
                }
            })

            setData(Object.values(labelsMap));
        }
    }, [labels, expenseData, type])

    useEffect(() => {
        if(labels && data) {
            setChartData({
                labels,
                datasets: [{
                    label: 'IDR Spent',
                    data,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgb(255, 99, 132)'
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
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        ticks: {
                            callback: (value) => {
                                return nFormatter(value, 0);
                            }
                        }
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
                <Line 
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