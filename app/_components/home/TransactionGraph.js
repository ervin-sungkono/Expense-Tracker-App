'use client'
import { 
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { formatCurrency, formatDateString, nFormatter } from "@/app/_lib/utils";
import { MONTHS } from "@/app/_lib/const";
import Button from "../common/Button";
import xlsx from "json-as-xlsx";

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
    Legend,
    Filler
);

export default function TransactionGraph({ transactionData = [], labels, type = 'MONTHLY', title = '' }) {
    const [data, setData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [chartOptions, setChartOptions] = useState(null);
    const [totalTransaction, setTotalTransaction] = useState(0);

    const handleDownloadReport = () => {
        const sum = transactionData.reduce((sum, curr) => {
            return sum += Number(curr.amount);
        }, 0);

        const data = [
            {
                sheet: 'Transaction',
                columns: [
                    { label: "Date", value: "date", format: "dd-mmm-yy" },
                    { label: "Category", value: "category" },
                    { label: "Amount", value: "amount", format: "Rp#.##0;-Rp#.##0" },
                    { label: "Shop", value: "shop" },
                    { label: "Notes", value: "remarks" }
                ],
                content: [
                    ...transactionData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                    { date: '', category: 'Total', amount: sum, shop: '' }
                ]
            }
        ]

        const settings = {
            fileName: `transaction_report-${title}`,
            extraLength: 3,
            writeMode: 'writeFile'
        }

        // const callback = () => {
        //     console.log('Download complete');
        // }

        xlsx(data, settings);
    }

    useEffect(() => {
        if(labels && transactionData && transactionData.length > 0) {
            const labelsMap = {}
            labels.forEach(label => labelsMap[label] = 0);
            
            let totalTransaction = 0;
            transactionData.forEach(transaction => {
                const date = new Date(transaction.date);
                const month = date.getMonth();
                const year = date.getFullYear();

                if(type === 'MONTHLY') {
                    labelsMap[formatDateString(date)] += transaction.amount;
                } else if(type === 'ANNUAL') {
                    labelsMap[MONTHS[month]] += transaction.amount;
                } else if(type === 'ALLTIME') {
                    labelsMap[year] += transaction.amount;
                }

                totalTransaction += transaction.amount;
            })

            setData(Object.values(labelsMap));
            setTotalTransaction(totalTransaction);
        }
    }, [labels, transactionData, type])

    useEffect(() => {
        if(labels && data) {
            setChartData({
                labels,
                datasets: [{
                    label: 'IDR Spent',
                    data,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: 'start',
                    tension: 0.1
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
                        display: true,
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 12,
                            maxRotation: 0,
                            callback: function(value) {
                                let labelValue = this.getLabelForValue(value);

                                if(type === 'MONTHLY') return new Date(labelValue).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                if(type === 'ANNUAL') return labelValue.slice(0,3);
                                return labelValue;
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => {
                                return nFormatter(value, 0);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }); 
        }
    }, [labels, data])

    if(transactionData && transactionData.length === 0) return (
        <div className="flex justify-center items-center h-48 xs:h-64 px-3 py-4">
            <p className="text-sm md:text-base text-center text-dark dark:text-white">No transaction data found, please create an transaction first.</p>
        </div>
    )
    return(
        <div className="flex flex-col justify-center items-start min-h-48 xs:min-h-64">
            <p className="w-full text-center mt-4 font-semibold text-sm md:text-base">Total: {formatCurrency(totalTransaction)}</p>
            {
                (chartData && chartOptions) ? 
                <Line
                    data={chartData}
                    options={chartOptions}
                /> :
                <div className="w-full h-full px-3 py-4">
                    <div className="w-full h-full rounded-lg bg-neutral-300 dark:bg-neutral-800 animate-pulse"></div>
                </div>
            }
            <div className="w-full px-4 mt-2 pb-4">
                <Button label={"Download Report"} onClick={handleDownloadReport}/>
            </div>
        </div>
    )
}