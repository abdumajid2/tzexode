import MatchColumns from "./components/MatchColumns";

const left = [
  { id: "l1", label: "Apple" },
  { id: "l2", label: "Banana" },
  { id: "l3", label: "Orange" },
];
const right = [
  { id: "r1", label: "Яблоко" },
  { id: "r2", label: "Банан" },
  { id: "r3", label: "Апельсин" },
];

export default function App() {
  return <MatchColumns left={left} right={right} />;
}
