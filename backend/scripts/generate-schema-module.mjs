#!/usr/bin/env node
// Menyalin deploy/mariadb/schema.sql menjadi modul TS agar ikut terbundel di build standalone.
import { readFileSync, writeFileSync } from "node:fs";
const sql = readFileSync(new URL("../deploy/mariadb/schema.sql", import.meta.url), "utf8");
const out = `// File ini dihasilkan otomatis dari deploy/mariadb/schema.sql oleh scripts/generate-schema-module.mjs.\n// Jangan ubah manual; ubah schema.sql lalu jalankan \`yarn schema:generate\`.\nexport const SCHEMA_SQL = ${JSON.stringify(sql)};\n`;
writeFileSync(new URL("../lib/db/schema.generated.ts", import.meta.url), out);
console.log("lib/db/schema.generated.ts diperbarui");
