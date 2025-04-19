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
    ])
}

export const db = new ExpenseDB();

db.on('populate', populate);