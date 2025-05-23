import Dexie from "dexie";

const DB_NAME = "ExpenseDB";
const DB_VERSION = 1;

function isInAmountRange(amount, range) {
    const [min, max] = range;

    if(min && amount < min) return false;
    if(max && amount > max) return false;

    return true
}

function isInDateRange(date, range) {
    const [min, max] = range;

    const currTime = new Date(date).getTime();
    if(min && currTime < new Date(min).getTime()) return false;
    if(max && currTime > new Date(max).getTime()) return false;

    return true
}

class ExpenseDB extends Dexie {
    constructor() {
        super(DB_NAME);

        this.version(DB_VERSION).stores({
            expenses: '++id, date, amount, categoryId, shopId, remarks',
            categories: '++id, name, budget',
            shops: '++id, name, image, location'
        });
    }

    getAllExpenses() {
        return this.expenses.toArray();
    }

    getPaginatedExpenses(limit, searchText, { categoryId, shopId, amountRange, dateRange }) {
        return this.expenses
            .orderBy('date')
            .filter(expense => {
                if(!expense.remarks.toLowerCase().includes(searchText)) return false;
                if(categoryId && expense.categoryId != categoryId) return false;
                if(shopId && expense.shopId != shopId) return false
                if(!isInAmountRange(expense.amount, amountRange)) return false;
                if(!isInDateRange(expense.date, dateRange)) return false;

                return true;
            })
            .reverse()
            .limit(limit)
            .toArray();
    }

    getRecentExpenses(limit) {
        return this.expenses
            .orderBy('date')
            .reverse()
            .limit(limit)
            .toArray();
    }

    getAllCategories() {
        return this.categories.toArray();
    }

    getAllShops() {
        return this.shops.toArray();
    }

    getPaginatedShops(limit, searchText) {
        return this.shops
            .orderBy('name')
            .filter(shop => {
                if(!shop.name.toLowerCase().includes(searchText)) return false;

                return true;
            })
            .limit(limit)
            .toArray();
    }

    addExpense({ date, amount, categoryId, shopId, remarks }) {
        return this.expenses.add({ date, amount, categoryId, shopId, remarks });
    }

    addCategory({ name, budget }) {
        return this.categories.add({ name, budget });
    }

    addShop({ name, image, location }) {
        return this.shops.add({ name, image, location });
    }

    updateExpense(expenseId, { date, amount, categoryId, shopId, remarks }) {
        return this.expenses.update(expenseId, {date, amount, categoryId, shopId, remarks});
    }

    updateCategory(categoryId, { name, budget }) {
        return this.categories.update(categoryId, { name, budget });
    }

    updateShop(shopId, { name, image, location }) {
        return this.shops.update(shopId, {name, image, location});
    }

    deleteExpense(expenseId) {
        this.expenses.delete(expenseId);
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

    async importDB({ file, clearTablesBeforeImport = false, overwriteValues = false, progressCallback }) {
        if(typeof window !== 'undefined') {
            await import('dexie-export-import');
        }

        return this.import(file, { overwriteValues, clearTablesBeforeImport, progressCallback });
    }

    async exportDB({ progressCallback }) {
        if(typeof window !== 'undefined') {
            await import('dexie-export-import');
        }

        return this.export({ progressCallback });
    }

    resetDB() {
        return this.delete({ disableAutoOpen: false });
    }
}

async function populate() {
    await db.categories.bulkAdd([
        { name: "Food", budget: 500000 },
        { name: "Transportation", budget: 800000 },
        { name: "Entertainment", budget: 100000 }
    ]);
}

export const db = new ExpenseDB();

db.on('populate', populate);