# Database Schema Configuration

This document explains how the dynamic database schema configuration is set up and how to switch schemas easily.

## Overview

The application utilizes a centralized configuration module (`src/config/database.js`) to dynamically inject the target database schema for all queries. This replaces any hardcoded schema references (e.g., `rptas`), allowing you to deploy the application against different schemas without modifying the codebase.

## How to Switch Schemas

To change the target database schema, you simply need to update the environment variables. 

### 1. Update the `.env` file
Set the `DB_SCHEMA` environment variable to your desired schema name:
```env
DB_SCHEMA=your_custom_schema_name
```

### 2. Update the Prisma Database URL
Make sure your Prisma connection URL (`SUPABASE_DB_URL`) also targets the same schema via the `schema` parameter:
```env
SUPABASE_DB_URL="postgresql://user:password@host:port/dbname?schema=your_custom_schema_name&search_path=your_custom_schema_name,public"
```

## How it works internally

1. **Centralized Config (`src/config/database.js`)**: Reads `process.env.DB_SCHEMA` and applies regex validation to prevent SQL injection vulnerabilities. If the environment variable is not provided, it defaults to `rptas`.
2. **Raw SQL Execution**: All instances of `prisma.$queryRawUnsafe` and `prisma.$executeRawUnsafe` dynamically interpolate the schema name using template literals:
   ```javascript
   const { DB_SCHEMA } = require('../config/database');
   
   const query = `SELECT * FROM ${DB_SCHEMA}.rpt_property`;
   await prisma.$queryRawUnsafe(query);
   ```
3. **Database Setup Scripts**: Scripts like `startup.js` dynamically replace the `__DB_SCHEMA__` placeholder in the setup `.sql` files (`reporting_setup.sql`, `rptas_schema.sql`, `supabase_migration.sql`) before execution.

## Testing

An integration test is provided at `src/tests/schema.integration.test.js` to verify that the configured schema can successfully run without interpolation syntax errors. You can run the tests using:
```bash
npm test
```
