import { write } from "bun";

type QueryCondition<T = any> = {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $contains?: string;
  $startsWith?: string;
  $endsWith?: string;
};

type Query<T> = {
  [K in keyof T]?: T[K] | QueryCondition<T[K]>;
};

interface DBOptions {
  autoSave?: boolean;
  prettyPrint?: boolean;
  validation?: (record: any) => boolean;
  /** @default 100 */
  saveDebounceMs?: number;
}

export class Database<T extends Record<string, any>> {
  private data: T[];
  private indexes = new Map<string, Map<any, Set<number>>>();
  private saveTimer?: Timer;
  private pendingWrites = false;

  constructor(
    private path: string,
    private options: Required<DBOptions> = {
      autoSave: true,
      prettyPrint: true,
      validation: () => true,
      saveDebounceMs: 100
    }
  ) {
    this.data = this.loadSync();
  }

  static async initialize<T extends Record<string, any>>(
    filePath: string,
    options?: DBOptions
  ): Promise<Database<T>> {
    const db = new Database<T>(filePath, {
      autoSave: true,
      prettyPrint: true,
      validation: () => true,
      saveDebounceMs: 100,
      ...options
    });
    await db.save(); // Initial save if new file
    return db;
  }

  private loadSync(): T[] {
    try {
      const contents = Bun.readFileSync(this.path, "utf8");
      return contents ? JSON.parse(contents) : [];
    } catch {
      return [];
    }
  }

  private async save(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.pendingWrites = false;
    
    const space = this.options.prettyPrint ? 2 : undefined;
    await write(this.path, JSON.stringify(this.data, null, space));
  }

  private queueSave(): void {
    if (!this.options.autoSave) return;
    this.pendingWrites = true;
    
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      if (this.pendingWrites) this.save().catch(console.error);
    }, this.options.saveDebounceMs);
  }

  private matchesQuery(item: T, query: Query<T>): boolean {
    return Object.entries(query).every(([key, condition]) => {
      const itemValue = item[key];
      
      if (typeof condition !== "object" || condition === null) {
        return itemValue === condition;
      }

      return Object.entries(condition as QueryCondition).every(([operator, value]) => {
        switch (operator) {
          case "$eq": return itemValue === value;
          case "$ne": return itemValue !== value;
          case "$gt": return itemValue > value;
          case "$gte": return itemValue >= value;
          case "$lt": return itemValue < value;
          case "$lte": return itemValue <= value;
          case "$in": return (value as unknown[]).includes(itemValue);
          case "$nin": return !(value as unknown[]).includes(itemValue);
          case "$contains": 
            return typeof itemValue === "string" && itemValue.includes(value as string);
          case "$startsWith":
            return typeof itemValue === "string" && itemValue.startsWith(value as string);
          case "$endsWith":
            return typeof itemValue === "string" && itemValue.endsWith(value as string);
          default: throw new Error(`Unsupported operator: ${operator}`);
        }
      });
    });
  }

  insert(record: Omit<T, "id"> & Partial<Pick<T, "id">>): T {
    if (!this.options.validation(record)) {
      throw new Error("Record validation failed");
    }

    const newRecord = {
      ...record,
      id: record.id ?? crypto.randomUUID()
    } as unknown as T;

    const index = this.data.length;
    this.data.push(newRecord);
    
    // Update indexes
    this.indexes.forEach((indexMap, key) => {
      const value = newRecord[key as keyof T];
      if (value !== undefined) {
        if (!indexMap.has(value)) indexMap.set(value, new Set());
        indexMap.get(value)?.add(index);
      }
    });

    this.queueSave();
    return newRecord;
  }

  find(query?: Query<T>): T[] {
    if (!query) return [...this.data];
    
    // Try to use indexes for simple equality queries
    const simpleQuery = Object.entries(query)
      .filter(([_, value]) => typeof value !== "object")
      .map(([key, value]) => ({ key, value }));

    if (simpleQuery.length === 1) {
      const first = simpleQuery[0];
      if (first && this.indexes.has(first.key)) {
        const indexes = this.indexes.get(first.key)?.get(first.value);
        if (indexes) {
          return Array.from(indexes)
            .map(i => this.data[i])
            .filter((item): item is T => item !== undefined);
        }
      }
    }

    return this.data.filter(item => this.matchesQuery(item, query));
  }

  update(query: Query<T>, changes: Partial<T>): number {
    let modifiedCount = 0;
    const indexesToUpdate: number[] = [];

    this.data.forEach((item, i) => {
      if (this.matchesQuery(item, query)) {
        modifiedCount++;
        this.data[i] = { ...item, ...changes };
        indexesToUpdate.push(i);
      }
    });

    // Update indexes for modified items
    if (modifiedCount > 0) {
      this.indexes.forEach((indexMap, key) => {
        indexesToUpdate.forEach(i => {
          const oldValue = this.data[i][key as keyof T]!;
          const newValue = this.data[i][key as keyof T]!;
          
          indexMap.get(oldValue)?.delete(i);
          if (!indexMap.has(newValue)) indexMap.set(newValue, new Set());
          indexMap.get(newValue)?.add(i);
        });
      });

      this.queueSave();
    }

    return modifiedCount;
  }

  delete(query: Query<T>): number {
    const indexesToDelete = new Set<number>();
    
    this.data.forEach((item, i) => {
      if (this.matchesQuery(item, query)) {
        indexesToDelete.add(i);
      }
    });

    // Remove in reverse order to maintain correct indexes
    const sorted = Array.from(indexesToDelete).sort((a, b) => b - a);
    sorted.forEach(i => this.data.splice(i, 1));

    // Rebuild indexes after deletion
    this.indexes.clear();

    if (sorted.length > 0) {
      this.queueSave();
    }
    
    return sorted.length;
  }
}