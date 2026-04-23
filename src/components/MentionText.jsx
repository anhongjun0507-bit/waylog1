import { memo, useMemo } from "react";
import { tokenizeMentions } from "../utils/mentions.js";
import { cls } from "../utils/ui.js";

// 댓글/본문 텍스트에서 @멘션을 클릭 가능한 버튼으로 렌더
const MentionTextBase = ({ text, dark, onMentionClick }) => {
  const tokens = useMemo(() => tokenizeMentions(text || ""), [text]);
  if (!Array.isArray(tokens)) return <span>{text}</span>;
  return (
    <>
      {tokens.map((t, i) => t.type === "mention" ? (
        <button key={i} type="button"
          onClick={() => onMentionClick && onMentionClick(t.name)}
          className={cls("font-bold active:opacity-60", dark ? "text-brand-300" : "text-brand-600")}>
          @{t.name}
        </button>
      ) : (
        <span key={i}>{t.text}</span>
      ))}
    </>
  );
};

// memo: DetailScreen 리렌더 시 댓글 텍스트가 같으면 재렌더 스킵 — tokenizeMentions
// 재실행 비용 제거. onMentionClick 은 호출측에서 useCallback 로 안정화 필요.
export const MentionText = memo(MentionTextBase);
