// 챌린지 관련 계산 유틸
import { CHALLENGE_WEEKS, CHALLENGE_DAYS } from "../constants.js";

// Mifflin-St Jeor 기초대사량 추정
export const calcBMR = (weight, height, age, gender) => {
  if (gender === "male") return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
};

// 목표별 일일 칼로리
export const calcTargetCalories = (bmr, goal) => {
  if (goal === "lose") return Math.round(bmr * 1.3 - 500);
  if (goal === "muscle") return Math.round(bmr * 1.5 + 200);
  return Math.round(bmr * 1.4);
};

// 챌린지 시작일로부터 현재 몇일차 (1~CHALLENGE_DAYS 범위)
export const getChallengeDay = (startDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return Math.max(1, Math.min(CHALLENGE_DAYS, Math.floor((now - start) / 86400000) + 1));
};

// 현재 주차 (1~CHALLENGE_WEEKS)
export const getChallengeWeek = (dayNum) => Math.min(CHALLENGE_WEEKS, Math.ceil(dayNum / 7));
