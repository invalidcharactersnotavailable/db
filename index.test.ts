import { Database } from './index';
import { describe, test, expect, afterEach } from 'bun:test';

const TEST_DB = 'test.db.json';

interface User {
  id?: string;
  name: string;
  age: number;
  email?: string;
}

afterEach(async () => {
  await Bun.sleep(150); // Ensure save completes
  try { await Bun.rm(TEST_DB); } catch {}
});

describe('Database', () => {
  test('should initialize and create new file', async () => {
    const db = await Database.initialize<User>(TEST_DB);
    expect(db).toBeInstanceOf(Database);
    expect(await Bun.file(TEST_DB).exists()).toBeTrue();
  });

  test('should insert and retrieve records', async () => {
    const db = await Database.initialize<User>(TEST_DB);
    const user = db.insert({ name: 'Alice', age: 30 });
    
    expect(user.id).toBeString();
    expect(user.name).toBe('Alice');
    
    const found = db.find({ name: 'Alice' });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(user.id);
  });

  test('should handle complex queries', async () => {
    const db = await Database.initialize<User>(TEST_DB);
    db.insert({ name: 'Alice', age: 25, email: 'alice@example.com' });
    db.insert({ name: 'Bob', age: 35 });
    db.insert({ name: 'Charlie', age: 40 });

    const results = db.find({
      age: { $gte: 30 },
      name: { $startsWith: 'B' }
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Bob');
  });

  test('should update records', async () => {
    const db = await Database.initialize<User>(TEST_DB);
    db.insert({ name: 'Alice', age: 25 });
    db.insert({ name: 'Alice', age: 30 });

    const updated = db.update({ name: 'Alice' }, { age: 26 });
    expect(updated).toBe(2);

    const users = db.find({ age: 26 });
    expect(users).toHaveLength(2);
  });

  test('should delete records', async () => {
    const db = await Database.initialize<User>(TEST_DB);
    db.insert({ name: 'Alice', age: 25 });
    db.insert({ name: 'Bob', age: 30 });

    const deleted = db.delete({ age: { $lt: 30 } });
    expect(deleted).toBe(1);
    expect(db.find()).toHaveLength(1);
  });

  test('should validate records', async () => {
    const db = await Database.initialize<User>(TEST_DB, {
      validation: (user) => user.age > 0
    });

    expect(() => db.insert({ name: 'Alice', age: -5 }))
      .toThrow('Record validation failed');
  });
});