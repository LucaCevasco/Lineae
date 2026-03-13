export function ActivationBox({ activation }) {
  return (
    <rect
      x={activation.x}
      y={activation.y}
      width={activation.width}
      height={activation.height}
      rx={3}
      className="fill-blue-50 stroke-blue-400"
      strokeWidth={1.5}
    />
  );
}
