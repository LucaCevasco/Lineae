export function serializeERForPrompt(er) {
  const lines = [];

  for (const [name, table] of Object.entries(er.tables)) {
    lines.push(`Table: ${name}`);
    if (table.columns.length > 0) {
      lines.push("  Columns:");
      for (const col of table.columns) {
        let line = `    ${col.name} ${col.dataType}`;
        const flags = [];
        if (col.isPrimaryKey) flags.push("PK");
        if (col.isForeignKey) flags.push("FK");
        if (!col.isNullable) flags.push("NOT NULL");
        if (col.isUnique) flags.push("UNIQUE");
        if (col.defaultValue) flags.push(`DEFAULT ${col.defaultValue}`);
        if (flags.length > 0) line += ` [${flags.join(", ")}]`;
        lines.push(line);
      }
    }
    lines.push("");
  }

  if (er.relationships.length > 0) {
    lines.push("Relationships:");
    for (const rel of er.relationships) {
      lines.push(`  ${rel.sourceTable}.${rel.sourceColumn || "*"} -> ${rel.targetTable}.${rel.targetColumn || "*"} (${rel.type})`);
    }
  }

  return lines.join("\n");
}

export const ER_JSON_FORMAT = `Respond with ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "tables": {
    "<tableName>": {
      "name": "<tableName>",
      "color": "#3b82f6",
      "columns": [
        { "id": "placeholder", "name": "id", "dataType": "INT"|"BIGINT"|"SMALLINT"|"VARCHAR(255)"|"TEXT"|"BOOLEAN"|"DATE"|"DATETIME"|"TIMESTAMP"|"DECIMAL(10,2)"|"FLOAT"|"UUID"|"JSON"|"BLOB", "isPrimaryKey": true, "isForeignKey": false, "isNullable": false, "isUnique": true, "defaultValue": "" }
      ]
    }
  },
  "relationships": [
    { "id": "placeholder", "sourceTable": "<tableName>", "sourceColumn": "columnName", "targetTable": "<tableName>", "targetColumn": "columnName", "type": "one-to-one"|"one-to-many"|"many-to-one"|"many-to-many" }
  ],
  "erLayout": {
    "<tableName>": { "x": 100, "y": 100 }
  }
}

Rules:
- Every table must have at least one column (typically a primary key "id" column).
- The key for each table in "tables" must match its "name" field.
- sourceTable/targetTable in relationships must reference existing table names.
- sourceColumn/targetColumn must reference existing column names in their respective tables.
- Layout positions must be multiples of 20 (snap to grid).
- Use varied colors from: #3b82f6, #8b5cf6, #ec4899, #f97316, #22c55e, #06b6d4, #6366f1, #eab308`;
