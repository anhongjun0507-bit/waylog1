import { Target } from "lucide-react";
import { MISSION_ICONS } from "../constants.js";

// MISSION_ICONS lookup 을 감싸는 presentational 컴포넌트
export const MissionIcon = ({ iconKey, size = 14, className }) => {
  const Icon = MISSION_ICONS[iconKey] || Target;
  return <Icon size={size} className={className}/>;
};
