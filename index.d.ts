declare module "bun-db" {
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
        /** @default true */
        autoSave?: boolean;
        /** @default true */
        prettyPrint?: boolean;
        /** Record validation function */
        validation?: (record: unknown) => boolean;
        /** @default 100 */
        saveDebounceMs?: number;
    }

    class Database<T extends Record<string, any>> {
        constructor(
            path: string,
            options?: DBOptions
        );

        static initialize<T extends Record<string, any>>(
            filePath: string,
            options?: DBOptions
        ): Promise<Database<T>>;

        insert(record: Omit<T, "id"> & Partial<Pick<T, "id">>): T;
        find(query?: Query<T>): T[];
        update(query: Query<T>, changes: Partial<T>): number;
        delete(query: Query<T>): number;
    }

    export { Database, DBOptions, Query, QueryCondition };
}