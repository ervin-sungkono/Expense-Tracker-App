import Dexie from "dexie";
import { generateBudgets, generateTransactions, getCategories, getShops } from "./seeder";

const DB_NAME = "ExpenseDB";
const DB_VERSION = 2;

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
            transactions: '++id, date, amount, categoryId, shopId, owner, type, remarks',
            expenses: null,
            categories: '++id, name, type, parentId, mutable',
            budgets: '++id, amount, categoryId, start_date, end_date, repeat',
            shops: '++id, name, image, location'
        });
    }

    getAllTransactions() {
        return this.transactions.toArray();
    }

    getPaginatedTransactions(limit, searchText, type, { categoryId, shopId, amountRange, dateRange }) {
        return this.transactions
            .orderBy('date')
            .filter(transaction => {
                if(!transaction.remarks.toLowerCase().includes(searchText)) return false;
                if(categoryId && transaction.categoryId != categoryId) return false;
                if(shopId && transaction.shopId != shopId) return false;
                if(type && transaction.type != type) return false;
                if(!isInAmountRange(transaction.amount, amountRange)) return false;
                if(!isInDateRange(transaction.date, dateRange)) return false;

                return true;
            })
            .reverse()
            .limit(limit)
            .toArray();
    }

    getRecentTransactions(limit) {
        return this.transactions
            .orderBy('date')
            .reverse()
            .limit(limit)
            .toArray();
    }

    getAllCategories() {
        return this.categories.orderBy('name').toArray();
    }

    getParentCategories() {
        return this.categories.orderBy('name').where({ parentId: null }).toArray();
    }

    getChildCategories(categoryId) {
        return this.categories.orderBy('name').where({ parentId: categoryId }).toArray();
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

    getAllBudgets() {
        return this.budgets.toArray();
    }

    getActiveBudget(dateRange) {
        return this.budgets
            .filter(budget => {
                return isInDateRange(budget.start_date, dateRange) && isInDateRange(budget.end_date, dateRange);
            })
            .toArray();
    }

    addTransaction({ date, amount, categoryId, shopId, owner, type, remarks }) {
        return this.transactions.add({ date, amount, categoryId, shopId, owner, type, remarks });
    }

    addCategory({ name, type, parentId }) {
        return this.categories.add({ name, type, parentId });
    }

    addShop({ name, image, location }) {
        return this.shops.add({ name, image, location });
    }

    addBudget({ amount, categoryId, start_date, end_date, repeat }) {
        return this.budgets.add({ amount, categoryId, start_date, end_date, repeat });
    }

    updateTransaction(transactionId, { date, amount, categoryId, shopId, owner, type, remarks }) {
        return this.transactions.update(transactionId, {date, amount, categoryId, shopId, owner, type, remarks});
    }

    updateCategory(categoryId, { name, type, parentId }) {
        return this.transaction('rw', this.categories, () => {
            // In case modifying parentId of category that has a sub category,
            // modify all sub category to have the same parent as the category
            if(parentId) this.categories.where({ parentId: categoryId }).modify({ parentId });
            this.categories.update(categoryId, { name, type, parentId });
        })
    }

    updateShop(shopId, { name, image, location }) {
        return this.shops.update(shopId, {name, image, location});
    }

    updateBudget(budgetId, { amount, categoryId, start_date, end_date, repeat }) {
        return this.budgets.update(budgetId, { amount, categoryId, start_date, end_date, repeat });
    }

    deleteTransaction(transactionId) {
        this.transactions.delete(transactionId);
    }

    deleteCategory(categoryId) {
        return this.transaction('rw', this.transactions, this.categories, () => {
          this.transactions.where({ categoryId }).delete();
          this.budgets.where({ categoryId }).delete();
          this.categories.where({ parentId: categoryId }).delete();
          this.categories.delete(categoryId);
        });
    }

    deleteShop(shopId) {
        return this.transaction('rw', this.transactions, this.shops, () => {
          this.transactions.where({ shopId }).modify({ shopId: null });
          this.shops.delete(shopId);
        });
    }

    deleteBudget(budgetId) {
        return this.budgets.delete(budgetId);
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
    await db.transactions.bulkAdd(generateTransactions(100000));

    await db.categories.bulkAdd(getCategories());

    await db.shops.bulkAdd(getShops());

    await db.budgets.bulkAdd(generateBudgets(500));
}

export const db = new ExpenseDB();

db.on('populate', populate);