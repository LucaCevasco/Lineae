export function serializeClassesForPrompt(classes) {
  const lines = [];
  for (const [name, cls] of Object.entries(classes)) {
    const stereo = cls.stereotype && cls.stereotype !== "none" ? cls.stereotype : null;
    lines.push(`Class: ${name}${stereo ? ` (stereotype: ${stereo}` : ""}${cls.isAbstract ? ", abstract: yes" : stereo ? ", abstract: no" : ""}${stereo ? ")" : ""}`);
    if (cls.description) lines.push(`  Description: ${cls.description}`);
    if (cls.attributes.length > 0) {
      lines.push("  Attributes:");
      for (const attr of cls.attributes) {
        let line = `    ${attr.visibility}${attr.name}: ${attr.type}`;
        if (attr.defaultValue) line += ` = ${attr.defaultValue}`;
        if (attr.isStatic) line += " {static}";
        if (attr.isAbstract) line += " {abstract}";
        lines.push(line);
      }
    }
    if (cls.methods.length > 0) {
      lines.push("  Methods:");
      for (const method of cls.methods) {
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
        let line = `    ${method.visibility}${method.name}(${params}): ${method.returnType}`;
        if (method.isStatic) line += " {static}";
        if (method.isAbstract) line += " {abstract}";
        lines.push(line);
      }
    }
    if (cls.relations.length > 0) {
      lines.push("  Relationships:");
      for (const rel of cls.relations) {
        let line = `    ${rel.type} -> ${rel.target}`;
        if (rel.sourceMultiplicity || rel.targetMultiplicity) {
          line += ` [${rel.sourceMultiplicity || ""}..${rel.targetMultiplicity || ""}]`;
        }
        const roles = [];
        if (rel.sourceRole) roles.push(`sourceRole: ${rel.sourceRole}`);
        if (rel.targetRole) roles.push(`targetRole: ${rel.targetRole}`);
        if (roles.length > 0) line += ` (${roles.join(", ")})`;
        lines.push(line);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

export const DIAGRAM_JSON_FORMAT = `Respond with ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "classes": {
    "<ClassName>": {
      "name": "<ClassName>",
      "stereotype": "none"|"entity"|"interface"|"abstract"|"service"|"controller"|"repository",
      "isAbstract": false,
      "description": "...",
      "attributes": [
        { "id": "placeholder", "visibility": "+"|"-"|"#"|"~", "name": "...", "type": "...", "defaultValue": "", "isStatic": false, "isAbstract": false }
      ],
      "methods": [
        { "id": "placeholder", "visibility": "+", "name": "...", "returnType": "void", "parameters": [{ "id": "placeholder", "name": "...", "type": "..." }], "isStatic": false, "isAbstract": false }
      ],
      "relations": [
        { "id": "placeholder", "type": "association"|"aggregation"|"composition"|"inheritance"|"implementation"|"dependency", "target": "<OtherClassName>", "sourceMultiplicity": "1", "targetMultiplicity": "1", "sourceRole": "", "targetRole": "" }
      ]
    }
  },
  "layout": {
    "<ClassName>": { "x": 40, "y": 60 }
  }
}`;
