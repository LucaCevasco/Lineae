import OpenAI from "openai";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

function serializeClassesForPrompt(classes) {
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

function regenerateIds(diagramData) {
  const data = JSON.parse(JSON.stringify(diagramData));
  for (const cls of Object.values(data.classes)) {
    for (const attr of cls.attributes) {
      attr.id = crypto.randomUUID();
    }
    for (const method of cls.methods) {
      method.id = crypto.randomUUID();
      for (const param of method.parameters) {
        param.id = crypto.randomUUID();
      }
    }
    for (const rel of cls.relations) {
      rel.id = crypto.randomUUID();
    }
  }
  return data;
}

function validateRelations(diagramData) {
  const classNames = Object.keys(diagramData.classes);
  for (const cls of Object.values(diagramData.classes)) {
    cls.relations = cls.relations.filter((rel) => classNames.includes(rel.target));
  }
  return diagramData;
}

const diagramJsonSchema = {
  name: "diagram",
  strict: true,
  schema: {
    type: "object",
    properties: {
      classes: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            name: { type: "string" },
            stereotype: { type: "string", enum: ["none", "entity", "interface", "abstract", "service", "controller", "repository"] },
            isAbstract: { type: "boolean" },
            description: { type: "string" },
            attributes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  visibility: { type: "string", enum: ["+", "-", "#", "~"] },
                  name: { type: "string" },
                  type: { type: "string" },
                  defaultValue: { type: "string" },
                  isStatic: { type: "boolean" },
                  isAbstract: { type: "boolean" },
                },
                required: ["id", "visibility", "name", "type", "defaultValue", "isStatic", "isAbstract"],
                additionalProperties: false,
              },
            },
            methods: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  visibility: { type: "string", enum: ["+", "-", "#", "~"] },
                  name: { type: "string" },
                  returnType: { type: "string" },
                  parameters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        type: { type: "string" },
                      },
                      required: ["id", "name", "type"],
                      additionalProperties: false,
                    },
                  },
                  isStatic: { type: "boolean" },
                  isAbstract: { type: "boolean" },
                },
                required: ["id", "visibility", "name", "returnType", "parameters", "isStatic", "isAbstract"],
                additionalProperties: false,
              },
            },
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["association", "aggregation", "composition", "inheritance", "implementation", "dependency"] },
                  target: { type: "string" },
                  sourceMultiplicity: { type: "string" },
                  targetMultiplicity: { type: "string" },
                  sourceRole: { type: "string" },
                  targetRole: { type: "string" },
                },
                required: ["id", "type", "target", "sourceMultiplicity", "targetMultiplicity", "sourceRole", "targetRole"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "stereotype", "isAbstract", "description", "attributes", "methods", "relations"],
          additionalProperties: false,
        },
      },
      layout: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
          required: ["x", "y"],
          additionalProperties: false,
        },
      },
    },
    required: ["classes", "layout"],
    additionalProperties: false,
  },
};

export async function diagramToJavaCode(classes) {
  const serialized = serializeClassesForPrompt(classes);
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are a Java code generator. Given a UML class diagram description, generate compilable Java code.

Rules:
- Map visibility: + → public, - → private, # → protected, ~ → package-private (no modifier)
- Map stereotypes: "interface" → Java interface, "abstract" → abstract class, others → class
- Map relationships: inheritance → extends, implementation → implements, association/aggregation/composition → fields with appropriate types (use List<T> for * or 1..* multiplicities)
- Include proper imports (java.util.List, java.util.ArrayList, etc.)
- Use role names for field names when available, otherwise use lowercase class name
- Generate constructors, getters, and setters for attributes
- Return ONLY raw Java code, no markdown fences, no explanations
- Put each class in its own section separated by a comment line`,
      },
      {
        role: "user",
        content: `Generate Java code for this UML diagram:\n\n${serialized}`,
      },
    ],
  });
  return response.choices[0].message.content;
}

export async function javaCodeToDiagram(code) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are a UML diagram extractor. Given Java code, extract classes, attributes, methods, parameters, and relationships into a structured diagram format.

Rules:
- Map access modifiers to visibility: public → "+", private → "-", protected → "#", package-private → "~"
- Map class types: interface → stereotype "interface", abstract class → stereotype "abstract" + isAbstract true, regular class → stereotype "entity"
- Extract extends as "inheritance" relation, implements as "implementation" relation
- Extract fields that reference other classes in the diagram as "association" relations
- Use List<T>/Collection<T> fields to infer 1..* multiplicities
- Set defaultValue to empty string "" if no default
- Generate placeholder UUIDs for all id fields (they will be replaced)
- Layout: arrange classes in a 3-column grid, starting at x=40 y=60, with 340px horizontal spacing and 240px vertical spacing. All positions must be multiples of 20 (snap to grid).
- The key for each class in the "classes" object must match the class "name" field exactly.`,
      },
      {
        role: "user",
        content: `Extract a UML diagram from this Java code:\n\n${code}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: diagramJsonSchema,
    },
  });
  const data = JSON.parse(response.choices[0].message.content);
  return validateRelations(regenerateIds(data));
}

const DIAGRAM_UPDATE_MARKER = "[DIAGRAM_UPDATE]";

export async function* chatAboutDiagram(messages, currentState) {
  const serialized = serializeClassesForPrompt(currentState.classes);
  const trimmedMessages = messages.slice(-20);

  const stream = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.4,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are an AI assistant helping with UML diagram design. The user has a UML diagram editor open.

Current diagram state:
${serialized}

You can:
1. Answer questions about the diagram or UML/software design in general
2. Suggest improvements, design patterns, or modifications
3. Modify the diagram when the user asks you to add, remove, or change classes/attributes/methods/relationships

When you want to modify the diagram, explain what you'll change, then end your response with the exact marker ${DIAGRAM_UPDATE_MARKER} on its own line. Only use this marker when you are actually making changes to the diagram.

When NOT modifying the diagram (just answering questions or brainstorming), do NOT include the marker.`,
      },
      ...trimmedMessages,
    ],
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      fullText += delta;
      yield { type: "delta", text: delta };
    }
  }

  const wantsDiagramUpdate = fullText.includes(DIAGRAM_UPDATE_MARKER);
  let diagramUpdate = null;

  if (wantsDiagramUpdate) {
    fullText = fullText.replace(DIAGRAM_UPDATE_MARKER, "").trimEnd();

    const updateResponse = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a UML diagram editor. Based on the conversation, produce the updated diagram state as structured JSON.

Current diagram state (for reference):
${JSON.stringify({ classes: currentState.classes, layout: currentState.layout }, null, 2)}

Rules:
- Preserve existing classes/attributes/methods unless the user asked to change them
- Generate placeholder UUIDs for all new id fields (they will be replaced)
- Layout: keep existing positions for unchanged classes, place new classes in available grid positions (340px H, 240px V spacing from x=40 y=60, snap to 20)
- The key for each class in "classes" must match its "name" field`,
        },
        ...trimmedMessages,
        { role: "assistant", content: fullText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: diagramJsonSchema,
      },
    });

    diagramUpdate = JSON.parse(updateResponse.choices[0].message.content);
    diagramUpdate = validateRelations(regenerateIds(diagramUpdate));
  }

  yield { type: "result", text: fullText, diagramUpdate };
}

export function isApiKeyConfigured() {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}
