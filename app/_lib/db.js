import Dexie from "dexie";

const DB_NAME = "ExpenseDB";
const DB_VERSION = 1;

class ExpenseDB extends Dexie {
    constructor() {
        super(DB_NAME);

        this.version(DB_VERSION).stores({
            expenses: '++id, date, amount, categoryId, shopId',
            categories: '++id, name',
            shops: '++id, name, image, min_price, max_price, location'
        });
    }

    getAllExpenses() {
        return this.expenses.toArray();
    }

    getAllCategories() {
        return this.categories.toArray();
    }

    getAllShops() {
        return this.shops.toArray();
    }

    addExpense({date, amount, categoryId, shopId}) {
        return this.expenses.add({ date, amount, categoryId, shopId });
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

async function populate() {
    await db.categories.bulkAdd([
        { name: "Food" },
        { name: "Transportation" },
        { name: "Entertainment" }
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