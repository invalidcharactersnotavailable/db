# db

`createDB(filePath: string)`
Creates a new empty database file at specified path.

`initDB(filePath: string)`
Initializes connection to existing database file.

`initializeDatabase(filePath: string)`
Combined method that creates if not exists, then initializes.

`add(record: object)`
Inserts a new record. Returns the inserted record.

`find(query: object)`
Returns all records matching the query object.

`modify(query: object, changes: object)`
Updates all matching records with specified changes. Returns number of modified records.

`remove(query: object)`
Deletes all matching records. Returns number of removed records.