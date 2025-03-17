import { Database, DBOptions } from "./index";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { unlinkSync } from "fs";

interface User {
    id: string;
    name: string;
    age: number;
    email: string;
    active?: boolean;
}

let testDb: Database<User>;
let testFilePath: string;

beforeEach(() => {
    testFilePath = `testdb-${Date.now()}.json`;
    testDb = new Database<User>(testFilePath, {
        autoSave: false,
        validation: (record) => !!record.name && record.age > 0
    });
});

afterEach(() => {
    try {
        unlinkSync(testFilePath);
    } catch {}
});

test("should insert and retrieve basic record", () => {
    const user = testDb.insert({ 
        name: "Alice", 
        age: 30, 
        email: "alice@example.com" 
    });
    
    expect(user.id).toBeString();
    expect(user.name).toBe("Alice");
    
    const results = testDb.find();
    expect(results).toHaveLength(1);
    expect(results[0].email).toBe("alice@example.com");
});

test("should auto-generate UUID when id not provided", () => {
    const user = testDb.insert({
        name: "Bob",
        age: 25,
        email: "bob@example.com"
    });
    
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
});

test("should enforce validation rules", () => {
    expect(() => {
        testDb.insert({
            name: "",
            age: 30,
            email: "invalid@example.com"
        });
    }).toThrow("Record validation failed");
});

test("should find records with query operators", async () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    testDb.insert({ name: "Bob", age: 25, email: "bob@work.com" });
    testDb.insert({ name: "Charlie", age: 35, email: "charlie@home.org" });

    // Equality check
    const alice = testDb.find({ name: "Alice" });
    expect(alice).toHaveLength(1);

    // Greater than
    const over30 = testDb.find({ age: { $gt: 30 } });
    expect(over30).toHaveLength(1);
    expect(over30[0].name).toBe("Charlie");

    // Array contains
    const emails = testDb.find({ email: { $in: ["alice@example.com", "charlie@home.org"] } });
    expect(emails).toHaveLength(2);

    // String operators
    const workEmails = testDb.find({ email: { $endsWith: "@work.com" } });
    expect(workEmails).toHaveLength(1);
    expect(workEmails[0].name).toBe("Bob");
});

test("should update records matching query", () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    testDb.insert({ name: "Bob", age: 25, email: "bob@example.com" });

    const updated = testDb.update(
        { age: { $gte: 30 } },
        { active: true }
    );
    
    expect(updated).toBe(1);
    
    const activeUsers = testDb.find({ active: true });
    expect(activeUsers).toHaveLength(1);
    expect(activeUsers[0].name).toBe("Alice");
});

test("should delete records matching query", () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    testDb.insert({ name: "Bob", age: 25, email: "bob@example.com" });

    const deleted = testDb.delete({ age: { $lt: 30 } });
    expect(deleted).toBe(1);
    
    const remaining = testDb.find();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Alice");
});

test("should persist data automatically when autoSave enabled", async () => {
    const db = new Database<User>(testFilePath, { autoSave: true });
    db.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const newDb = new Database<User>(testFilePath);
    const users = newDb.find();
    expect(users).toHaveLength(1);
});

test("should handle complex queries", () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com", active: true });
    testDb.insert({ name: "Bob", age: 25, email: "bob@example.com", active: false });
    testDb.insert({ name: "Charlie", age: 35, email: "charlie@example.com", active: true });

    const results = testDb.find({
        age: { $gte: 30, $lte: 40 },
        active: true,
        email: { $contains: "example" }
    });
    
    expect(results).toHaveLength(2);
    expect(results.map(u => u.name)).toEqual(["Alice", "Charlie"]);
});

test("should handle large datasets efficiently", () => {
    // Insert 1000 records
    for (let i = 0; i < 1000; i++) {
        testDb.insert({
            name: `User${i}`,
            age: i % 100,
            email: `user${i}@test.com`
        });
    }

    const results = testDb.find({
        age: { $gt: 90 },
        name: { $startsWith: "User9" }
    });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(u => u.age > 90)).toBeTrue();
});

test("should maintain indexes after updates", () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    testDb.insert({ name: "Bob", age: 25, email: "bob@example.com" });

    testDb.update({ name: "Alice" }, { age: 31 });
    
    const updated = testDb.find({ age: 31 });
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Alice");
});

test("should throw on invalid query operators", () => {
    testDb.insert({ name: "Alice", age: 30, email: "alice@example.com" });
    
    expect(() => {
        // @ts-expect-error Test invalid operator
        testDb.find({ age: { $invalid: 30 } });
    }).toThrow("Unsupported operator");
});