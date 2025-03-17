# BunDB 🚀

A lightweight, high-performance JSON database built with Bun, featuring in-memory operations with disk persistence and advanced querying capabilities.

## Features

- **CRUD Operations**: Create, Read, Update, Delete records
- **Indexed Queries**: Automatic indexing for fast lookups
- **Query Operators**: Supports `$eq`, `$gt`, `$lt`, `$in`, etc.
- **Auto-Save**: Configurable debounced saving to disk
- **Data Validation**: Optional record validation hook
- **Bulk Operations**: Efficient handling of multiple records
- **Type Safety**: Full TypeScript support

## Installation

```bash
bun add bun-db
Quick Start
typescript
Copy
import { Database } from 'bun-db';

// Initialize database
const db = await Database.initialize<User>('users.db', {
  validation: (user) => !!user.name && user.age > 0
});

// Insert records
db.insert({ name: "Alice", age: 28 });
db.insert({ name: "Bob", age: 35 });

// Find records
const adults = db.find({ age: { $gte: 18 } });
const alice = db.find({ name: "Alice" });

// Update records
db.update({ name: "Alice" }, { age: 29 });

// Delete records
db.delete({ age: { $lt: 18 } });
API Documentation
Database.initialize<T>(filePath, options)
Initialize a new or existing database.

Options:

autoSave: Enable automatic saving (default: true)

prettyPrint: Format JSON output (default: true)

validation: Record validation function

saveDebounceMs: Auto-save debounce time (default: 100ms)

insert(record)
Insert a new record. Auto-generates UUID if no ID provided.

find(query?)
Find records matching query. Returns all records if no query provided.

update(query, changes)
Update matching records with specified changes.

delete(query)
Delete all records matching query.

Query Operators
Operator	Description
$eq, $ne	Equal/Not equal
$gt, $gte	Greater than (or equal)
$lt, $lte	Less than (or equal)
$in, $nin	In/Not in array
$contains	String contains
$startsWith	String starts with
$endsWith	String ends with
Performance
In-memory operations with background persistence

Indexed lookups for O(1) access on simple queries

Debounced disk writes to prevent I/O bottlenecks

Limitations
Best for small to medium datasets

Not suitable for high-write workloads

No transaction support (yet!)