export function createEmptyColumn() {
  return {
    id: crypto.randomUUID(),
    name: "column",
    dataType: "INT",
    isPrimaryKey: false,
    isForeignKey: false,
    isNullable: true,
    isUnique: false,
    defaultValue: ""
  };
}

export function createEmptyTable(name, color) {
  return {
    name,
    color: color || "#3b82f6",
    columns: [
      {
        id: crypto.randomUUID(),
        name: "id",
        dataType: "INT",
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: true,
        defaultValue: ""
      }
    ]
  };
}

export function createEmptyERRelationship(sourceTable, targetTable) {
  return {
    id: crypto.randomUUID(),
    sourceTable,
    sourceColumn: "",
    targetTable,
    targetColumn: "",
    type: "one-to-many"
  };
}
