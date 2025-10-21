import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";

/* Простые типы */
export type MCItem = { id: string; label: string };
export type MCPair = { leftId: string; rightId: string };

export interface MatchColumnsProps {
  left: MCItem[];
  right: MCItem[];
  initialPairs?: MCPair[];
  storageKey?: string;
}

// Стили
const Wrapper = styled.div`
  width: 100%;
  max-width: 900px;
  margin: 12px auto;
  padding: 12px;
  font-family: sans-serif;
`;

const Board = styled.div`
  position: relative;
  background: #fff;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 6px;
  overflow: visible;
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
`;

const Column = styled.div`
  flex: 1;
  min-height: 180px;
  padding: 8px;
`;

const Header = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
`;

const ItemRoot = styled.div<{ disabled?: boolean; active?: boolean }>`
  padding: 8px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: ${(p) => (p.active ? "#e6f7ff" : "#fafafa")};
  border: 1px solid #eee;
  cursor: ${(p) => (p.disabled ? "default" : "pointer")};
  opacity: ${(p) => (p.disabled ? 0.6 : 1)};
  user-select: none;
`;

const Footer = styled.div`
  margin-top: 12px;
  border-top: 1px solid #eee;
  padding-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SmallBtn = styled.button`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #bbb;
  background: #fff;
  cursor: pointer;
`;

const SvgOverlay = styled.svg`
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
  overflow: visible;
`;


type ListItemProps = {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, id: string) => void;
  refCallback?: (el: HTMLDivElement | null) => void;
};

const ListItem = React.memo(function ListItem(props: ListItemProps) {
  return (
    <ItemRoot
      ref={props.refCallback}
      disabled={props.disabled}
      active={props.active}
      onClick={() => props.onClick(props.id)}
      draggable={props.draggable}
      onDragStart={(e) => props.onDragStart && props.onDragStart(e, props.id)}
      onDragOver={(e) => props.onDragOver && props.onDragOver(e)}
      onDrop={(e) => props.onDrop && props.onDrop(e, props.id)}
      title={props.disabled ? "уже сопоставлено" : ""}
    >
      {props.label}
    </ItemRoot>
  );
});

/* Главный компонент */
export default function MatchColumns(props: MatchColumnsProps) {
  const left = props.left || [];
  const right = props.right || [];
  const storageKey = props.storageKey;

  const [pairs, setPairs] = useState<MCPair[]>(() => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw) as MCPair[];
      } catch (error) {
        console.error(error);
      }
    }
    return props.initialPairs ? [...props.initialPairs] : [];
  });

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  // refs для DOM элементов, чтобы рисовать линии
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rightRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // линии между центрами элементов
  type Line = { leftId: string; rightId: string; x1: number; y1: number; x2: number; y2: number };
  const [lines, setLines] = useState<Line[]>([]);

  //мемоизация занятых id
  const leftUsedIds = useMemo(() => pairs.map((p) => p.leftId), [pairs]);
  const rightUsedIds = useMemo(() => pairs.map((p) => p.rightId), [pairs]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pairs));
    } catch (error) {
      console.error(error);
      
    }
  }, [pairs, storageKey]);

  // выбор кликом
  const selectLeft = useCallback(
    (id: string) => {
      if (leftUsedIds.includes(id)) return;
      setSelectedLeft((cur) => (cur === id ? null : id));
    },
    [leftUsedIds],
  );

  const selectRight = useCallback(
    (id: string) => {
      if (rightUsedIds.includes(id)) return;
      setSelectedRight((cur) => (cur === id ? null : id));
    },
    [rightUsedIds],
  );

  // если выбраны оба — добавляем пару
  useEffect(() => {
    if (!selectedLeft || !selectedRight) return;
    setPairs((e) => {
      const exists = e.find((p) => p.leftId === selectedLeft || p.rightId === selectedRight);
      if (exists) return e;
      return [...e, { leftId: selectedLeft, rightId: selectedRight }];
    });
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [selectedLeft, selectedRight]);

  // Drag & Drop 
  const onDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    try {
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
  }, []);

  const onDropToRight = useCallback(
    (e: React.DragEvent, rightId: string) => {
      e.preventDefault();
      const leftId = e.dataTransfer.getData("text/plain");
      if (!leftId) return;
      setPairs((e) => {
        const exists = e.find((p) => p.leftId === leftId || p.rightId === rightId);
        if (exists) return e;
        return [...e, { leftId, rightId }];
      });
    },
    [],
  );

  // удаление
  const removePair = useCallback((idx: number) => {
    setPairs((e) => {
      const copy = e.slice();
      copy.splice(idx, 1);
      return copy;
    });
  }, []);

  const resetAll = useCallback(() => {
    setPairs([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  const exportPairs = useCallback(() => {
    const blob = new Blob([JSON.stringify(pairs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pairs.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [pairs]);
  const makeRefSetter = useCallback((mapRef: React.MutableRefObject<Map<string, HTMLDivElement | null>>, id: string) => {
    return (el: HTMLDivElement | null) => {
      mapRef.current.set(id, el);
    };
  }, []);

  // Вычисление линии
  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    const crect = container.getBoundingClientRect();
    const out: Line[] = [];
    for (const p of pairs) {
      const lEl = leftRefs.current.get(p.leftId);
      const rEl = rightRefs.current.get(p.rightId);
      if (!lEl || !rEl) continue;
      const lrect = lEl.getBoundingClientRect();
      const rrect = rEl.getBoundingClientRect();
      // центр относительно контейнера
      const x1 = lrect.right - crect.left; 
      const y1 = lrect.top + lrect.height / 2 - crect.top;
      const x2 = rrect.left - crect.left; 
      const y2 = rrect.top + rrect.height / 2 - crect.top;
      out.push({ leftId: p.leftId, rightId: p.rightId, x1, y1, x2, y2 });
    }
    return out;
  }, [pairs]);

  // пересчитываем линии при изменении пар
  useLayoutEffect(() => {
    setLines(computeLines());
    const onResize = () => setLines(computeLines());
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [computeLines]);

  //список рендеринга
  return (
    <Wrapper>
      <Board ref={containerRef}>
        <SvgOverlay aria-hidden>
          {lines.map((ln, i) => (
            <g key={`${ln.leftId}-${ln.rightId}-${i}`}>
              <defs />
              <line
                x1={ln.x1}
                y1={ln.y1}
                x2={ln.x2}
                y2={ln.y2}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* маленький кружок посередине */}
              <circle cx={(ln.x1 + ln.x2) / 2} cy={(ln.y1 + ln.y2) / 2} r={3} fill="#0284c7" />
            </g>
          ))}
        </SvgOverlay>

        <Row>
          <Column>
            <Header>Левая</Header>
            {left.map((it) => (
              <ListItem
                key={it.id}
                id={it.id}
                label={it.label}
                disabled={leftUsedIds.includes(it.id)}
                active={selectedLeft === it.id}
                onClick={selectLeft}
                draggable={!leftUsedIds.includes(it.id)}
                onDragStart={onDragStart}
                refCallback={makeRefSetter(leftRefs, it.id)}
              />
            ))}
          </Column>

          <Column>
            <Header>Правая</Header>
            {right.map((it) => (
              <ListItem
                key={it.id}
                id={it.id}
                label={it.label}
                disabled={rightUsedIds.includes(it.id)}
                active={selectedRight === it.id}
                onClick={selectRight}
                onDragOver={onDragOver}
                onDrop={onDropToRight}
                refCallback={makeRefSetter(rightRefs, it.id)}
              />
            ))}
          </Column>
        </Row>
      </Board>

      <Footer>
        <div style={{ minWidth: 200 }}>
          Пар: {pairs.length}
          <div style={{ marginTop: 8 }}>
            {pairs.length === 0 && <div style={{ marginTop: 6 }}>Нет пар</div>}
            {pairs.map((p, idx) => {
              const l = left.find((x) => x.id === p.leftId);
              const r = right.find((x) => x.id === p.rightId);
              return (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <div style={{ fontSize: 13 }}>
                    {l ? l.label : p.leftId} ↔ {r ? r.label : p.rightId}
                  </div>
                  <SmallBtn onClick={() => removePair(idx)}>Удалить</SmallBtn>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SmallBtn onClick={resetAll} style={{ marginRight: 8 }}>
            Сброс
          </SmallBtn>
          <SmallBtn onClick={exportPairs}>Экспорт</SmallBtn>
        </div>
      </Footer>
    </Wrapper>
  );
}