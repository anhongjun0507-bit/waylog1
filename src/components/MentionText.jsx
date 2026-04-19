import { tokenizeMentions } from "../utils/mentions.js";
import { cls } from "../utils/ui.js";

// 댓글/본문 텍스트에서 @멘션을 클릭 가능한 버튼으로 렌더
export const MentionText = ({ text, dark, onMentionClick }) => {
  const tokens = tokenizeMentions(text || "");
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
