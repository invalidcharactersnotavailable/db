import { file, write } from "bun";

type DBInstance = {
    path: string;
    data: Array<Record<string, any>>;
};

let dbInstance: DBInstance | null = null;

function matchesQuery(obj: Record<string, any>, query: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(query)) {
        if (obj[key] !== value) return false;
    }
    return true;
};

export async function createDB(filePath: string): Promise<void> {
    const initialData: Array<Record<string, any>> = [];
    try {
        const existingFile = file(filePath);
        const contents = await existingFile.text();
        dbInstance = { path: filePath, data: contents ? JSON.parse(contents) : initialData };
    } catch {
        await write(filePath, JSON.stringify(initialData, null, 2));
        dbInstance = { path: filePath, data: initialData };
    };
};

async function save(): Promise<void> {
    if (!dbInstance) throw new Error("Database not initialized");
    await write(dbInstance.path, JSON.stringify(dbInstance.data, null, 2));
};

export async function add(record: Record<string, any>): Promise<Record<string, any>> {
    if (!dbInstance) throw new Error("Database not initialized");
    dbInstance.data.push(record);
    await save();
    return record;
};

export async function find(query: Record<string, any>): Promise<Array<Record<string, any>>> {
    if (!dbInstance) throw new Error("Database not initialized");
    return dbInstance.data.filter((item) => matchesQuery(item, query));
};

export async function modify(query: Record<string, any>, changes: Record<string, any>): Promise<number> {
    if (!dbInstance) throw new Error("Database not initialized");
    let modifiedCount = 0;

    dbInstance.data = dbInstance.data.map((item) => {
        if (matchesQuery(item, query)) {
            modifiedCount++;
            return { ...item, ...changes };
        };
        return item;
    });

    if (modifiedCount === 0) throw new Error("No records matched query");
    await save();
    return modifiedCount;
};

export async function remove(query: Record<string, any>): Promise<number> {
    if (!dbInstance) throw new Error("Database not initialized");
    const originalLength = dbInstance.data.length;
    dbInstance.data = dbInstance.data.filter((item) => !matchesQuery(item, query));
    await save();
    return originalLength - dbInstance.data.length;
};
