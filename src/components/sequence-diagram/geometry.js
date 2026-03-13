import {
  LIFELINE_SPACING,
  CANVAS_PADDING_LEFT,
  CANVAS_PADDING_TOP,
  HEAD_HEIGHT,
  MESSAGE_SPACING,
  ACTIVATION_WIDTH,
  HEAD_WIDTH
} from "./constants.js";

export function getLifelineX(index) {
  return CANVAS_PADDING_LEFT + index * LIFELINE_SPACING;
}

export function getMessageY(index) {
  return CANVAS_PADDING_TOP + HEAD_HEIGHT + 40 + index * MESSAGE_SPACING;
}

export function computeActivations(messages, participants) {
  const activations = [];
  const stacks = {};

  for (const p of participants) {
    stacks[p.id] = [];
  }

  const sortedMessages = [...messages].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sortedMessages.length; i++) {
    const msg = sortedMessages[i];
    if (msg.type === "self") continue;

    if (msg.type === "sync") {
      const startY = getMessageY(i);
      // Find the matching return message
      let endY = startY + MESSAGE_SPACING;
      for (let j = i + 1; j < sortedMessages.length; j++) {
        if (sortedMessages[j].type === "return" && sortedMessages[j].from === msg.to) {
          endY = getMessageY(j);
          break;
        }
      }

      const toParticipant = participants.find((p) => p.id === msg.to);
      if (toParticipant) {
        const lifelineIndex = participants.indexOf(toParticipant);
        activations.push({
          participantId: msg.to,
          x: getLifelineX(lifelineIndex) - ACTIVATION_WIDTH / 2,
          y: startY - 5,
          height: endY - startY + 10,
          width: ACTIVATION_WIDTH
        });
      }
    }
  }

  return activations;
}

export function getCanvasHeight(messageCount) {
  const MIN_HEIGHT = 400;
  const contentHeight = CANVAS_PADDING_TOP + HEAD_HEIGHT + 40 + (messageCount + 1) * MESSAGE_SPACING + 80;
  return Math.max(MIN_HEIGHT, contentHeight);
}

export function getCanvasWidth(participantCount) {
  const MIN_WIDTH = 600;
  const contentWidth = CANVAS_PADDING_LEFT * 2 + (participantCount - 1) * LIFELINE_SPACING + HEAD_WIDTH;
  return Math.max(MIN_WIDTH, contentWidth);
}
