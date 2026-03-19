export function createEmptyAttribute() {
  return {
    id: crypto.randomUUID(),
    visibility: "+",
    name: "attribute",
    type: "string",
    defaultValue: "",
    isStatic: false,
    isAbstract: false
  };
}

export function createEmptyMethod() {
  return {
    id: crypto.randomUUID(),
    visibility: "+",
    name: "method",
    returnType: "void",
    parameters: [],
    isStatic: false,
    isAbstract: false
  };
}

export function createEmptyParameter() {
  return {
    id: crypto.randomUUID(),
    name: "param",
    type: "string"
  };
}

export function createEmptyRelationship(target) {
  return {
    id: crypto.randomUUID(),
    type: "association",
    target,
    sourceMultiplicity: "1",
    targetMultiplicity: "1",
    sourceRole: "",
    targetRole: "",
    sourceSideOverride: null,
    targetSideOverride: null
  };
}
