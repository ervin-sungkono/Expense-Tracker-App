import { db } from "../db";

export const LOCAL_TOOL_NAMES = [
    "xpensed_list_categories",
    "xpensed_list_shops",
    "xpensed_list_transactions",
    "xpensed_get_transaction",
    "xpensed_create_transaction",
    "xpensed_update_transaction",
    "xpensed_delete_transaction",
    "xpensed_create_category",
    "xpensed_update_category",
    "xpensed_delete_category",
    "xpensed_match_shop",
    "xpensed_create_shop",
    "xpensed_update_shop",
    "xpensed_delete_shop"
] as const;

export type LocalToolName = typeof LOCAL_TOOL_NAMES[number];
export type LocalToolDispatchOptions = { execute?: boolean };
export type TransactionType = "Income" | "Expense";

export class LocalToolError extends Error {
    code = "INVALID_INPUT";
}

const MUTATION_TOOLS = new Set<LocalToolName>([
    "xpensed_create_transaction",
    "xpensed_update_transaction",
    "xpensed_delete_transaction",
    "xpensed_create_category",
    "xpensed_update_category",
    "xpensed_delete_category",
    "xpensed_create_shop",
    "xpensed_update_shop",
    "xpensed_delete_shop"
]);

const SUPPORTED_TYPES = new Set<TransactionType>(["Income", "Expense"]);
const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function browserOnly() {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
        throw new LocalToolError("Local assistant tools require browser IndexedDB.");
    }
}

function inputObject(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new LocalToolError("Tool input must be an object.");
    }
    return input as Record<string, unknown>;
}

function read(input: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) if (hasOwn(input, key) && input[key] !== undefined) return input[key];
    return undefined;
}

function requiredId(value: unknown, field: string) {
    if (!Number.isSafeInteger(value) || (value as number) <= 0) {
        throw new LocalToolError(`${field} must be a positive numeric ID.`);
    }
    return value as number;
}

function optionalId(value: unknown, field: string) {
    if (value === undefined || value === null) return null;
    return requiredId(value, field);
}

function requiredText(value: unknown, field: string, maxLength = 120) {
    if (typeof value !== "string" || !value.trim()) {
        throw new LocalToolError(`${field} must be a non-empty string.`);
    }
    const text = value.trim();
    if (text.length > maxLength) throw new LocalToolError(`${field} must be at most ${maxLength} characters.`);
    return text;
}

function optionalText(value: unknown, field: string, nullable = false, maxLength = 120) {
    if (value === undefined || (nullable && value === null)) return value ?? null;
    if (typeof value !== "string") throw new LocalToolError(`${field} must be a string.`);
    const text = value.trim();
    if (text.length > maxLength) throw new LocalToolError(`${field} must be at most ${maxLength} characters.`);
    return text;
}

function transactionType(value: unknown, field = "type") {
    if (!SUPPORTED_TYPES.has(value as TransactionType)) {
        throw new LocalToolError(`${field} must be Income or Expense.`);
    }
    return value as TransactionType;
}

function positiveAmount(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new LocalToolError("amount must be a positive number.");
    }
    return value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function isoDate(value: unknown, field = "date") {
    if (typeof value !== "string" || !ISO_DATE.test(value)) {
        throw new LocalToolError(`${field} must be an ISO date.`);
    }
    const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) throw new LocalToolError(`${field} must be a valid ISO date.`);
    return date;
}

function inclusiveEndDate(value: unknown) {
    const date = isoDate(value, "endDate");
    if (typeof value === "string" && value.length === 10) date.setUTCHours(23, 59, 59, 999);
    return date;
}

function dateText(value: unknown) {
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) throw new LocalToolError("Stored transaction date is invalid.");
    return date.toISOString();
}

function listLimit(value: unknown) {
    if (value === undefined) return 20;
    if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 50) {
        throw new LocalToolError("limit must be an integer from 1 to 50.");
    }
    return value as number;
}

function categoryView(category: any) {
    return { id: category.id, name: category.name, type: category.type, parentId: category.parentId ?? null };
}

function shopView(shop: any) {
    return { id: shop.id, name: shop.name, location: shop.location ?? null };
}

function transactionView(transaction: any, detailed = false) {
    const result: Record<string, unknown> = {
        id: transaction.id,
        date: dateText(transaction.date),
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        shopId: transaction.shopId ?? null
    };
    if (detailed) {
        result.owner = transaction.owner ?? null;
        result.remarks = transaction.remarks ?? "";
    }
    return result;
}

async function categoryById(id: number) {
    const category = await db.getCategoryById(id);
    if (!category || !SUPPORTED_TYPES.has(category.type)) {
        throw new LocalToolError("Category was not found or has an unsupported type.");
    }
    return category;
}

async function shopById(id: number) {
    const shop = await db.shops.get(id);
    if (!shop) throw new LocalToolError("Shop was not found.");
    return shop;
}

async function validateCategoryParent(parentId: number | null, categoryType: TransactionType, selfId?: number) {
    if (parentId === null) return;
    if (parentId === selfId) throw new LocalToolError("A category cannot be its own parent.");
    const parent = await categoryById(parentId);
    if (parent.type !== categoryType) throw new LocalToolError("Parent category type must match category type.");

    const seen = new Set<number>(selfId === undefined ? [] : [selfId]);
    let current: any = parent;
    while (current.parentId !== null && current.parentId !== undefined) {
        if (seen.has(current.parentId)) throw new LocalToolError("Category parent would create a cycle.");
        seen.add(current.parentId);
        current = await categoryById(current.parentId);
    }
}

async function validateTransactionReferences(transaction: any) {
    const category = await categoryById(transaction.categoryId);
    if (category.type !== transaction.type) throw new LocalToolError("Category type must match transaction type.");
    if (transaction.type === "Income" && transaction.shopId !== null && transaction.shopId !== undefined) {
        throw new LocalToolError("Income transactions cannot reference a shop.");
    }
    if (transaction.shopId !== null && transaction.shopId !== undefined) await shopById(transaction.shopId);
    return category;
}

async function transactionInput(input: Record<string, unknown>) {
    const date = isoDate(read(input, "date", "transactionDate", "transaction_date"));
    const amount = positiveAmount(read(input, "amount"));
    const type = transactionType(read(input, "type"));
    const categoryId = requiredId(read(input, "categoryId", "category_id"), "categoryId");
    const shopId = optionalId(read(input, "shopId", "shop_id"), "shopId");
    const owner = optionalText(read(input, "owner"), "owner", true, 120);
    const remarks = optionalText(read(input, "remarks"), "remarks", false, 120) ?? "";
    const transaction = { date, amount, categoryId, shopId, owner, type, remarks };
    await validateTransactionReferences(transaction);
    return transaction;
}

async function transactionPatch(input: Record<string, unknown>, current: any) {
    const patch: Record<string, unknown> = {};
    const date = read(input, "date", "transactionDate", "transaction_date");
    const amount = read(input, "amount");
    const categoryId = read(input, "categoryId", "category_id");
    const shopId = read(input, "shopId", "shop_id");
    const type = read(input, "type");

    if (date !== undefined) patch.date = isoDate(date);
    if (amount !== undefined) patch.amount = positiveAmount(amount);
    if (categoryId !== undefined) patch.categoryId = requiredId(categoryId, "categoryId");
    if (shopId !== undefined) patch.shopId = optionalId(shopId, "shopId");
    if (type !== undefined) patch.type = transactionType(type);
    if (hasOwn(input, "owner")) patch.owner = optionalText(input.owner, "owner", true, 120);
    if (hasOwn(input, "remarks")) patch.remarks = optionalText(input.remarks, "remarks", false, 120) ?? "";
    if (!Object.keys(patch).length) throw new LocalToolError("At least one transaction field is required.");

    const next = { ...current, ...patch };
    await validateTransactionReferences(next);
    return patch;
}

async function categoryInput(input: Record<string, unknown>) {
    const name = requiredText(read(input, "name"), "name", 30);
    const type = transactionType(read(input, "type"));
    const parentId = optionalId(read(input, "parentId", "parent_id"), "parentId");
    await validateCategoryParent(parentId, type);
    const icon = "sky--weather_star.svg";
    const mutable = read(input, "mutable");
    if (mutable !== undefined && typeof mutable !== "boolean") throw new LocalToolError("mutable must be boolean.");
    return { icon, name, type, parentId, mutable: mutable ?? true };
}

async function categoryPatch(input: Record<string, unknown>, current: any) {
    const patch: Record<string, unknown> = {};
    if (hasOwn(input, "name")) patch.name = requiredText(input.name, "name", 30);
    if (hasOwn(input, "type")) patch.type = transactionType(input.type);
    if (hasOwn(input, "parentId") || hasOwn(input, "parent_id")) {
        patch.parentId = optionalId(read(input, "parentId", "parent_id"), "parentId");
    }
    if (!Object.keys(patch).length) throw new LocalToolError("At least one category field is required.");

    const next = { ...current, ...patch };
    await validateCategoryParent(next.parentId ?? null, next.type, current.id);
    const children = await db.getChildCategories(current.id);
    if (children.some((child: any) => child.type !== next.type)) {
        throw new LocalToolError("Category type must remain compatible with child categories.");
    }
    const transactions = await db.getTransactionsByCategory(current.id);
    if (transactions.some((transaction: any) => transaction.type !== next.type)) {
        throw new LocalToolError("Category type must remain compatible with transactions.");
    }
    return patch;
}

async function shopInput(input: Record<string, unknown>) {
    const name = requiredText(read(input, "name"), "name", 30);
    const location = optionalText(read(input, "location"), "location", true, 120);
    return { name, location, image: null };
}

async function shopPatch(input: Record<string, unknown>, current: any) {
    const patch: Record<string, unknown> = {};
    if (hasOwn(input, "name")) patch.name = requiredText(input.name, "name", 30);
    if (hasOwn(input, "location")) patch.location = optionalText(input.location, "location", true, 120);
    if (!Object.keys(patch).length) throw new LocalToolError("At least one shop field is required.");
    return patch;
}

async function categoryDeleteCounts(id: number) {
    const [transactionCount, budgetCount, childCategoryCount] = await Promise.all([
        db.getTransactionCountByCategory(id),
        db.budgets.where({ categoryId: id }).count(),
        db.getChildCategoriesCount(id)
    ]);
    return { transactionCount, budgetCount, childCategoryCount };
}

async function shopTransactionCount(id: number) {
    return db.transactions.where({ shopId: id }).count();
}

async function listCategories(input: Record<string, unknown>) {
    const type = read(input, "type");
    if (type !== undefined) transactionType(type);
    const limit = listLimit(read(input, "limit"));
    const categories = await db.getAllCategories();
    return categories
        .filter((category: any) => SUPPORTED_TYPES.has(category.type) && (type === undefined || category.type === type))
        .slice(0, limit)
        .map(categoryView);
}

async function listShops(input: Record<string, unknown>) {
    const query = read(input, "query", "search");
    if (query !== undefined && typeof query !== "string") throw new LocalToolError("query must be a string.");
    const limit = listLimit(read(input, "limit"));
    const shops = await db.getPaginatedShops(limit, (query as string | undefined)?.trim().toLowerCase() ?? "");
    return shops.map(shopView);
}

async function listTransactions(input: Record<string, unknown>) {
    const limit = listLimit(read(input, "limit"));
    const type = read(input, "type");
    if (type !== undefined) transactionType(type);
    const categoryId = read(input, "categoryId", "category_id");
    const shopId = read(input, "shopId", "shop_id");
    const start = read(input, "startDate", "dateFrom", "date_from");
    const end = read(input, "endDate", "dateTo", "date_to");
    const category = categoryId === undefined ? null : await categoryById(requiredId(categoryId, "categoryId"));
    const shop = shopId === undefined ? null : await shopById(requiredId(shopId, "shopId"));
    const startDate = start === undefined ? null : isoDate(start, "startDate");
    const endDate = end === undefined ? null : inclusiveEndDate(end);
    if (startDate && endDate && startDate > endDate) throw new LocalToolError("startDate must not be after endDate.");

    const rows = await db.getAllTransactions();
    return rows
        .filter((row: any) => {
            if (!SUPPORTED_TYPES.has(row.type)) return false;
            if (type !== undefined && row.type !== type) return false;
            if (category && row.categoryId !== category.id) return false;
            if (shop && row.shopId !== shop.id) return false;
            const date = row.date instanceof Date ? row.date : new Date(row.date);
            if (startDate && date < startDate) return false;
            if (endDate && date > endDate) return false;
            return true;
        })
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id)
        .slice(0, limit)
        .map((row: any) => transactionView(row));
}

async function getTransaction(input: Record<string, unknown>) {
    const id = requiredId(read(input, "id", "transactionId", "transaction_id"), "id");
    const transaction = await db.transactions.get(id);
    if (!transaction) throw new LocalToolError("Transaction was not found.");
    if (!SUPPORTED_TYPES.has(transaction.type)) throw new LocalToolError("Transaction has an unsupported type.");
    return transactionView(transaction, true);
}

async function mutationResult(name: LocalToolName, input: Record<string, unknown>, execute: boolean) {
    if (name === "xpensed_create_transaction") {
        const value = await transactionInput(input);
        if (!execute) return { preview: true, tool: name, operation: "create", data: transactionView({ id: null, ...value }, true) };
        const id = await db.addTransaction(value);
        const transaction = await db.transactions.get(id);
        return { preview: false, tool: name, created: transactionView(transaction, true) };
    }

    if (name === "xpensed_update_transaction") {
        const id = requiredId(read(input, "id", "transactionId", "transaction_id"), "id");
        const current = await db.transactions.get(id);
        if (!current) throw new LocalToolError("Transaction was not found.");
        const patch = await transactionPatch(input, current);
        const next = { ...current, ...patch };
        if (!execute) return { preview: true, tool: name, operation: "update", before: transactionView(current, true), after: transactionView(next, true) };
        await db.updateTransaction(id, next);
        return { preview: false, tool: name, updated: transactionView(await db.transactions.get(id), true) };
    }

    if (name === "xpensed_delete_transaction") {
        const id = requiredId(read(input, "id", "transactionId", "transaction_id"), "id");
        const current = await db.transactions.get(id);
        if (!current) throw new LocalToolError("Transaction was not found.");
        if (!execute) return { preview: true, tool: name, operation: "delete", deleted: transactionView(current, true) };
        await db.deleteTransaction(id);
        return { preview: false, tool: name, deleted: { id } };
    }

    if (name === "xpensed_create_category") {
        const value = await categoryInput(input);
        if (!execute) return { preview: true, tool: name, operation: "create", data: categoryView({ id: null, ...value }) };
        const id = await db.addCategory(value);
        return { preview: false, tool: name, created: categoryView(await db.getCategoryById(id)) };
    }

    if (name === "xpensed_update_category") {
        const id = requiredId(read(input, "id", "categoryId", "category_id"), "id");
        const current = await categoryById(id);
        const patch = await categoryPatch(input, current);
        const next = { ...current, ...patch };
        if (!execute) return { preview: true, tool: name, operation: "update", before: categoryView(current), after: categoryView(next) };
        await db.updateCategory(id, next);
        return { preview: false, tool: name, updated: categoryView(await db.getCategoryById(id)) };
    }

    if (name === "xpensed_delete_category") {
        const id = requiredId(read(input, "id", "categoryId", "category_id"), "id");
        const category = await categoryById(id);
        const counts = await categoryDeleteCounts(id);
        if (!execute) return { preview: true, tool: name, operation: "delete", category: categoryView(category), ...counts };
        await db.deleteCategory(id);
        return { preview: false, tool: name, deleted: { id }, ...counts };
    }

    if (name === "xpensed_create_shop") {
        const value = await shopInput(input);
        if (!execute) return { preview: true, tool: name, operation: "create", data: shopView({ id: null, ...value }) };
        const id = await db.addShop(value);
        return { preview: false, tool: name, created: shopView(await db.shops.get(id)) };
    }

    if (name === "xpensed_update_shop") {
        const id = requiredId(read(input, "id", "shopId", "shop_id"), "id");
        const current = await shopById(id);
        const patch = await shopPatch(input, current);
        const next = { ...current, ...patch };
        if (!execute) return { preview: true, tool: name, operation: "update", before: shopView(current), after: shopView(next) };
        await db.updateShop(id, next);
        return { preview: false, tool: name, updated: shopView(await db.shops.get(id)) };
    }

    if (name === "xpensed_delete_shop") {
        const id = requiredId(read(input, "id", "shopId", "shop_id"), "id");
        const shop = await shopById(id);
        const unlinkedTransactionCount = await shopTransactionCount(id);
        if (!execute) return { preview: true, tool: name, operation: "delete", shop: shopView(shop), unlinkedTransactionCount };
        await db.deleteShop(id);
        return { preview: false, tool: name, deleted: { id }, unlinkedTransactionCount };
    }

    throw new LocalToolError(`Unsupported mutation: ${name}`);
}

async function matchShop(input: Record<string, unknown>) {
    const merchant = requiredText(read(input, "merchant", "name", "query"), "merchant", 120).toLowerCase().replace(/\s+/g, " ");
    const shops = await db.getAllShops();
    const shop = shops
        .filter((value: any) => value.name.trim().toLowerCase().replace(/\s+/g, " ") === merchant)
        .sort((a: any, b: any) => a.id - b.id)[0];
    return { matched: Boolean(shop), shop: shop ? { id: shop.id, name: shop.name } : null, confidence: shop ? 1 : null };
}

export const LOCAL_TOOL_DEFINITIONS = LOCAL_TOOL_NAMES.map(name => ({
    name,
    description: `Browser-local ${name.replaceAll("_", " ")}. Mutations are preview-only until executeLocalTool is called.`,
    inputSchema: { type: "object", additionalProperties: false }
}));

export async function dispatchLocalTool(name: string, input: unknown = {}, options: LocalToolDispatchOptions = {}) {
    browserOnly();
    if (!LOCAL_TOOL_NAMES.includes(name as LocalToolName)) throw new LocalToolError(`Unknown local tool: ${name}`);
    const value = inputObject(input);
    if (MUTATION_TOOLS.has(name as LocalToolName)) return mutationResult(name as LocalToolName, value, options.execute === true);
    if (name === "xpensed_list_categories") return listCategories(value);
    if (name === "xpensed_list_shops") return listShops(value);
    if (name === "xpensed_list_transactions") return listTransactions(value);
    if (name === "xpensed_get_transaction") return getTransaction(value);
    if (name === "xpensed_match_shop") return matchShop(value);
    throw new LocalToolError(`Unsupported local tool: ${name}`);
}

export function previewLocalTool(name: string, input: unknown = {}) {
    return dispatchLocalTool(name, input);
}

export function executeLocalTool(name: string, input: unknown = {}) {
    return dispatchLocalTool(name, input, { execute: true });
}
