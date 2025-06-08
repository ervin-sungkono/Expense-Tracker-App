import Dexie from "dexie";
import { generateBudgets, generateTransactions, getCategories, getShops } from "./seeder";

const DB_NAME = "ExpenseDB";
const DB_VERSION = 2;

function isSameMonth(targetDate){
    const date = new Date();
    const year = date.getFullYear();
    const month =  date.getMonth();

    return new Date(targetDate).getMonth() === month && new Date(targetDate).getFullYear() === year;
}

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
        console.log('CONSTRUCTING DATABASE CLASS');

        this.version(1).stores({
            expenses: '++id, date, amount, categoryId, shopId, remarks',
            categories: '++id, name, budget',
            shops: '++id, name, image, location'
        })

        this.version(DB_VERSION).stores({
            transactions: '++id, date, amount, categoryId, shopId, owner, type, remarks',
            expenses: null,
            categories: '++id, icon, name, type, parentId, mutable',
            budgets: '++id, amount, categoryId, start_date, end_date, repeat',
            shops: '++id, name, image, location'
        }).upgrade(async() => {
            await this.resetDB();
        });

        this.on('populate', () => this.populate());
    }

    async populate() {
        console.log('POPULATING DATA');
        await this.transactions.bulkAdd(generateTransactions(10000));

        await this.categories.bulkAdd(getCategories());

        await this.shops.bulkAdd(getShops());

        await this.budgets.bulkAdd(generateBudgets(500));
    }

    getAllTransactions() {
        return this.transactions.toArray();
    }

    getMonthTransactions() {
        return this.transactions
            .filter(transaction => {
                return isSameMonth(transaction.date)
            })
            .toArray();
    }

    getTransactionsByCategory(categoryId) {
        return this.transactions.where({ categoryId }).toArray();
    }

    getPaginatedTransactions(limit, searchText, { categoryId, shopId, amountRange, dateRange }) {
        return this.transactions
            .orderBy('date')
            .filter(transaction => {
                if(!transaction.remarks.toLowerCase().includes(searchText)) return false;
                if(categoryId && transaction.categoryId != categoryId) return false;
                if(shopId && transaction.shopId != shopId) return false;
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

    getTransactionCountByCategory(categoryId) {
        return this.transactions
            .where({ categoryId })
            .count();
    }

    getAllCategories() {
        return this.categories.orderBy('name').toArray();
    }

    getCategoryById(categoryId) {
        if(!categoryId) return null;
        return this.categories.where({ id: categoryId }).first();
    }

    getParentCategories(type) {
        return this.categories.filter(category => category.parentId === null && category.type === type).toArray();
    }

    getChildCategories(categoryId) {
        return this.categories.where({ parentId: categoryId }).toArray();
    }

    getChildCategoriesCount(categoryId) {
        return this.categories.where({ parentId: categoryId }).count();
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

    addCategory({ icon, name, type, parentId, mutable = true }) {
        return this.categories.add({ icon, name, type, parentId, mutable });
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

    updateCategory(categoryId, { icon, name, type, parentId }) {
        return this.transaction('rw', this.categories, () => {
            // In case modifying parentId of category that has a sub category,
            // modify all sub category to have the same parent as the category
            if(parentId) this.categories.where({ parentId: categoryId }).modify({ parentId });
            this.categories.update(categoryId, { icon, name, type, parentId });
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

    // Keep the sub categories and transactions by merging it with a new prent category
    mergeCategory(categoryId, newParentId) {
         return this.transaction('rw', this.transactions, this.budgets, this.categories, () => {
            if(newParentId) {
                this.transactions.where({ categoryId }).modify({ categoryId: newParentId });
                this.budgets.where({ categoryId }).modify({ categoryId: newParentId });
                this.categories.where({ parentId: categoryId }).modify({ parentId: newParentId });
            }
            this.categories.delete(categoryId);
        })
    }

    // delete the sub categories and transactions along with parent category
    deleteCategory(categoryId) {
        return this.transaction('rw', this.transactions, this.budgets, this.categories, () => {
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

export const db = new ExpenseDB();