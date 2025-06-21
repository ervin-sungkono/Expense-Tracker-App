import { getDebtLoanType, isInDateRange } from "./utils";
import { icons } from "./const/icons";

function getRandomDate(start, end) {
    const startDate = start.getTime();
    const endDate = end.getTime();
    const randomTime = Math.random() * (endDate - startDate) + startDate;
    return new Date(randomTime);
}

function randomBetween(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function generateTransactions(count) {
    const categoryMap = new Map(getCategories().map(category => [String(category.id), category]));
    const shops = getShops();

    const start = new Date(2020, 0, 1); // January 1, 2020
    const end = new Date(); // Current date

    const ownerName = ['Adit', 'Andy', 'Budi', 'Denis', 'Kayla']
    const transactions = [];
    
    for(let i = 0; i < count; i++) {
        const date = getRandomDate(start, end);
        const amount = randomBetween(1000, 50000);
        const categoryId = randomBetween(1, 12);
        const category = categoryMap.get(String(categoryId));
        const expenseType = category.type === 'DebtLoan' ? getDebtLoanType(category.name) : category.type;
        const shopId = category.type === 'Expense' ? (randomBetween(0, shops.length) || null) : null;
        const remarks = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed mollis suscipit congue. Phasellus sit amet nulla vitae lorem semper lobortis. Cras non massa et libero mollis tempus.';
        const owner = category.type === 'DebtLoan' ? ownerName[randomBetween(0, 4)] : null;

        transactions.push({ date, amount, categoryId, shopId, type: expenseType, owner, remarks });
    }

    return transactions;
}

// budgets: '++id, amount, categoryId, start_date, end_date, repeat',
export function generateBudgets(count) {
    const budgets = [];
    const start = new Date(2022, 0, 1); // January 1, 2020
    const end = new Date(); // Current date
    end.setDate(end.getDate() + 90); // 90 days ahead of today's date

    for(let i = 0; i < count; i++) {
        const start_date = getRandomDate(start, end);
        const end_date = getRandomDate(start_date, end);
        start_date.setHours(0);
        start_date.setMinutes(0);
        start_date.setSeconds(0);

        end_date.setHours(23);
        end_date.setMinutes(59);
        end_date.setSeconds(59);

        const amount = randomBetween(100000, 5000000);
        const categoryId = randomBetween(1, 12);
        const repeat = isInDateRange(new Date(), [start_date, end_date]); // only active budgets are set repeatable

        budgets.push({ amount, categoryId, start_date, end_date, repeat });
    }

    return budgets;
}

export function getCategories() {
    const categories = [
        { id: 1, name: "Food", type: "Expense", parentId: null, mutable: true },
        { id: 2, name: "Transportation", type: "Expense", parentId: null, mutable: true },
        { id: 3, name: "Entertainment", type: "Expense", parentId: null, mutable: true },
        { id: 4, name: "Salary", type: "Income", parentId: null, mutable: true },
        { id: 5, name: "Debt", type: "DebtLoan", parentId: null, mutable: false },
        { id: 6, name: "Debt Collection", type: "DebtLoan", parentId: null, mutable: false },
        { id: 7, name: "Loan", type: "DebtLoan", parentId: null, mutable: false },
        { id: 8, name: "Repayment", type: "DebtLoan", parentId: null, mutable: false },
        { id: 9, name: "Beverage", type: "Expense", parentId: 1, mutable: true },
        { id: 10, name: "Snacks", type: "Expense", parentId: 1, mutable: true },
        { id: 11, name: "Bus", type: "Expense", parentId: 2, mutable: true },
        { id: 12, name: "Motorcycle", type: "Expense", parentId: 2, mutable: true }
    ]

    return categories.map(category => ({
        ...category,
        icon: icons[randomBetween(0, icons.length - 1)]
    }))
}

export function getShops() {
    return [
        {
            name: 'Warung Bu Mila',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAXNSR0IArs4c6QAAAHRJREFUGFcBaQCW/wGmFJ//JsvgANZ3pwAUAPUApDSVAAE+QtP/RLFuAPQTfwCAsZUAFrYeAAHqx7b/98ooAKdtswAmUMYAT53pAAE7isL/OunmABeTZQAXjr4A7t4EAAEgOmz/yCmVAAobBwDM9WwAVtTGAByXKxDduUU9AAAAAElFTkSuQmCC',
            location: 'Senayan'
        },
        {
            name: 'Nasi Goreng',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAAXNSR0IArs4c6QAAAHRJREFUGFcBaQCW/wGAukX/v/+qAKvqzwDMvIwAAUu3AAEVl8H/11GbAP+wCwDLXPYAON7UAAFHSif/yj0iANKTRgBrSEkAF7v6AAH+MaD/Rpc+ANzq1gDjQpwAVDBCAAFpzpD/i4rPALzG8QC9Gy4A7xcuAO0HLg3G5ojkAAAAAElFTkSuQmCC',
            location: 'Senayan'
        }
    ]
}