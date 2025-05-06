import Dexie from "dexie";

const DB_NAME = "ExpenseDB";
const DB_VERSION = 1;

class ExpenseDB extends Dexie {
    constructor() {
        super(DB_NAME);

        this.version(DB_VERSION).stores({
            expenses: '++id, date, amount, categoryId, shopId, remarks',
            categories: '++id, name, budget',
            shops: '++id, name, image, min_price, max_price, location'
        });
    }

    getAllExpenses() {
        return this.expenses.toArray();
    }

    getPaginatedExpenses(pageIndex = 0, pageSize = 10, searchText, chosenCategory) {
        return this.expenses
            .orderBy('date')
            .filter(expense => expense.remarks.toLowerCase().includes(searchText) && (!chosenCategory || expense.categoryId === chosenCategory))
            .reverse()
            .offset(pageIndex * pageSize)
            .limit(pageSize)
            .toArray();
    }

    getRecentExpenses(limit) {
        return this.expenses.orderBy('date').reverse().limit(limit).toArray();
    }

    getAllCategories() {
        return this.categories.toArray();
    }

    getAllShops() {
        return this.shops.toArray();
    }

    addExpense({date, amount, categoryId, shopId, remarks}) {
        return this.expenses.add({ date, amount, categoryId, shopId, remarks });
    }

    addCategory({name}) {
        return this.categories.add({ name });
    }

    addShop({name, image, min_price, max_price, location}) {
        return this.shops.add({ name, image, min_price, max_price, location });
    }

    updateExpense(expenseId, {date, amount, categoryId, shopId}) {
        return this.expenses.update(expenseId, {date, amount, categoryId, shopId});
    }

    updateCategory(categoryId, { name }) {
        return this.categories.update(categoryId, {name});
    }

    updateShop(shopId, {name, image, min_price, max_price, location}) {
        return this.shops.update(shopId, {name, image, min_price, max_price, location});
    }

    deleteExpense(expenseId) {
        this.categories.delete(expenseId);
    }

    deleteCategory(categoryId) {
        return this.transaction('rw', this.expenses, this.categories, () => {
          this.expenses.where({ categoryId }).delete();
          this.categories.delete(categoryId);
        });
    }

    deleteShop(shopId) {
        return this.transaction('rw', this.expenses, this.shops, () => {
          this.expenses.where({ shopId }).modify({ shopId: null });
          this.shops.delete(shopId);
        });
    }
}

function getRandomDate(start, end) {
    const startDate = start.getTime();
    const endDate = end.getTime();
    const randomTime = Math.random() * (endDate - startDate) + startDate;
    return new Date(randomTime);
}

function randomBetween(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateExpenses() {
    const start = new Date(2020, 0, 1); // January 1, 2020
    const end = new Date(); // Current date

    const expenses = [];
    
    for(let i = 0; i < 10000; i++) {
        const date = getRandomDate(start, end).toISOString().split('T')[0];
        const amount = randomBetween(1000, 50000);
        const categoryId = randomBetween(1, 3);
        const shopId = randomBetween(0, 2) || null;
        const remarks = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed mollis suscipit congue. Phasellus sit amet nulla vitae lorem semper lobortis. Cras non massa et libero mollis tempus.';

        expenses.push({ date, amount, categoryId, shopId, remarks });
    }

    return expenses;
}

async function populate() {
    await db.expenses.bulkAdd(generateExpenses())

    await db.categories.bulkAdd([
        { name: "Food", budget: 500000 },
        { name: "Transportation", budget: 800000 },
        { name: "Entertainment", budget: 100000 }
    ]);

    await db.shops.bulkAdd([
        {
            name: 'Warung Bu Mila',
            image: 'https://picsum.photos/seed/picsum/200/300',
            min_price: 20000,
            max_price: 25000,
            location: 'Senayan'
        },
        {
            name: 'Nasi Goreng',
            image: 'https://picsum.photos/seed/picsum/200/300',
            min_price: 20000,
            max_price: 25000,
            location: 'Senayan'
        }
    ])
}

export const db = new ExpenseDB();

db.on('populate', populate);