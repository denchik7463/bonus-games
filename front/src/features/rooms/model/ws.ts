"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/src/shared/config/env";
import type { RoomEventDto, RoomWsEventDto, RoomDto } from "@/src/features/rooms/model/types";

type RoomSocketState = {
  roomState: RoomDto | null;
  events: RoomEventDto[];
  connected: boolean;
  error: string | null;
  messageSeq: number;
  lastMessageType: string | null;
  closeCode: number | null;
  closeReason: string | null;
};

export function useRoomSocket(roomId?: string, accessToken?: string | null, enabled = true) {
  const connectionSeqRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const terminalRoomRef = useRef(false);
  const [state, setState] = useState<RoomSocketState>({
    roomState: null,
    events: [],
    connected: false,
    error: null,
    messageSeq: 0,
    lastMessageType: null,
    closeCode: null,
    closeReason: null
  });
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const wsUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return null;
    const token = accessToken;
    if (!token) return null;
    const base = resolveWsBaseUrl();
    const params = new URLSearchParams({ roomId, token });
    return `${base}/ws/rooms?${params.toString()}`;
  }, [accessToken, roomId]);

  useEffect(() => {
    setState({
      roomState: null,
      events: [],
      connected: false,
      error: null,
      messageSeq: 0,
      lastMessageType: null,
      closeCode: null,
      closeReason: null
    });
    terminalRoomRef.current = false;
  }, [roomId, wsUrl]);

  useEffect(() => {
    if (!enabled || !wsUrl || !roomId) return;
    const connectionId = connectionSeqRef.current + 1;
    connectionSeqRef.current = connectionId;
    let socket: WebSocket | null = null;
    let closedByEffect = false;
    let connectTimer = 0;

    connectTimer = window.setTimeout(() => {
      if (closedByEffect || connectionSeqRef.current !== connectionId) return;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (connectionSeqRef.current !== connectionId) return;
        setState((current) => ({ ...current, connected: true, error: null, closeCode: null, closeReason: null }));
      };
      socket.onerror = () => {
        if (connectionSeqRef.current !== connectionId) return;
        setState((current) => ({ ...current, connected: false, error: "Не удалось подключить live-синхронизацию комнаты." }));
      };
      socket.onclose = (event) => {
        if (closedByEffect || connectionSeqRef.current !== connectionId) return;
        setState((current) => ({
          ...current,
          connected: false,
          closeCode: event.code,
          closeReason: event.reason || null,
          error: event.code === 1000 ? current.error : `Live-соединение закрыто (${event.code}). Используем автообновление.`
        }));
        if (terminalRoomRef.current) return;
        if (event.code !== 1000 && event.code !== 1008) {
          reconnectTimerRef.current = window.setTimeout(() => {
            if (!closedByEffect && connectionSeqRef.current === connectionId && enabled) setReconnectNonce((value) => value + 1);
          }, 1200);
        }
      };
      socket.onmessage = (event) => {
        if (connectionSeqRef.current !== connectionId) return;
        try {
          const message = JSON.parse(event.data) as RoomWsEventDto;
          if (message.roomId && message.roomId !== roomId) return;
          if (message.type === "ROOM_STATE" && isRoomStatePayload(message.payload)) {
            const payload = message.payload as Partial<RoomDto>;
            setState((current) => {
              const roomState = {
                ...(current.roomState ?? {}),
                ...payload,
                roomId: payload.roomId ?? message.roomId ?? roomId
              } as RoomDto;
              terminalRoomRef.current = roomState.status === "FINISHED" || roomState.status === "CANCELLED";
              return {
                ...current,
                roomState,
                connected: true,
                error: null,
                messageSeq: current.messageSeq + 1,
                lastMessageType: message.type
              };
            });
          }
          if (message.type === "ROOM_EVENTS" && Array.isArray(message.payload)) {
            setState((current) => ({
              ...current,
              events: message.payload as RoomEventDto[],
              connected: true,
              error: null,
              messageSeq: current.messageSeq + 1,
              lastMessageType: message.type
            }));
          }
        } catch {
          setState((current) => ({
            ...current,
            error: "Live-событие пришло в неизвестном формате."
          }));
        }
      };
    }, 120);

    return () => {
      closedByEffect = true;
      window.clearTimeout(connectTimer);
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close(1000, "room socket cleanup");
    };
  }, [enabled, roomId, wsUrl, reconnectNonce]);

  return state;
}

function resolveWsBaseUrl() {
  if (env.wsBaseUrl) return env.wsBaseUrl.replace(/\/$/, "");
  if (env.apiBaseUrl.startsWith("http")) return env.apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname === "localhost") return "ws://localhost:8081";
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:8081";
  return `${protocol}//${host}`;
}

function isRoomStatePayload(value: unknown): value is RoomDto {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    || typeof record.roomId === "string"
    || typeof record.status === "string"
    || typeof record.currentPlayers === "number"
    || typeof record.maxPlayers === "number"
    || typeof record.remainingSeconds === "number"
    || typeof record.firstPlayerJoinedAt === "string"
    || typeof record.startedAt === "string"
    || typeof record.finishedAt === "string"
    || typeof record.winnerPositionIndex === "number"
    || typeof record.winnerSeatNumber === "number"
    || typeof record.winnerSeat === "number"
    || typeof record.gameResultId === "string"
    || typeof record.roundId === "string"
    || typeof record.resultId === "string";
}
