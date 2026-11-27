type Props = {
  payload: string;
};

export default function ResponseExport({ payload }: Props) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(payload)}
    >
      Copy response
    </button>
  );
}
