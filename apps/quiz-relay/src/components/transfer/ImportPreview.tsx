type Props = {
  title: string;
  question: string;
  options: string[];
};

export default function ImportPreview({
  title,
  question,
  options,
}: Props) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{question}</p>
      {options.map((option, i) => (
        <p key={i}>{option}</p>
      ))}
    </div>
  );
}