type Props = {
  src: string;
  payload: string;
};

export default function QRDisplay({ src, payload }: Props) {
  return (
    <div>
      <img
        src={src}
        alt="CarrySync transfer QR"
      />

      <textarea
        aria-label="QR payload"
        readOnly
        value={payload}
      />
    </div>
  );
}