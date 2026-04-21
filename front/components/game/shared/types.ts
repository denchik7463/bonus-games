import { GameMode, Participant, WinningCombination } from "@/lib/domain/types";

export type SceneProps = {
  roundId: string;
  mode: GameMode;
  participants: Participant[];
  winnerId: string;
  combination: WinningCombination;
};

export type Payload = SceneProps & { signature: string };
export type Point = { x: number; y: number };
export type ClawBall = Point & { r: number; color: string; participant: Participant; index: number };
