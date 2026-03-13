import OpenAI from "openai";
import { serializeClassesForPrompt, DIAGRAM_JSON_FORMAT } from "./classPrompts.js";
import { serializeSequenceForPrompt, SEQUENCE_JSON_FORMAT } from "./sequencePrompts.js";

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

function regenerateSequenceIds(data) {
  const result = JSON.parse(JSON.stringify(data));
  const idMap = {};

  for (const p of result.participants) {
    const newId = crypto.randomUUID();
    idMap[p.id] = newId;
    p.id = newId;
  }

  for (const m of result.messages) {
    m.id = crypto.randomUUID();
    if (idMap[m.from]) m.from = idMap[m.from];
    if (idMap[m.to]) m.to = idMap[m.to];
  }

  return result;
}

function validateRelations(diagramData) {
  const classNames = Object.keys(diagramData.classes);
  for (const cls of Object.values(diagramData.classes)) {
    cls.relations = cls.relations.filter((rel) => classNames.includes(rel.target));
  }
  return diagramData;
}

function validateSequence(data) {
  const participantIds = new Set(data.participants.map((p) => p.id));
  data.messages = data.messages.filter(
    (m) => participantIds.has(m.from) && participantIds.has(m.to)
  );
  return data;
}

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
- The key for each class in the "classes" object must match the class "name" field exactly.

${DIAGRAM_JSON_FORMAT}`,
      },
      {
        role: "user",
        content: `Extract a UML diagram from this Java code:\n\n${code}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  const data = JSON.parse(response.choices[0].message.content);
  return validateRelations(regenerateIds(data));
}

const DIAGRAM_UPDATE_MARKER = "[DIAGRAM_UPDATE]";

export async function* chatAboutDiagram(messages, currentState, activeTab) {
  const isSequence = activeTab === "sequence";

  const serialized = isSequence
    ? serializeSequenceForPrompt(currentState.sequence)
    : serializeClassesForPrompt(currentState.classes);

  const diagramType = isSequence ? "sequence" : "class";

  const systemPrompt = isSequence
    ? `You are an AI assistant helping with UML sequence diagram design. The user has a sequence diagram editor open.

Current sequence diagram state:
${serialized}

You can:
1. Answer questions about the diagram or UML/software design in general
2. Suggest improvements or modifications to the sequence flow
3. Modify the diagram when the user asks you to add, remove, or change participants/messages

Important: Every sequence diagram must have at least 2 participants and 1 message.

When you want to modify the diagram, explain what you'll change, then end your response with the exact marker ${DIAGRAM_UPDATE_MARKER} on its own line. Only use this marker when you are actually making changes to the diagram.

When NOT modifying the diagram (just answering questions or brainstorming), do NOT include the marker.`
    : `You are an AI assistant helping with UML diagram design. The user has a UML diagram editor open.

Current diagram state:
${serialized}

You can:
1. Answer questions about the diagram or UML/software design in general
2. Suggest improvements, design patterns, or modifications
3. Modify the diagram when the user asks you to add, remove, or change classes/attributes/methods/relationships

Important: Every class must have at least one attribute. Never create empty classes with no attributes.

When you want to modify the diagram, explain what you'll change, then end your response with the exact marker ${DIAGRAM_UPDATE_MARKER} on its own line. Only use this marker when you are actually making changes to the diagram.

When NOT modifying the diagram (just answering questions or brainstorming), do NOT include the marker.`;

  const trimmedMessages = messages.slice(-20);

  const stream = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.4,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
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

    const updateSystemPrompt = isSequence
      ? `You are a UML sequence diagram editor. Based on the conversation, produce the updated sequence diagram state as structured JSON.

Current sequence diagram state (for reference):
${JSON.stringify(currentState.sequence, null, 2)}

Rules:
- Preserve existing participants/messages unless the user asked to change them
- Generate placeholder UUIDs for all new id fields (they will be replaced)
- The "from" and "to" fields in messages must reference participant "id" values from the participants array
- Keep existing IDs for unchanged elements so references stay valid

${SEQUENCE_JSON_FORMAT}`
      : `You are a UML diagram editor. Based on the conversation, produce the updated diagram state as structured JSON.

Current diagram state (for reference):
${JSON.stringify({ classes: currentState.classes, layout: currentState.layout }, null, 2)}

Rules:
- Preserve existing classes/attributes/methods unless the user asked to change them
- Generate placeholder UUIDs for all new id fields (they will be replaced)
- Layout: keep existing positions for unchanged classes, place new classes in available grid positions (340px H, 240px V spacing from x=40 y=60, snap to 20)
- The key for each class in "classes" must match its "name" field
- Every class must have at least one attribute — never produce a class with an empty attributes array

${DIAGRAM_JSON_FORMAT}`;

    const updateResponse = await client.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        { role: "system", content: updateSystemPrompt },
        ...trimmedMessages,
        { role: "assistant", content: fullText },
      ],
      response_format: { type: "json_object" },
    });

    const rawUpdate = JSON.parse(updateResponse.choices[0].message.content);

    if (isSequence) {
      diagramUpdate = validateSequence(regenerateSequenceIds(rawUpdate));
    } else {
      diagramUpdate = validateRelations(regenerateIds(rawUpdate));
    }
  }

  yield { type: "result", text: fullText, diagramUpdate, diagramType };
}

export function isApiKeyConfigured() {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}
